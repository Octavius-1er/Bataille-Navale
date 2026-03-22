// src/pages/LearnPage.jsx
// Mode classe projeté — utilise le jeu sélectionné dans LearnGamesPage
// La carte montre : ligne + colonne + contenu de la case
// Le prof valide oralement, puis le tir part ou le tour est perdu

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { DEFAULT_GAME } from '../lib/defaultGame'
import { SEA_THEMES, SHIP_SKINS } from '../lib/shopData'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  LEARN_SHIPS_CONFIG,
  createEmptyBoard, getShipCells, isValidPlacement,
  placeShipsRandomly, boardFromShips, processShot,
  aiPickCell, allSunk,
} from '../lib/gameEngine'

// ── Load active game from sessionStorage ─────────────────────────
function loadGame() {
  try {
    const raw = sessionStorage.getItem('learnGame')
    if (!raw) return DEFAULT_GAME
    const game = JSON.parse(raw)
    // If cells is a flat array (from Firestore), rebuild 2D array
    if (Array.isArray(game.cells) && game.cells.length > 0 && typeof game.cells[0] === 'object' && 'r' in game.cells[0]) {
      const nr = game.numRows || game.rows.length
      const nc = game.numCols || game.cols.length
      const cells2d = Array.from({ length: nr }, (_, r) =>
        Array.from({ length: nc }, (_, c) => {
          const flat = game.cells.find(cell => cell.r === r && cell.c === c)
          if (!flat) return { prompt: '', answers: { positive:'', negative:'', interrogative:'' } }
          return {
            prompt: flat.prompt || '',
            answers: {
              positive:      flat.positive      || '',
              negative:      flat.negative      || '',
              interrogative: flat.interrogative || '',
            }
          }
        })
      )
      return { ...game, cells: cells2d }
    }
    return game
  } catch {}
  return DEFAULT_GAME
}

// Fixed form rotation per cell so the deck is always the same
const FORM_CYCLE = ['positive', 'negative', 'interrogative']

// For the DEFAULT English game: build answers from preterit table
// For custom games: show the cell content as the "prompt", no complex conjugation
function buildChallengeCard(game, r, c) {
  const row     = game.rows[r]
  const col     = game.cols[c]
  const rawCell = game.cells[r]?.[c]
  // rawCell can be a string (old format) or {prompt, answers} object (new format)
  const prompt  = rawCell && typeof rawCell === 'object' ? (rawCell.prompt || '') : (rawCell || '')
  const answers = rawCell && typeof rawCell === 'object' ? rawCell.answers : null
  const form    = FORM_CYCLE[(r * game.cols.length + c) % 3]

  // If the cell already has pre-built answers, use them directly
  if (answers && answers[form]) {
    return { row, col, prompt, form, answer: answers[form], formLabel: form }
  }

  // Default English game — build preterit forms on the fly
  if (game.isDefault && game.preterit) {
    const past  = game.preterit[col] || col.toLowerCase()
    const comp  = prompt.toLowerCase()
    const pronL = row.toLowerCase()
    const verbL = col.toLowerCase()
    const built = {
      positive:      `${row} ${past} ${comp}.`,
      negative:      `${row} didn't ${verbL} ${comp}.`,
      interrogative: `Did ${pronL} ${verbL} ${comp}?`,
    }
    return { row, col, prompt, form, answer: built[form], formLabel: form }
  }

  // Custom game without pre-built answers — teacher validates orally
  return { row, col, prompt, form: null, answer: null, formLabel: null }
}

// ── Ship styles ───────────────────────────────────────────────────
const SHIP_STYLES = {
  carrier:    { bg:'#0e2a4a', border:'#3377bb', label:'✈', color:'#66aaee' },
  battleship: { bg:'#20103a', border:'#7744bb', label:'⚔', color:'#aa77ee' },
  cruiser:    { bg:'#0e3a28', border:'#339966', label:'⛴', color:'#55cc88' },
  submarine:  { bg:'#0a2e1e', border:'#228855', label:'◈', color:'#44bb77' },
  destroyer:  { bg:'#3a1a08', border:'#aa5522', label:'⚡', color:'#ee8844' },
  patrol:     { bg:'#2a1a3a', border:'#884488', label:'🔹', color:'#cc88cc' },
}

function buildShipMap(ships) {
  const map = {}
  ships.forEach(s => s.cells?.forEach(({ r, c }) => { map[`${r},${c}`] = s.id }))
  return map
}

// ── Grid — dynamic size, verb/pronoun labels ──────────────────────
function LearnGrid({ board, game, shipMap = {}, onCellClick, onCellHover, onCellLeave, interactive = false, hideShips = false, theme = null, shipSkin = null }) {
  const NR = game.rows.length
  const NC = game.cols.length
  const W  = typeof window !== 'undefined' ? window.innerWidth  : 900
  const H  = typeof window !== 'undefined' ? window.innerHeight : 700
  const labelW = 88
  const cellW  = Math.max(60, Math.min(110, Math.floor((W - labelW - 80) / NC)))
  const cellH  = Math.max(48, Math.min(80,  Math.floor((H - 320)         / NR)))

  return (
    <div style={{ userSelect:'none', overflowX:'auto' }}>
      {/* Column headers */}
      <div style={{ display:'flex', marginLeft: labelW + 2 }}>
        {game.cols.map((v, c) => (
          <div key={c} style={{ width:cellW, textAlign:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:13, letterSpacing:1, color:'#55cc88', lineHeight:'26px', flexShrink:0 }}>{v}</div>
        ))}
      </div>
      {/* Rows */}
      {game.rows.map((rowLabel, r) => (
        <div key={r} style={{ display:'flex', alignItems:'center' }}>
          <div style={{ width:labelW, textAlign:'right', paddingRight:8, fontFamily:'Bebas Neue,sans-serif', fontSize:12, letterSpacing:1, color:'#66aaee', flexShrink:0, lineHeight:cellH+'px' }}>
            {rowLabel}
          </div>
          <div style={{ display:'flex', gap:2 }}>
            {game.cols.map((colLabel, c) => {
              const v      = board?.[r]?.[c]
              const shipId = !hideShips && shipMap[`${r},${c}`]
              const st     = shipId ? (SHIP_STYLES[shipId] || SHIP_STYLES.patrol) : null
              const th = theme || {}
              const skinSt = (shipSkin && shipId && shipSkin[shipId]) ? shipSkin[shipId] : st
              let bg=th.cellBg||'#050d1a', bc=th.cellBorder||'#0c1e30', content=null
              if (skinSt && (v==='ship'||v===null)) { bg=skinSt.bg; bc=skinSt.border }
              if (v==='preview-valid')   { bg='rgba(0,212,255,.2)'; bc='#00d4ff' }
              if (v==='preview-invalid') { bg='rgba(255,58,58,.2)'; bc='#ff3a3a' }
              if (v==='miss')  { bg=th.missBg||'#0a2a4a'; bc=th.cellBorder||'#1a5a8a'; content=<span style={{color:'#4a9abb',fontSize:20,lineHeight:1}}>·</span> }
              if (v==='hit')   { bg=th.hitBg||'#4a1800'; bc='#cc5500'; content=<span style={{color:'#ff6600',fontSize:15}}>✕</span> }
              if (v==='sunk')  { bg='#2e0000'; bc='#880000'; content=<span style={{color:'#ff3333',fontSize:15}}>✕</span> }
              const hint = (!v && !st && interactive)
                ? <span style={{fontSize:8,color:'#1a3a5c',fontFamily:'Share Tech Mono,monospace',textAlign:'center',padding:'0 2px',lineHeight:1.3}}>
                    {colLabel.substring(0,6)}<br/>{rowLabel.substring(0,6)}
                  </span>
                : null
              return (
                <div key={c}
                  onClick={()=>interactive&&onCellClick?.(r,c)}
                  onMouseEnter={()=>interactive&&onCellHover?.(r,c)}
                  onMouseLeave={()=>interactive&&onCellLeave?.()}
                  style={{ width:cellW, height:cellH, background:bg, border:`2px solid ${bc}`, cursor:interactive?'crosshair':'default', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .1s', flexShrink:0 }}
                >{content||hint}</div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Screens ───────────────────────────────────────────────────────
const S = { MODE:'mode', AI_DIFF:'ai-diff', SETUP:'setup', OVA_SETUP:'ova-setup', PLACEMENT:'placement', CHALLENGE:'challenge', RESULT:'result', BATTLE:'battle', WIN:'win' }

export default function LearnPage() {
  const { user } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  const [game] = useState(loadGame)
  const NR     = game.rows.length
  const NC     = game.cols.length

  // Load equipped cosmetics
  const [equippedTheme, setEquippedTheme] = useState('default')
  const [equippedSkin,  setEquippedSkin]  = useState('default')
  useEffect(() => {
    if (!user || user.isAnonymous) return
    getDoc(doc(db,'users',user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setEquippedTheme(d.equippedTheme || 'default')
        setEquippedSkin(d.equippedSkin   || 'default')
      }
    }).catch(()=>{})
  }, [user])

  // Ships config — use game's ship list if defined, else default learn ships
  const ALL_SHIP_DEFS = {
    carrier:    { id:'carrier',    name:'Porte-avions', size:5, sunk:false, hits:0 },
    battleship: { id:'battleship', name:'Cuirassé',     size:4, sunk:false, hits:0 },
    cruiser:    { id:'cruiser',    name:'Croiseur',     size:3, sunk:false, hits:0 },
    submarine:  { id:'submarine',  name:'Sous-marin',   size:3, sunk:false, hits:0 },
    destroyer:  { id:'destroyer',  name:'Destroyer',    size:2, sunk:false, hits:0 },
    patrol:     { id:'patrol',     name:'Patrouille',   size:2, sunk:false, hits:0 },
  }
  const gameShips = (game.ships && game.ships.length > 0)
    ? game.ships.map(id => ALL_SHIP_DEFS[id]).filter(Boolean)
    : LEARN_SHIPS_CONFIG

  const [screen,  setScreen]  = useState(S.MODE)
  const [mode,    setMode]    = useState(null)
  const [aiDiff,  setAiDiff]  = useState('medium')
  const [team1,   setTeam1]   = useState('Équipe 1')
  const [team2,   setTeam2]   = useState('Équipe 2')

  // One-vs-All state
  const [defenderName,  setDefenderName]  = useState('Le Défenseur')
  const [attackerNames, setAttackerNames] = useState(['Équipe A', 'Équipe B', 'Équipe C'])
  const [ovaAttackerIdx, setOvaAttackerIdx] = useState(0) // which attacker's turn

  // Placement
  const [placingTeam, setPlacingTeam] = useState(1)
  const [placed,      setPlaced]      = useState([])
  const [shipIdx,     setShipIdx]     = useState(0)
  const [orientation, setOrientation] = useState('H')
  const [hoverBoard,  setHoverBoard]  = useState(null)

  // Battle
  const team1ShipsRef   = useRef([])
  const team2ShipsRef   = useRef([])
  const attackBoard1Ref = useRef(null)
  const attackBoard2Ref = useRef(null)

  const [currentTeam,   setCurrentTeam]   = useState(1)
  const currentTeamRef = useRef(1) // ref to avoid stale closures in setTimeout
  const [displayBoard,  setDisplayBoard]  = useState(null)
  // In vs-ai mode: separate board showing where AI has attacked (our defence)
  const [myDefenceBoard, setMyDefenceBoard] = useState(null)
  const [shots,        setShots]        = useState([0, 0])
  const [battleLog,    setBattleLog]    = useState([])

  // Challenge
  const [challenge,         setChallenge]         = useState(null)
  const [challengeRevealed, setChallengeRevealed] = useState(null)
  const [pendingCell,       setPendingCell]        = useState(null)

  // Result flash
  const [resultMsg, setResultMsg] = useState(null)
  const [winner,    setWinner]    = useState(null)

  useEffect(() => {
    function onKey(e) { if (screen===S.PLACEMENT&&(e.key==='r'||e.key==='R')) setOrientation(o=>o==='H'?'V':'H') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen])

  function addLog(msg, type='') { setBattleLog(l=>[...l.slice(-29),{msg,type,id:Date.now()+Math.random()}]) }

  // ── Modes ─────────────────────────────────────────────────────
  function selectMode(m) { setMode(m); if(m==='vs-ai') setScreen(S.AI_DIFF); else if(m==='one-vs-all') setScreen(S.OVA_SETUP); else setScreen(S.SETUP) }

  // ── Placement ─────────────────────────────────────────────────
  function startPlacement(team) {
    setPlacingTeam(team); setPlaced([]); setShipIdx(0); setOrientation('H'); setHoverBoard(null)
    setScreen(S.PLACEMENT)
  }

  function onHover(r, c) {
    const ship = gameShips[shipIdx]; if(!ship||placed.find(p=>p.id===ship.id)) return
    const cells = getShipCells(r,c,ship.size,orientation)
    const valid = isValidPlacement(cells,placed,NR,NC)
    const board = createEmptyBoard(NR,NC)
    placed.forEach(s=>s.cells.forEach(({r:sr,c:sc})=>{board[sr][sc]='ship'}))
    cells.forEach(({r:cr,c:cc})=>{ if(cr>=0&&cr<NR&&cc>=0&&cc<NC&&board[cr][cc]!=='ship') board[cr][cc]=valid?'preview-valid':'preview-invalid' })
    setHoverBoard(board)
  }

  function onClick(r, c) {
    const ship = gameShips[shipIdx]; if(!ship||placed.find(p=>p.id===ship.id)) return
    const cells = getShipCells(r,c,ship.size,orientation)
    if(!isValidPlacement(cells,placed,NR,NC)) { toast('Placement invalide !','error'); return }
    const next = [...placed,{...ship,cells,sunk:false,hits:0}]; setPlaced(next); setHoverBoard(null)
    let i=shipIdx+1; while(i<gameShips.length&&next.find(p=>p.id===LEARN_SHIPS_CONFIG[i].id)) i++; setShipIdx(i)
  }

  const allPlaced = gameShips.every(s=>placed.find(p=>p.id===s.id))

  function confirmPlacement() {
    if (mode === 'one-vs-all') {
      // Only defender places ships
      team1ShipsRef.current = JSON.parse(JSON.stringify(placed))
      team2ShipsRef.current = [] // attackers have no ships
      startBattle()
      return
    }
    if (placingTeam===1) {
      team1ShipsRef.current = JSON.parse(JSON.stringify(placed))
      if (mode==='vs-ai') { team2ShipsRef.current=placeShipsRandomly(NR,NC,gameShips); startBattle() }
      else startPlacement(2)
    } else {
      team2ShipsRef.current = JSON.parse(JSON.stringify(placed))
      startBattle()
    }
  }

  function setTeam(t) { currentTeamRef.current = t; setCurrentTeam(t) }

  function startBattle() {
    attackBoard1Ref.current = createEmptyBoard(NR,NC)
    attackBoard2Ref.current = createEmptyBoard(NR,NC)
    setTeam(1); setDisplayBoard(createEmptyBoard(NR,NC))
    setMyDefenceBoard(createEmptyBoard(NR,NC))
    setShots([0,0]); setBattleLog([]); setScreen(S.BATTLE)
  }

  // ── Attack ─────────────────────────────────────────────────────
  function onCellClick(r, c) {
    const board = mode==='one-vs-all' ? attackBoard1Ref.current : (currentTeam===1 ? attackBoard1Ref.current : attackBoard2Ref.current)
    if (board[r][c]) { toast('Case déjà jouée','error'); return }
    setPendingCell({r,c})
    setChallenge(buildChallengeCard(game, r, c))
    setChallengeRevealed(null)
    setScreen(S.CHALLENGE)
  }

  function resolveChallenge(correct) {
    const {r,c} = pendingCell
    setPendingCell(null); setChallenge(null); setChallengeRevealed(null)

    const currentAttackerName = mode==='one-vs-all' ? attackerNames[ovaAttackerIdx] : (currentTeam===1?team1:team2)

    if (!correct) {
      addLog(currentAttackerName+': réponse incorrecte — tour perdu','miss')
      showResult('❌ INCORRECT','#ff3a3a','Tour perdu !', ()=>{
        if (mode==='one-vs-all') {
          setOvaAttackerIdx(i => (i+1) % attackerNames.length)
          setScreen(S.BATTLE)
        } else switchTeam()
      }); return
    }

    const targetShips = mode==='one-vs-all' ? team1ShipsRef.current : (currentTeam===1 ? team2ShipsRef.current : team1ShipsRef.current)
    const {result,sunkShip,updatedShips} = processShot(r,c,targetShips)
    if (mode==='one-vs-all') team1ShipsRef.current=updatedShips
    else if (currentTeam===1) team2ShipsRef.current=updatedShips; else team1ShipsRef.current=updatedShips

    const board   = mode==='one-vs-all' ? attackBoard1Ref.current : (currentTeam===1 ? attackBoard1Ref.current : attackBoard2Ref.current)
    const newBoard = board.map(row=>[...row])
    if (result==='sunk') sunkShip.cells.forEach(sc=>{newBoard[sc.r][sc.c]='sunk'})
    else newBoard[r][c]=result
    attackBoard1Ref.current=newBoard
    setDisplayBoard(newBoard)

    const label = `${game.rows[r]} + ${game.cols[c]}`
    setShots(s=>{const n=[...s];n[mode==='one-vs-all'?ovaAttackerIdx:currentTeam-1]++;return n})

    if (result==='sunk')     addLog(currentAttackerName+': '+label+' — '+sunkShip.name.toUpperCase()+' COULÉ !','sunk')
    else if(result==='hit')  addLog(currentAttackerName+': '+label+' — TOUCHÉ !','hit')
    else                     addLog(currentAttackerName+': '+label+' — À l\'eau','miss')

    if (allSunk(updatedShips)) { setWinner(mode==='one-vs-all'?0:currentTeam); setScreen(S.WIN); return }

    if (result==='hit') {
      showResult('🎯 TOUCHÉ !','#ff6600','REJOUE !',()=>{
        if(mode==='one-vs-all') setScreen(S.BATTLE); else setScreen(S.BATTLE)
      })
    } else {
      showResult(result==='sunk'?'💥 COULÉ !':'💧 À L\'EAU', result==='sunk'?'#ff3333':'#4a9abb', 'Tour suivant...', ()=>{
        if (mode==='one-vs-all') {
          setOvaAttackerIdx(i => (i+1) % attackerNames.length)
          setScreen(S.BATTLE)
        } else switchTeam()
      })
    }
  }

  function showResult(text,color,sub,cb,duration=2200) {
    setResultMsg({text,color,sub}); setScreen(S.RESULT)
    setTimeout(()=>{ setResultMsg(null); cb() }, duration)
  }

  function switchTeam() {
    const next = currentTeamRef.current===1 ? 2 : 1
    setTeam(next)
    setDisplayBoard(next===1 ? attackBoard1Ref.current : attackBoard2Ref.current)
    setScreen(S.BATTLE)
    if (mode==='vs-ai' && next===2) setTimeout(doAiTurn, 800)
  }

  function doAiTurn() {
    const board = attackBoard2Ref.current
    const {cell} = aiPickCell(board,{hitChain:[],huntTargets:[]},aiDiff,NR,NC)
    if (!cell) { switchTeam(); return }
    const {result,sunkShip,updatedShips} = processShot(cell.r,cell.c,team1ShipsRef.current)
    team1ShipsRef.current = updatedShips
    const newBoard = board.map(row=>[...row])
    if (result==='sunk') sunkShip.cells.forEach(sc=>{newBoard[sc.r][sc.c]='sunk'})
    else newBoard[cell.r][cell.c]=result
    attackBoard2Ref.current=newBoard
    setMyDefenceBoard(newBoard)
    setShots(s=>{const n=[...s];n[1]++;return n})
    if (allSunk(updatedShips)) { setWinner(2); setScreen(S.WIN); return }
    const resText = result==='sunk'?'💥 IA — COULÉ !':result==='hit'?'🎯 IA — TOUCHÉ !':'💧 IA — À L\'EAU'
    const resColor = result==='sunk'?'#ff3333':result==='hit'?'#ff6600':'#4a9abb'
    // Always switch back after one shot — no chaining
    showResult(resText, resColor, 'À vous de jouer !', ()=>switchTeam(), 1000)
  }

  function buildPlacementBoard() {
    const board=createEmptyBoard(NR,NC)
    placed.forEach(s=>s.cells.forEach(({r,c})=>{board[r][c]='ship'}))
    if(hoverBoard) for(let r=0;r<NR;r++) for(let c=0;c<NC;c++) if((hoverBoard[r][c]==='preview-valid'||hoverBoard[r][c]==='preview-invalid')&&board[r][c]!=='ship') board[r][c]=hoverBoard[r][c]
    return board
  }

  function resetGame() { setScreen(S.MODE); setMode(null); setPlaced([]); setChallenge(null); setChallengeRevealed(null); setPendingCell(null); setWinner(null); setOvaAttackerIdx(0) }

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  if (screen===S.MODE) return (
    <div style={{padding:'40px',maxWidth:800,margin:'0 auto',position:'relative',zIndex:1}}>
      <button className="btn sm ghost" style={{marginBottom:16}} onClick={()=>navigate('/learn-games')}>⬅ CHANGER DE JEU</button>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:28,letterSpacing:5,color:'#00d4ff',marginBottom:4}}>📚 {game.name.toUpperCase()}</div>
      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:8,letterSpacing:1}}>
        GRILLE {NR}×{NC} — {NR*NC} CASES
      </div>
      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#ffd700',marginBottom:28,padding:'10px 14px',border:'1px solid rgba(255,215,0,.2)',background:'rgba(255,215,0,.05)',lineHeight:1.6}}>
        ℹ Avant chaque tir, l'élève dit la phrase à voix haute. Le prof valide avant que le tir parte.
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,maxWidth:760}}>
        <div className="card hover-glow fade-up" style={{padding:28,cursor:'pointer'}} onClick={()=>selectMode('local')}>
          <div style={{fontSize:38,marginBottom:12}}>👥</div>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:3,color:'#00d4ff',marginBottom:8}}>2 ÉQUIPES</div>
          <div style={{fontSize:12,color:'#4a7090',lineHeight:1.6}}>Équipe 1 vs Équipe 2. Écran projeté pour toute la classe.</div>
          <span className="tag" style={{marginTop:12,display:'inline-block'}}>CLASSE</span>
        </div>
        <div className="card hover-glow fade-up" style={{padding:28,cursor:'pointer',animationDelay:'.07s'}} onClick={()=>selectMode('vs-ai')}>
          <div style={{fontSize:38,marginBottom:12}}>🤖</div>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:3,color:'#00d4ff',marginBottom:8}}>VS IA</div>
          <div style={{fontSize:12,color:'#4a7090',lineHeight:1.6}}>La classe joue contre le robot.</div>
          <span className="tag" style={{marginTop:12,display:'inline-block'}}>SOLO CLASSE</span>
        </div>
        <div className="card hover-glow fade-up" style={{padding:28,cursor:'pointer',animationDelay:'.14s'}} onClick={()=>selectMode('one-vs-all')}>
          <div style={{fontSize:38,marginBottom:12}}>🎯</div>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:3,color:'#ff6600',marginBottom:8}}>1 VS TOUS</div>
          <div style={{fontSize:12,color:'#4a7090',lineHeight:1.6}}>Un élève pose ses bateaux, les équipes l'attaquent à tour de rôle.</div>
          <span className="tag" style={{marginTop:12,display:'inline-block',borderColor:'#ff6600',color:'#ff6600'}}>DÉFI</span>
        </div>
      </div>
    </div>
  )

  if (screen===S.AI_DIFF) return (
    <div style={{padding:'40px',maxWidth:700,margin:'0 auto',position:'relative',zIndex:1}}>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:28,letterSpacing:5,color:'#00d4ff',marginBottom:24}}>DIFFICULTÉ IA</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {[{id:'easy',icon:'🟢',name:'Facile',desc:'Tirs aléatoires.'},{id:'medium',icon:'🟡',name:'Moyen',desc:'Suit ses touches.'},{id:'hard',icon:'🔴',name:'Difficile',desc:'Optimal.'}].map(d=>(
          <div key={d.id} className="card hover-glow" style={{padding:24,cursor:'pointer'}} onClick={()=>{setAiDiff(d.id);setScreen(S.SETUP)}}>
            <div style={{fontSize:32,marginBottom:10}}>{d.icon}</div>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:3,color:'#00d4ff',marginBottom:6}}>{d.name}</div>
            <div style={{fontSize:12,color:'#4a7090'}}>{d.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )

  if (screen===S.OVA_SETUP) return (
    <div style={{padding:'40px',maxWidth:560,margin:'0 auto',position:'relative',zIndex:1}}>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:26,letterSpacing:5,color:'#ff6600',marginBottom:24}}>🎯 1 VS TOUS — CONFIGURATION</div>
      <div className="card glow" style={{padding:32,position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#ff6600,transparent)'}}/>

        <div className="field">
          <label style={{color:'#ff6600'}}>🛡 Nom du défenseur</label>
          <input value={defenderName} onChange={e=>setDefenderName(e.target.value)}
            placeholder="ex: Maxime" maxLength={24} autoFocus
            style={{borderColor:'rgba(255,102,0,.4)'}}/>
        </div>

        <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:10,letterSpacing:1,marginTop:8}}>
          ⚔ ÉQUIPES ATTAQUANTES
        </div>
        {attackerNames.map((name, i) => (
          <div key={i} style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
            <input value={name}
              onChange={e=>setAttackerNames(a=>{const n=[...a];n[i]=e.target.value;return n})}
              placeholder={`Équipe ${i+1}`} maxLength={24}
              style={{flex:1}}/>
            {attackerNames.length > 2 && (
              <button className="btn sm danger" style={{flexShrink:0}}
                onClick={()=>setAttackerNames(a=>a.filter((_,j)=>j!==i))}>✕</button>
            )}
          </div>
        ))}
        {attackerNames.length < 6 && (
          <button className="btn sm" style={{marginBottom:16,marginTop:4}}
            onClick={()=>setAttackerNames(a=>[...a,`Équipe ${a.length+1}`])}>
            ＋ AJOUTER UNE ÉQUIPE
          </button>
        )}

        <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:16,padding:'8px 12px',border:'1px solid rgba(255,102,0,.2)',background:'rgba(255,102,0,.04)',lineHeight:1.6}}>
          ℹ Le défenseur place ses bateaux seul. Les équipes attaquent à tour de rôle en répondant aux défis.
        </div>

        <button className="btn primary full" style={{borderColor:'#ff6600',color:'#ff6600',background:'rgba(255,102,0,.1)',marginTop:4}}
          onClick={()=>{setOvaAttackerIdx(0);startPlacement(1)}}>
          ▶ PLACER LES BATEAUX — {defenderName.toUpperCase()}
        </button>
      </div>
    </div>
  )

  if (screen===S.SETUP) return (
    <div style={{padding:'40px',maxWidth:520,margin:'0 auto',position:'relative',zIndex:1}}>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:26,letterSpacing:5,color:'#00d4ff',marginBottom:24}}>NOM DES ÉQUIPES</div>
      <div className="card glow" style={{padding:32,position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#00d4ff,transparent)'}}/>
        <div className="field">
          <label>Équipe 1</label>
          <input value={team1} onChange={e=>setTeam1(e.target.value)} placeholder="ex: Les Requins" maxLength={24} autoFocus />
        </div>
        {mode==='local'
          ? <div className="field"><label>Équipe 2</label><input value={team2} onChange={e=>setTeam2(e.target.value)} placeholder="ex: Les Dauphins" maxLength={24}/></div>
          : <div className="field"><label>Équipe 2</label><input value="IA 🤖" disabled style={{opacity:.5}}/></div>
        }
        <button className="btn primary full" style={{marginTop:8}} onClick={()=>startPlacement(1)}>
          ▶ PLACER LES BATEAUX — {team1.toUpperCase()}
        </button>
      </div>
    </div>
  )

  if (screen===S.PLACEMENT) {
    const dispBoard = buildPlacementBoard()
    const shipMap   = buildShipMap(placed)
    const curShip   = gameShips[shipIdx]
    return (
      <div style={{padding:'20px 24px',maxWidth:1200,margin:'0 auto',position:'relative',zIndex:1}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16,flexWrap:'wrap'}}>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:4,color:'#00d4ff'}}>
            PLACEMENT — {placingTeam===1?team1.toUpperCase():team2.toUpperCase()}
          </div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090'}}>CLIQUEZ · [R] PIVOTER</div>
        </div>

        {/* Main layout — palette LEFT, grid RIGHT, always side by side */}
        <div style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:16,alignItems:'start'}}>

          {/* LEFT — Ship palette */}
          <div className="card" style={{padding:14}}>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:13,letterSpacing:3,color:'#00d4ff',marginBottom:10,paddingBottom:8,borderBottom:'1px solid #1a3a5c'}}>FLOTTE</div>
            {gameShips.map((s,i)=>{
              const p=!!placed.find(p=>p.id===s.id),a=i===shipIdx&&!p,st=SHIP_STYLES[s.id]||SHIP_STYLES.patrol
              return (
                <div key={s.id} onClick={()=>!p&&setShipIdx(i)}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'7px 8px',marginBottom:4,border:a?`1px solid ${st.border}`:'1px solid transparent',background:a?st.bg:'transparent',opacity:p?.35:1,cursor:p?'not-allowed':'pointer',transition:'all .15s',borderRadius:2}}>
                  <div style={{display:'flex',gap:2,flexShrink:0}}>{Array(s.size).fill(0).map((_,j)=><div key={j} style={{width:11,height:11,background:st.bg,border:`1px solid ${st.border}`}}/>)}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:11,color:p?'#4a7090':st.color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{st.label} {s.name}</div>
                    <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090'}}>{s.size} cases{p?' ✓':''}</div>
                  </div>
                </div>
              )
            })}
            <div style={{borderTop:'1px solid #1a3a5c',marginTop:8,paddingTop:8,display:'flex',flexDirection:'column',gap:5}}>
              <button className="btn sm" style={{fontSize:10,padding:'4px 8px'}} onClick={()=>setOrientation(o=>o==='H'?'V':'H')}>↻ {orientation==='H'?'H':'V'}</button>
              <button className="btn sm" style={{fontSize:10,padding:'4px 8px'}} onClick={()=>{setPlaced(placeShipsRandomly(NR,NC,gameShips));setShipIdx(gameShips.length);setHoverBoard(null)}}>🎲 AUTO</button>
              <button className="btn sm danger" style={{fontSize:10,padding:'4px 8px'}} onClick={()=>{setPlaced([]);setShipIdx(0);setHoverBoard(null)}}>✕</button>
            </div>
            <button className="btn primary full" style={{marginTop:8,fontSize:12,padding:'8px'}} disabled={!allPlaced} onClick={confirmPlacement}>✔ OK</button>
          </div>

          {/* RIGHT — Grid */}
          <div>
            {curShip&&!allPlaced&&(
              <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:(SHIP_STYLES[curShip.id]||SHIP_STYLES.patrol).color,marginBottom:8,letterSpacing:1}}>
                ► {curShip.name.toUpperCase()} — {curShip.size} cases — {orientation==='H'?'HORIZONTAL':'VERTICAL'}
              </div>
            )}
            <LearnGrid board={dispBoard} game={game} shipMap={shipMap} onCellClick={onClick} onCellHover={onHover} onCellLeave={()=>setHoverBoard(null)} interactive={!allPlaced} theme={SEA_THEMES[equippedTheme]||SEA_THEMES.default} shipSkin={SHIP_SKINS[equippedSkin]||SHIP_SKINS.default}/>
          </div>
        </div>
      </div>
    )
  }

  if (screen===S.BATTLE) {
    const isOVA  = mode==='one-vs-all'
    const isVsAI = mode==='vs-ai'
    const tname  = isOVA ? attackerNames[ovaAttackerIdx] : (currentTeam===1?team1:(isVsAI?'Classe':team2))
    const ename  = isOVA ? defenderName : (currentTeam===1?(isVsAI?'IA':team2):team1)
    return (
      <div style={{padding:'20px 32px',maxWidth:1100,margin:'0 auto',position:'relative',zIndex:1}}>
        {/* Status */}
        <div className="card" style={{padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <span className="dot" style={{background: isOVA?'#ff6600':'gold'}}/>
          <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:4,color:isOVA?'#ff6600':'#ffd700'}}>
            {isOVA ? '🎯' : '⚔'} {tname.toUpperCase()} — CLIQUE ET DIS LA PHRASE !
          </span>
          {isOVA && (
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginLeft:8}}>
              {attackerNames.map((n,i)=>(
                <span key={i} style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,padding:'2px 8px',
                  border:`1px solid ${i===ovaAttackerIdx?'#ff6600':'#1a3a5c'}`,
                  color:i===ovaAttackerIdx?'#ff6600':'#4a7090',
                  background:i===ovaAttackerIdx?'rgba(255,102,0,.1)':'transparent'}}>
                  {n}
                </span>
              ))}
            </div>
          )}
          <div style={{marginLeft:'auto',display:'flex',gap:16}}>
            {isOVA ? (
              <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>
                🛡 {defenderName} — {team1ShipsRef.current.filter(s=>!s.sunk).length} bateau(x) restant(s)
              </span>
            ) : (<>
              <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>{team1}: {shots[0]} tir{shots[0]!==1?'s':''}</span>
              <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>{isVsAI?'IA':team2}: {shots[1]} tir{shots[1]!==1?'s':''}</span>
            </>)}
          </div>
        </div>

        {/* Boards */}
        <div style={{display:'grid',gridTemplateColumns:isVsAI?'1fr 1fr':'1fr',gap:16,marginBottom:16}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:15,letterSpacing:3,color:'#ff3a3a',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
              <span className="dot red"/>MER {isOVA?'DU DÉFENSEUR':'ENNEMIE'} — {ename.toUpperCase()}
            </div>
            <LearnGrid board={displayBoard} game={game} onCellClick={onCellClick} interactive={true} hideShips={true} theme={SEA_THEMES[equippedTheme]||SEA_THEMES.default}/>
          </div>
          {isVsAI && (
            <div className="card" style={{padding:20}}>
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:15,letterSpacing:3,color:'#00d4ff',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                <span className="dot green"/>MA FLOTTE — CLASSE
              </div>
              <LearnGrid board={myDefenceBoard} game={game} shipMap={buildShipMap(team1ShipsRef.current)} hideShips={false} theme={SEA_THEMES[equippedTheme]||SEA_THEMES.default} shipSkin={SHIP_SKINS[equippedSkin]||SHIP_SKINS.default}/>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (screen===S.CHALLENGE && challenge) {
    const { row, col, prompt, form, answer, formLabel } = challenge
    const tname = mode==='one-vs-all' ? attackerNames[ovaAttackerIdx] : (currentTeam===1?team1:team2)
    const isLatin = game.subject === 'Latin'
    const formColor = isLatin
      ? (form==='positive'?'#00d4ff':form==='negative'?'#aa44ff':'#ffd700')
      : (form==='positive'?'#00ff88':form==='negative'?'#ff6666':form?'#ffd700':'#00d4ff')

    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'calc(100vh - 60px)',position:'relative',zIndex:1,padding:20}}>
        <div className="fade-up" style={{maxWidth:620,width:'100%',textAlign:'center'}}>
          <div className="card glow" style={{padding:'44px 40px',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${formColor},transparent)`}}/>

            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:12,color:'#4a7090',marginBottom:8,letterSpacing:2}}>{tname.toUpperCase()} — DÉFI ORAL</div>

            {/* Form label — only for games with forms */}
            {formLabel && (
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:4,color:formColor,marginBottom:4}}>
                {isLatin
                  ? (form==='positive'?'🔵 SINGULIER':form==='negative'?'🟣 PLURIEL':'❓ FORME INTERROGATIVE')
                  : (form==='positive'?'➕ FORME AFFIRMATIVE':form==='negative'?'➖ FORME NÉGATIVE':'❓ FORME INTERROGATIVE')}
              </div>
            )}
            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:13,color:'#4a7090',marginBottom:30,letterSpacing:2}}>
              {isLatin
                ? (formLabel ? 'DIS LA FORME DEMANDÉE' : 'DIS LA PHRASE À VOIX HAUTE')
                : (formLabel ? 'DIS LA PHRASE AU PASSÉ' : 'DIS LA PHRASE À VOIX HAUTE')}
            </div>

            {/* Row + Col + Cell */}
            <div style={{display:'flex',gap:10,justifyContent:'center',alignItems:'center',flexWrap:'wrap',marginBottom:32}}>
              <div style={{padding:'12px 20px',background:'#0e1e2e',border:'1px solid #2a4a6a',fontFamily:'Bebas Neue,sans-serif',fontSize:26,letterSpacing:3,color:'#66aaee'}}>{row}</div>
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:24,color:'#4a7090'}}>+</div>
              <div style={{padding:'12px 20px',background:'#0e2a1a',border:'1px solid #339966',fontFamily:'Bebas Neue,sans-serif',fontSize:26,letterSpacing:3,color:'#55cc88'}}>{col}</div>
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:24,color:'#4a7090'}}>+</div>
              <div style={{padding:'12px 20px',background:'#1a1a0e',border:'1px solid #555522',fontFamily:'Share Tech Mono,monospace',fontSize:16,color:'#bbbb55',lineHeight:1.5,maxWidth:200,textAlign:'center'}}>{prompt}</div>
            </div>

            {/* Teacher answer — revealed only after validation */}
            {challengeRevealed && answer && (
              <div style={{background:challengeRevealed==='correct'?'rgba(0,255,136,.08)':'rgba(255,58,58,.08)',border:`1px solid ${challengeRevealed==='correct'?'rgba(0,255,136,.3)':'rgba(255,58,58,.3)'}`,padding:'14px 20px',marginBottom:24,animation:'fadeUp .25s ease'}}>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',letterSpacing:2,marginBottom:6}}>BONNE RÉPONSE</div>
                <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:2,color:challengeRevealed==='correct'?'#00ff88':'#ff6666'}}>{answer}</div>
              </div>
            )}
            {challengeRevealed && !answer && <div style={{height:4,marginBottom:24}}/>}
            {!challengeRevealed && <div style={{height:4,marginBottom:24}}/>}

            {/* Buttons */}
            {!challengeRevealed ? (
              <div>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:14}}>ÉCOUTEZ L'ÉLÈVE, PUIS VALIDEZ :</div>
                <div style={{display:'flex',gap:16,justifyContent:'center'}}>
                  <button className="btn lg" onClick={()=>setChallengeRevealed('incorrect')}
                    style={{borderColor:'#ff3a3a',color:'#ff3a3a',flex:1,maxWidth:220}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,58,58,.1)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                    ✕ INCORRECT
                  </button>
                  <button className="btn lg" onClick={()=>setChallengeRevealed('correct')}
                    style={{borderColor:'#00ff88',color:'#00ff88',flex:1,maxWidth:220}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,255,136,.1)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                    ✓ CORRECT
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn primary lg" style={{width:'100%'}} onClick={()=>resolveChallenge(challengeRevealed==='correct')}>
                {challengeRevealed==='correct'?'🎯 TIRER — CONTINUER':'💀 TOUR PERDU — CONTINUER'}
              </button>
            )}
          </div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#2a4a5a',marginTop:12}}>
            INCORRECT = tour perdu · CORRECT = le tir part
          </div>
        </div>
      </div>
    )
  }

  if (screen===S.RESULT && resultMsg) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'calc(100vh - 60px)',position:'relative',zIndex:1}}>
      <div className="fade-up" style={{textAlign:'center',padding:40}}>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'clamp(60px,15vw,120px)',letterSpacing:6,color:resultMsg.color,textShadow:`0 0 40px ${resultMsg.color}55`,marginBottom:16}}>{resultMsg.text}</div>
        <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:14,color:'#4a7090',letterSpacing:2}}>{resultMsg.sub}</div>
      </div>
    </div>
  )

  if (screen===S.WIN) {
    const isOVA = mode==='one-vs-all'
    const winTeam = isOVA ? 'LES ATTAQUANTS' : (winner===1?team1:(mode==='vs-ai'?'L\'IA':team2))
    const winMsg  = isOVA ? `La flotte de ${defenderName} a été coulée !` : `${team1}: ${shots[0]} tirs · ${mode==='vs-ai'?'IA':team2}: ${shots[1]} tirs`
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'calc(100vh - 60px)',position:'relative',zIndex:1}}>
        <div className="fade-up" style={{textAlign:'center',padding:40,maxWidth:600}}>
          <div style={{fontSize:80,marginBottom:20}}>{isOVA?'💥':'🏆'}</div>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'clamp(36px,8vw,72px)',letterSpacing:6,color:isOVA?'#ff6600':'#ffd700',textShadow:`0 0 40px ${isOVA?'rgba(255,102,0,.4)':'rgba(255,215,0,.4)'}`,marginBottom:12}}>
            {winTeam.toUpperCase()} {isOVA?'GAGNENT !':'GAGNE !'}
          </div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:13,color:'#4a7090',marginBottom:36}}>
            {winMsg}
          </div>
          <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="btn primary lg" onClick={resetGame}>↺ REJOUER</button>
            <button className="btn lg" onClick={()=>navigate('/learn-games')}>📚 AUTRES JEUX</button>
            <button className="btn lg" onClick={()=>navigate('/dashboard')}>⬅ ACCUEIL</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
