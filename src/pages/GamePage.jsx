// src/pages/GamePage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  doc, setDoc, getDoc, onSnapshot, updateDoc,
  arrayUnion, serverTimestamp, collection, addDoc, getDocs, query, where, orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { useActiveEvent, EVENT_TYPES } from '../hooks/useActiveEvent'
import { COIN_REWARDS, SEA_THEMES, SHIP_SKINS } from '../lib/shopData'
import {
  DEFAULT_GRID_SIZE, ALL_ROWS, SHIPS_CONFIG, getShipsForSize, LEARN_SHIPS_CONFIG,
  createEmptyBoard, getShipCells, isValidPlacement,
  placeShipsRandomly, boardFromShips, processShot,
  aiPickCell, coordLabel, allSunk,
} from '../lib/gameEngine'

const SHIP_STYLES = {
  carrier:    { bg:'#0e2a4a', border:'#3377bb', label:'✈', color:'#66aaee' },
  battleship: { bg:'#20103a', border:'#7744bb', label:'⚔', color:'#aa77ee' },
  cruiser:    { bg:'#0e3a28', border:'#339966', label:'⛴', color:'#55cc88' },
  submarine:  { bg:'#0a2e1e', border:'#228855', label:'◈', color:'#44bb77' },
  destroyer:  { bg:'#3a1a08', border:'#aa5522', label:'⚡', color:'#ee8844' },
}

// ── Disco color cycle ─────────────────────────────────────────────
const DISCO_COLORS = ['#ff0080','#ff6600','#ffff00','#00ff88','#00d4ff','#aa44ff','#ff00ff']
function discoColor(r, c, tick) {
  return DISCO_COLORS[(r + c + tick) % DISCO_COLORS.length]
}

function buildShipMap(ships) {
  const map = {}
  ships.forEach(s => s.cells?.forEach(({ r, c }) => { map[`${r},${c}`] = s.id }))
  return map
}

// ── Grid — fully dynamic size ─────────────────────────────────────
function Grid({ board, gridSize = DEFAULT_GRID_SIZE, shipMap = {}, onCellClick, onCellHover, onCellLeave, interactive = false, cellSize = 36, eventType = null, discTick = 0, fogCells = null, mirrored = false, theme = null, shipSkin = null }) {
  const ROWS = ALL_ROWS.slice(0, gridSize)
  return (
    <div style={{ userSelect:'none' }}>
      <div style={{ display:'flex', marginLeft: cellSize + 4 }}>
        {Array.from({ length: gridSize }, (_, c) => (
          <div key={c} style={{ width:cellSize, textAlign:'center', fontFamily:'Share Tech Mono,monospace', fontSize:10, color:'#4a7090', lineHeight:'18px' }}>{c+1}</div>
        ))}
      </div>
      {Array.from({ length: gridSize }, (_, r) => (
        <div key={r} style={{ display:'flex', alignItems:'center' }}>
          <div style={{ width:cellSize, textAlign:'right', paddingRight:4, fontFamily:'Share Tech Mono,monospace', fontSize:10, color:'#4a7090', flexShrink:0, lineHeight:cellSize+'px' }}>{ROWS[r]}</div>
          <div style={{ display:'flex', gap:1 }}>
            {Array.from({ length: gridSize }, (_, c) => {
              const actualR = mirrored ? gridSize-1-r : r
              const actualC = mirrored ? gridSize-1-c : c
              const v = board?.[actualR]?.[actualC], shipId = shipMap[`${actualR},${actualC}`], st = shipId ? SHIP_STYLES[shipId] : null
              // Fog of war — hide untouched cells randomly
              const isFogged = fogCells && fogCells[`${actualR},${actualC}`] && !v
              // Apply equipped theme colors
              const th = theme || {}
              const emptyCellBg     = th.cellBg     || '#050d1a'
              const emptyCellBorder = th.cellBorder  || '#0c1e30'
              const hitCellBg       = th.hitBg       || '#4a1800'
              const missCellBg      = th.missBg      || '#0a2a4a'
              // Apply equipped ship skin — shipSkin is {carrier:{bg,border,color}, battleship:...}
              const skinSt = (shipSkin && shipId && shipSkin[shipId]) ? shipSkin[shipId] : st
              let bg = emptyCellBg, borderColor = emptyCellBorder, content = null
              if (skinSt && (v==='ship'||v===null)) { bg=skinSt.bg; borderColor=skinSt.border }
              if (v==='ship'&&!skinSt)              { bg='#1a3a5c'; borderColor='#2a5a8c' }
              if (v==='preview-valid')          { bg='rgba(0,212,255,.18)'; borderColor='#00d4ff' }
              if (v==='preview-invalid')        { bg='rgba(255,58,58,.18)'; borderColor='#ff3a3a' }
              if (v==='miss')                   { bg=missCellBg; borderColor=emptyCellBorder; content=<span style={{color:'#4a9abb',fontSize:13,lineHeight:1}}>·</span> }
              if (v==='hit')                    { bg=hitCellBg; borderColor='#cc5500'; content=<span style={{color:'#ff6600',fontSize:10}}>✕</span> }
              if (v==='sunk')                   { bg='#2e0000'; borderColor='#880000'; content=<span style={{color:'#ff3333',fontSize:10}}>✕</span> }
              // Disco mode
              if (eventType==='disco' && !v && !st) { const dc=discoColor(r,c,discTick); bg=`${dc}22`; borderColor=`${dc}66` }
              // Fog
              if (isFogged) { bg='#051220'; borderColor='#0a1a2a'; content=<span style={{color:'#1a3a5c',fontSize:16}}>~</span> }
              return (
                <div key={c}
                  onClick={() => interactive && onCellClick?.(r,c)}
                  onMouseEnter={() => interactive && onCellHover?.(r,c)}
                  onMouseLeave={() => interactive && onCellLeave?.()}
                  style={{ width:cellSize, height:cellSize, background:bg, border:`1px solid ${borderColor}`, cursor:interactive?'crosshair':'default', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .08s', flexShrink:0 }}
                >{content}</div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ShipLegend({ ships }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
      {SHIPS_CONFIG.map(cfg => {
        const ship=ships.find(s=>s.id===cfg.id), st=SHIP_STYLES[cfg.id]
        if (!ship) return null
        return (
          <div key={cfg.id} style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 7px', border:`1px solid ${ship.sunk?'#1a2a3a':st.border}`, background:ship.sunk?'transparent':st.bg, opacity:ship.sunk?.35:1, transition:'all .3s' }}>
            <span style={{ fontSize:11, color:st.color }}>{st.label}</span>
            <span style={{ fontFamily:'Share Tech Mono,monospace', fontSize:10, color:ship.sunk?'#4a7090':st.color }}>{cfg.name.substring(0,4).toUpperCase()}</span>
          </div>
        )
      })}
    </div>
  )
}

const SCREENS = { MODE:'mode', AI_DIFF:'ai-diff', ONLINE_LOBBY:'online-lobby', PLACEMENT:'placement', LOCAL_SWITCH:'local-switch', BATTLE:'battle', WIN:'win' }

export default function GamePage() {
  const { user } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()
  const activeEvent = useActiveEvent()

  const [screen, setScreen] = useState(SCREENS.MODE)
  const [mode,   setMode]   = useState(null)
  const [aiDiff, setAiDiff] = useState('medium')

  // ── Grid size — driven by selected fleet ──────────────────────
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE)
  const gridSizeRef = useRef(DEFAULT_GRID_SIZE) // always current, readable in callbacks
  // battleGridSize = locked in at confirmPlacement, used for rendering during the game
  const [battleGridSize, setBattleGridSize] = useState(DEFAULT_GRID_SIZE)

  // Placement
  const [placedShips,    setPlacedShips]    = useState([])
  const [shipIdx,        setShipIdx]        = useState(0)
  const [orientation,    setOrientation]    = useState('H')
  const [hoverBoard,     setHoverBoard]     = useState(null)
  const [placementTitle, setPlacementTitle] = useState('')
  const [savedFleets,    setSavedFleets]    = useState([])
  const [saveModal,      setSaveModal]      = useState(false)
  const [loadModal,      setLoadModal]      = useState(false)
  const [saveName,       setSaveName]       = useState('')

  // Battle
  const [myBoard,    setMyBoard]    = useState(null)
  const [enemyBoard, setEnemyBoard] = useState(null)
  const [myShips,    setMyShips]    = useState([])
  const [isMyTurn,   setIsMyTurn]   = useState(false)
  // ── Cosmetics ─────────────────────────────────────────────────────
  const [equippedTheme, setEquippedTheme] = useState('default')
  const [equippedSkin,  setEquippedSkin]  = useState('default')

  // Load equipped cosmetics on mount — retry until we get them
  useEffect(() => {
    if (!user || user.isAnonymous) return
    let cancelled = false
    const load = async () => {
      try {
        const snap = await getDoc(doc(db,'users',user.uid))
        if (snap.exists() && !cancelled) {
          const d = snap.data()
          const theme = d.equippedTheme || 'default'
          const skin  = d.equippedSkin  || 'default'
          console.log('[GamePage] Loaded cosmetics:', theme, skin)
          setEquippedTheme(theme)
          setEquippedSkin(skin)
        }
      } catch(e) { console.error('[GamePage] cosmetics load error:', e) }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  // ── Event effects state ──────────────────────────────────────────
  const [discoTick,   setDiscoTick]   = useState(0)
  const [fogCells,    setFogCells]    = useState(null)
  const [speedTimer,  setSpeedTimer]  = useState(null)
  const [doubleShot,  setDoubleShot]  = useState(false) // true = player gets a second shot
  const speedRef = useRef(null)

  // Refs so doAiTurn can read current values without nested setState
  const myBoardRef = useRef(null)
  const myShipsRef = useRef([])
  const [shots,      setShots]      = useState(0)
  const [battleLog,  setBattleLog]  = useState([])
  const [myName,     setMyName]     = useState('Moi')
  const [enemyName,  setEnemyName]  = useState('Adversaire')

  // Local
  const localRef = useRef({ boards:[null,null], ships:[null,null], attackBoards:[null,null], currentPlacer:1, turn:1 })

  // Online
  const [roomCode,    setRoomCode]    = useState('')
  const [roomId,      setRoomId]      = useState(null)
  const [joinInput,   setJoinInput]   = useState('')
  const [waitingMsg,  setWaitingMsg]  = useState("En attente d'un adversaire...")
  const [playerRole,  setPlayerRole]  = useState(null)
  const [onlineGridSize, setOnlineGridSize] = useState(DEFAULT_GRID_SIZE) // grid size shown in lobby
  const enemyShipsRef = useRef([])
  const unsubRef      = useRef(null)

  // AI
  const aiShipsRef = useRef([])
  const aiStateRef = useRef({ hitChain:[], huntTargets:[] })

  // Switch
  const [switchName,    setSwitchName]    = useState('')
  const switchActionRef = useRef(null)

  // Win
  const [winData, setWinData] = useState(null)

  const displayGridSize = screen === SCREENS.BATTLE ? battleGridSize : gridSize
  const cellSize = Math.max(24, Math.min(38, Math.floor((Math.min(typeof window!=='undefined'?window.innerWidth:900,1100)-140) / (displayGridSize * 2 + 4))))

  // Helper: set grid size in both state and ref atomically
  function applyGridSize(gs) { gridSizeRef.current = gs; setGridSize(gs) }

  // Ships config for current grid size
  const activeShips = getShipsForSize(gridSize)

  useEffect(() => {
    function onKey(e) { if (screen===SCREENS.PLACEMENT&&(e.key==='r'||e.key==='R')) setOrientation(o=>o==='H'?'V':'H') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen])

  useEffect(() => () => { unsubRef.current?.() }, [])

  // Disco ticker + music
  const audioRef = useRef(null)
  useEffect(() => {
    if (activeEvent?.eventType !== 'disco') {
      // Stop music if event ends
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      return
    }
    // Start disco ticker
    const id = setInterval(() => setDiscoTick(t => t + 1), 400)
    // Play It's Raining Tacos
    try {
      audioRef.current = new Audio('https://ia803401.us.archive.org/14/items/ItsRainingTacos_201903/Its%20Raining%20Tacos.mp3')
      audioRef.current.volume = 0.4
      audioRef.current.loop = true
      audioRef.current.play().catch(()=>{}) // ignore autoplay policy errors
    } catch {}
    return () => {
      clearInterval(id)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
  }, [activeEvent?.eventType])

  // Generate fog cells when event is fog
  useEffect(() => {
    if (activeEvent?.eventType !== 'fog') { setFogCells(null); return }
    const gs = gridSizeRef.current
    const fog = {}
    for (let r=0;r<gs;r++) for(let c=0;c<gs;c++) if(Math.random()<0.4) fog[`${r},${c}`]=true
    setFogCells(fog)
  }, [activeEvent?.eventType, screen])

  // Speed timer
  useEffect(() => {
    if (activeEvent?.eventType !== 'speed' || screen !== 'battle' || !isMyTurn) {
      if(speedRef.current) { clearInterval(speedRef.current); setSpeedTimer(null) }
      return
    }
    setSpeedTimer(10)
    speedRef.current = setInterval(() => {
      setSpeedTimer(t => {
        if (t <= 1) {
          clearInterval(speedRef.current)
          addLog('⏱ Temps écoulé — tour perdu !', 'miss')
          setIsMyTurn(false)
          if (screen === 'battle') setTimeout(() => setIsMyTurn(true), 1500)
          return null
        }
        return t - 1
      })
    }, 1000)
    return () => { clearInterval(speedRef.current); setSpeedTimer(null) }
  }, [isMyTurn, screen, activeEvent?.eventType])

  // Check sessionStorage for a pre-selected fleet from dashboard
  useEffect(() => {
    const fleetId = sessionStorage.getItem('selectedFleet')
    if (fleetId && user && !user.isAnonymous) {
      sessionStorage.removeItem('selectedFleet')
      loadFleetById(fleetId)
    }
  }, [user])

  async function loadFleetById(fleetId) {
    try {
      const snap = await getDoc(doc(db, 'fleets', fleetId))
      if (snap.exists()) {
        const fleet = snap.data()
        const gs = fleet.gridSize || DEFAULT_GRID_SIZE
        applyGridSize(gs)
        if (fleet.ships?.length) {
          const ships = getShipsForSize(gs)
          setPlacedShips(fleet.ships.map(s => ({ ...s, sunk:false, hits:0 })))
          setShipIdx(ships.length)
          toast(`Flotte "${fleet.name}" chargée (${gs}×${gs})`, 'success')
        }
      }
    } catch(e) { console.error(e) }
  }

  async function loadFleets() {
    if (!user || user.isAnonymous) return
    try {
      const q = query(collection(db,'fleets'), where('uid','==',user.uid), orderBy('createdAt','desc'))
      const s = await getDocs(q)
      setSavedFleets(s.docs.map(d => ({ id:d.id, ...d.data() })))
    } catch { setSavedFleets([]) }
  }

  function addLog(msg, type='') { setBattleLog(l=>[...l.slice(-49),{msg,type,id:Date.now()+Math.random()}]) }

  function updateMyBoard(boardOrFn) {
    if (typeof boardOrFn === 'function') {
      setMyBoard(prev => { const next = boardOrFn(prev); myBoardRef.current = next; return next })
    } else {
      myBoardRef.current = boardOrFn
      setMyBoard(boardOrFn)
    }
  }

  function updateMyShips(ships) {
    myShipsRef.current = ships
    setMyShips(ships)
  }

  // ── Mode select ──────────────────────────────────────────────
  function selectMode(m) {
    setMode(m)
    if (m==='online')     setScreen(SCREENS.ONLINE_LOBBY)
    else if (m==='local') startLocalGame()
    else                  setScreen(SCREENS.AI_DIFF)
  }

  function startVsAI(diff) {
    setAiDiff(diff); setMyName(user?.displayName||'Vous'); setEnemyName('IA ('+diff+')')
    beginPlacement('host', gridSizeRef.current)
  }

  function startLocalGame() {
    const g = gridSizeRef.current
    localRef.current = { boards:[createEmptyBoard(g),createEmptyBoard(g)], ships:[null,null], attackBoards:[createEmptyBoard(g),createEmptyBoard(g)], currentPlacer:1, turn:1 }
    setMyName('Joueur 1'); setEnemyName('Joueur 2')
    beginPlacement('local-p1', g)
  }

  // ── Online ────────────────────────────────────────────────────
  async function createRoom() {
    const code=Math.random().toString(36).substring(2,8).toUpperCase()
    setRoomCode(code); setRoomId(code); setPlayerRole('host')
    setMyName(user?.displayName||'Joueur 1')
    setOnlineGridSize(gridSizeRef.current)
    await setDoc(doc(db,'rooms',code),{
      host:user.uid, hostName:user?.displayName||'Joueur 1',
      guest:null, guestName:null, status:'waiting',
      hostReady:false, guestReady:false,
      hostBoard:null, guestBoard:null,
      moves:[], currentTurn:'host', winner:null,
      gridSize: gridSizeRef.current, // ← share grid size with guest
      createdAt:serverTimestamp(),
    })
    unsubRef.current?.()
    const unsub=onSnapshot(doc(db,'rooms',code),snap=>{
      const d=snap.data(); if(!d) return
      if(d.guest&&d.status==='placement') {
        setEnemyName(d.guestName||'Adversaire')
        setWaitingMsg(d.guestName+' a rejoint !')
        toast(d.guestName+' a rejoint !','success')
        unsub(); beginPlacement('host', gridSizeRef.current)
      }
    })
    unsubRef.current=unsub
  }

  async function joinRoom() {
    const code=joinInput.trim().toUpperCase()
    if(code.length<4) { toast('Code invalide','error'); return }
    try {
      const snap=await getDoc(doc(db,'rooms',code))
      if(!snap.exists()) { toast('Salle introuvable','error'); return }
      const d=snap.data()
      if(d.status!=='waiting') { toast('Salle pleine ou terminée','error'); return }
      const roomGrid = d.gridSize || DEFAULT_GRID_SIZE
      applyGridSize(roomGrid) // ← adopt host's grid size
      setOnlineGridSize(roomGrid)
      setRoomId(code); setPlayerRole('guest')
      setMyName(user?.displayName||'Joueur 2'); setEnemyName(d.hostName||'Adversaire')
      await updateDoc(doc(db,'rooms',code),{ guest:user.uid, guestName:user?.displayName||'Joueur 2', status:'placement' })
      toast(`Connecté à la salle ${code} — grille ${roomGrid}×${roomGrid}`,'success')
      beginPlacement('guest', roomGrid)
    } catch(e) { toast('Erreur: '+e.message,'error') }
  }

  // ── Placement ─────────────────────────────────────────────────
  function beginPlacement(role, gs) {
    const g = gs ?? gridSizeRef.current // use passed value or current ref
    setPlacedShips(ps => {
      const valid = ps.every(s => s.cells.every(({r,c}) => r < g && c < g))
      return valid ? ps : []
    })
    setShipIdx(0); setOrientation('H'); setHoverBoard(null)
    const t={ host:(user?.displayName||'Vous').toUpperCase(), guest:(user?.displayName||'Vous').toUpperCase(), 'local-p1':'JOUEUR 1', 'local-p2':'JOUEUR 2' }
    setPlacementTitle('PLACEMENT — '+(t[role]||'VOUS')+` — ${g}×${g}`)
    setScreen(SCREENS.PLACEMENT); loadFleets()
  }

  function onPlacementHover(r,c) {
    const ship = activeShips[shipIdx]; if(!ship||placedShips.find(p=>p.id===ship.id)) return
    const g=gridSizeRef.current
    const cells=getShipCells(r,c,ship.size,orientation)
    const valid=isValidPlacement(cells,placedShips,g)
    const board=createEmptyBoard(g)
    placedShips.forEach(s=>s.cells.forEach(({r:sr,c:sc})=>{ board[sr][sc]='ship' }))
    cells.forEach(({r:cr,c:cc})=>{ if(cr>=0&&cr<g&&cc>=0&&cc<g&&board[cr][cc]!=='ship') board[cr][cc]=valid?'preview-valid':'preview-invalid' })
    setHoverBoard(board)
  }

  function onPlacementClick(r,c) {
    const ship=activeShips[shipIdx]; if(!ship||placedShips.find(p=>p.id===ship.id)) return
    const cells=getShipCells(r,c,ship.size,orientation)
    if(!isValidPlacement(cells,placedShips,gridSizeRef.current,gridSizeRef.current)) { toast('Placement invalide !','error'); return }
    const next=[...placedShips,{...ship,cells,sunk:false,hits:0}]; setPlacedShips(next); setHoverBoard(null)
    let i=shipIdx+1; while(i<activeShips.length&&next.find(p=>p.id===activeShips[i].id)) i++; setShipIdx(i)
  }

  function clearPlacement()  { setPlacedShips([]); setShipIdx(0); setHoverBoard(null) }
  function randomPlacement() { const g=gridSizeRef.current; const ships=getShipsForSize(g); setPlacedShips(placeShipsRandomly(g, g)); setShipIdx(ships.length); setHoverBoard(null) }

  function loadFleet(fleet) {
    if(!fleet.ships?.length) { toast("Aucun placement dans cette flotte",'error'); return }
    const gs = fleet.gridSize || DEFAULT_GRID_SIZE
    applyGridSize(gs)
    const ships = getShipsForSize(gs)
    setPlacedShips(fleet.ships.map(s=>({...s,sunk:false,hits:0}))); setShipIdx(ships.length); setHoverBoard(null)
    setLoadModal(false); toast(`Flotte "${fleet.name}" chargée (${gs}×${gs})`,'success')
  }

  async function saveCurrentFleet() {
    if(!saveName.trim()) { toast('Entrez un nom','error'); return }
    try {
      await addDoc(collection(db,'fleets'),{
        uid:user.uid, name:saveName.trim(), gridSize:gridSizeRef.current, notes:'',
        ships:placedShips.map(s=>({id:s.id,name:s.name,size:s.size,cells:s.cells})),
        createdAt:serverTimestamp(),
      })
      toast(`Flotte "${saveName}" sauvegardée (${gridSizeRef.current}×${gridSizeRef.current}) !`,'success')
      setSaveModal(false); setSaveName(''); loadFleets()
    } catch(e) { toast('Erreur: '+e.message,'error') }
  }

  const allPlaced = activeShips.every(s=>placedShips.find(p=>p.id===s.id))

  async function confirmPlacement() {
    const g=gridSizeRef.current
    setBattleGridSize(g) // lock grid size for the entire battle
    const ships=placedShips, board=boardFromShips(ships,g)
    if(mode==='vs-ai') {
      aiShipsRef.current=placeShipsRandomly(g, g); aiStateRef.current={hitChain:[],huntTargets:[]}
      updateMyBoard(board); updateMyShips(JSON.parse(JSON.stringify(ships)))
      setEnemyBoard(createEmptyBoard(g)); setIsMyTurn(true); setShots(0); setBattleLog([])
      setScreen(SCREENS.BATTLE)
    } else if(mode==='local') {
      const pidx=localRef.current.currentPlacer-1
      localRef.current.ships[pidx]=JSON.parse(JSON.stringify(ships))
      localRef.current.boards[pidx]=board
      localRef.current.attackBoards[pidx]=createEmptyBoard(g)
      if(localRef.current.currentPlacer===1) {
        localRef.current.currentPlacer=2; setSwitchName('JOUEUR 2'); switchActionRef.current=()=>beginPlacement('local-p2'); setScreen(SCREENS.LOCAL_SWITCH)
      } else {
        localRef.current.turn=1; setMyName('Joueur 1'); setEnemyName('Joueur 2')
        updateMyBoard(localRef.current.boards[0]); updateMyShips(JSON.parse(JSON.stringify(localRef.current.ships[0]))); setEnemyBoard(localRef.current.attackBoards[0])
        setIsMyTurn(true); setShots(0); setBattleLog([])
        setSwitchName('JOUEUR 1'); switchActionRef.current=()=>setScreen(SCREENS.BATTLE); setScreen(SCREENS.LOCAL_SWITCH)
      }
    } else if(mode==='online') {
      const bk=playerRole==='host'?'hostBoard':'guestBoard', rk=playerRole==='host'?'hostReady':'guestReady'
      setMyBoard(board); setMyShips(JSON.parse(JSON.stringify(ships))); setEnemyBoard(createEmptyBoard(gridSizeRef.current)); setShots(0); setBattleLog([])
      toast("En attente de l'adversaire...",'info')
      await updateDoc(doc(db,'rooms',roomId),{[bk]:JSON.stringify(ships),[rk]:true})
      unsubRef.current?.()
      const unsub=onSnapshot(doc(db,'rooms',roomId),snap=>{
        const d=snap.data(); if(!d) return
        if(d.hostReady&&d.guestReady) {
          unsub()
          const ek=playerRole==='host'?'guestBoard':'hostBoard'
          enemyShipsRef.current=JSON.parse(d[ek])
          setEnemyName(playerRole==='host'?(d.guestName||'Adversaire'):(d.hostName||'Adversaire'))
          setIsMyTurn(playerRole==='host'); setScreen(SCREENS.BATTLE); listenOnlineMoves()
        }
      })
      unsubRef.current=unsub
    }
  }

  function resumeSwitch() { const fn=switchActionRef.current; switchActionRef.current=null; fn?.() }

  function listenOnlineMoves() {
    let last=0; unsubRef.current?.()
    const unsub=onSnapshot(doc(db,'rooms',roomId),snap=>{
      const d=snap.data(); if(!d) return
      setIsMyTurn(d.currentTurn===playerRole)
      const moves=d.moves||[]
      if(moves.length>last) { moves.slice(last).forEach(mv=>{ if(mv.by!==playerRole) applyEnemyMove(mv) }); last=moves.length }
      if(d.winner) triggerEndGame(d.winner===playerRole)
    })
    unsubRef.current=unsub
  }

  function applyEnemyMove({r,c,result,sunkCells}) {
    updateMyBoard(prev=>{ const next=prev.map(row=>[...row]); if(result==='miss') next[r][c]='miss'; else if(result.startsWith('sunk:')&&sunkCells) sunkCells.forEach(sc=>{next[sc.r][sc.c]='sunk'}); else next[r][c]='hit'; return next })
    addLog(enemyName+': '+coordLabel(r,c)+(result.startsWith('sunk:')?'  — COULÉ !':result==='hit'?' — TOUCHÉ !':' — À l\'eau'),result==='miss'?'miss':'hit')
  }

  function onAttack(r,c) {
    if(!isMyTurn) { toast("Ce n'est pas ton tour",'error'); return }
    let targetShips,getEB,setEB
    if(mode==='vs-ai') {
      targetShips=aiShipsRef.current; getEB=()=>enemyBoard; setEB=setEnemyBoard
    } else if(mode==='local') {
      const t=localRef.current.turn
      targetShips=localRef.current.ships[t===1?1:0]
      getEB=()=>localRef.current.attackBoards[t===1?0:1]
      setEB=fn=>{ const nb=typeof fn==='function'?fn(getEB()):fn; localRef.current.attackBoards[localRef.current.turn===1?0:1]=nb; setEnemyBoard(nb) }
    } else {
      targetShips=enemyShipsRef.current; getEB=()=>enemyBoard; setEB=setEnemyBoard
    }
    if(getEB()?.[r]?.[c]) { toast('Case déjà jouée','error'); return }
    const {result,sunkShip,updatedShips}=processShot(r,c,targetShips)
    const coord=coordLabel(r,c), newShots=shots+1
    setEB(prev=>{ const next=prev.map(row=>[...row]); if(result==='sunk') sunkShip.cells.forEach(sc=>{next[sc.r][sc.c]='sunk'}); else next[r][c]=result; return next })
    if(mode==='vs-ai') aiShipsRef.current=updatedShips
    if(mode==='local') {
      localRef.current.ships[localRef.current.turn===1?1:0]=updatedShips
      const edi=localRef.current.turn===1?1:0
      const db2=localRef.current.boards[edi].map(row=>[...row])
      if(result==='sunk') sunkShip.cells.forEach(sc=>{db2[sc.r][sc.c]='sunk'}); else db2[r][c]=result
      localRef.current.boards[edi]=db2
    }
    setShots(newShots)
    if(result==='sunk') { addLog(coord+' — '+sunkShip.name.toUpperCase()+' COULÉ !','sunk'); toast('💥 '+sunkShip.name+' coulé !','success') }
    else if(result==='hit') { addLog(coord+' — TOUCHÉ !','hit'); toast('🎯 Touché en '+coord,'success') }
    else addLog(coord+' — À l\'eau','miss')
    // MINES effect — explode adjacent cells too
    if (activeEvent?.eventType === 'mines') {
      const adjDeltas = [[-1,0],[1,0],[0,-1],[0,1]]
      for (const [dr,dc] of adjDeltas) {
        const nr=r+dr, nc_=c+dc
        if (nr>=0&&nr<gridSizeRef.current&&nc_>=0&&nc_<gridSizeRef.current&&!getEB()?.[nr]?.[nc_]) {
          const {result:r2,sunkShip:s2,updatedShips:u2} = processShot(nr,nc_,updatedShips)
          if (r2!=='miss') {
            setEB(prev=>{ const nb=prev.map(row=>[...row]); if(r2==='sunk') s2.cells.forEach(sc=>{nb[sc.r][sc.c]='sunk'}); else nb[nr][nc_]=r2; return nb })
          }
        }
      }
    }

    if(allSunk(updatedShips)) { triggerEndGame(true,newShots); return }
    // Double shot — on hit, player fires again
    if (activeEvent?.eventType === 'doubletir' && result !== 'miss') {
      setDoubleShot(true)
      setTimeout(() => setDoubleShot(false), 200)
      // keep isMyTurn true = player fires again
      if(mode==='online') {
        updateDoc(doc(db,'rooms',roomId),{ moves:arrayUnion({r,c,by:playerRole,result:result==='sunk'?'sunk:'+sunkShip.id:result,sunkCells:result==='sunk'?sunkShip.cells:null}),currentTurn:playerRole })
      }
      return
    }

    if(mode==='online') {
      updateDoc(doc(db,'rooms',roomId),{ moves:arrayUnion({r,c,by:playerRole,result:result==='sunk'?'sunk:'+sunkShip.id:result,sunkCells:result==='sunk'?sunkShip.cells:null}),currentTurn:playerRole==='host'?'guest':'host' })
      setIsMyTurn(false); return
    }
    if(mode==='local') {
      setIsMyTurn(false)
      setTimeout(()=>{
        const nt=localRef.current.turn===1?2:1; localRef.current.turn=nt
        updateMyBoard(localRef.current.boards[nt===1?0:1]); updateMyShips(JSON.parse(JSON.stringify(localRef.current.ships[nt===1?0:1]))); setEnemyBoard(localRef.current.attackBoards[nt===1?0:1])
        setMyName('Joueur '+nt); setEnemyName('Joueur '+(nt===1?2:1))
        setSwitchName('JOUEUR '+nt); switchActionRef.current=()=>{ setIsMyTurn(true); setScreen(SCREENS.BATTLE) }; setScreen(SCREENS.LOCAL_SWITCH)
      },400); return
    }
    setIsMyTurn(false); setTimeout(()=>doAiTurn(newShots),900)
  }

  function doAiTurn(currentShots) {
    // Read current state via refs — never nest setState calls
    const currentBoard = myBoardRef.current
    const currentShips = myShipsRef.current
    if (!currentBoard || !currentShips) { setIsMyTurn(true); return }

    const {cell,newAiState} = aiPickCell(currentBoard, aiStateRef.current, aiDiff, gridSizeRef.current, gridSizeRef.current)
    if (!cell) { setIsMyTurn(true); return }

    const {result, sunkShip, updatedShips} = processShot(cell.r, cell.c, currentShips)
    const coord = coordLabel(cell.r, cell.c)

    // Update AI state
    if (result==='sunk') {
      aiStateRef.current = {hitChain:[], huntTargets:[]}
      addLog('IA: '+coord+' — '+sunkShip.name.toUpperCase()+' COULÉ !', 'sunk')
      toast('🤖 IA a coulé votre '+sunkShip.name, 'error')
    } else if (result==='hit') {
      aiStateRef.current = {...newAiState, hitChain:[...(newAiState.hitChain||[]), cell]}
      addLog('IA: '+coord+' — TOUCHÉ !', 'hit')
    } else {
      aiStateRef.current = newAiState
      addLog('IA: '+coord+' — À l\'eau', 'miss')
    }

    // Update board
    const newBoard = currentBoard.map(row => [...row])
    if (result==='sunk') sunkShip.cells.forEach(sc => { newBoard[sc.r][sc.c]='sunk' })
    else newBoard[cell.r][cell.c] = result==='hit' ? 'hit' : 'miss'

    myBoardRef.current = newBoard
    myShipsRef.current = updatedShips
    setMyBoard(newBoard)
    setMyShips(updatedShips)

    if (allSunk(updatedShips)) {
      triggerEndGame(false, currentShots)
    } else {
      setIsMyTurn(true)
    }
  }

  async function triggerEndGame(won,finalShots) {
    unsubRef.current?.(); setWinData({won,shots:finalShots??shots}); setScreen(SCREENS.WIN)
    try {
      if(user && !user.isAnonymous) {
        await addDoc(collection(db,'games'),{players:[user.uid],winner:won?user.uid:'opponent',mode,opponentName:enemyName,shots:finalShots??shots,gridSize:gridSizeRef.current,createdAt:serverTimestamp()})
        const ref=doc(db,'users',user.uid),snap=await getDoc(ref),d=snap.exists()?snap.data():{wins:0,losses:0,coins:0}
        const coinsEarned = won ? COIN_REWARDS.win : COIN_REWARDS.loss
        await setDoc(ref,{wins:(d.wins||0)+(won?1:0),losses:(d.losses||0)+(won?0:1),coins:(d.coins||0)+coinsEarned},{merge:true})
        toast(`+${coinsEarned} 🪙`,'success')
      } else if(user && user.isAnonymous) {
        // Invité — pas de pièces, message explicatif
        if(won) toast('Victoire ! Crée un compte pour gagner des 🪙','info')
      }
    } catch(e) { console.error(e) }
    if(mode==='online'&&roomId) { try { await updateDoc(doc(db,'rooms',roomId),{winner:won?playerRole:(playerRole==='host'?'guest':'host'),status:'ended'}) } catch {} }
  }

  function buildPlacementBoard() {
    const g=gridSizeRef.current
    const board=createEmptyBoard(g)
    placedShips.forEach(s=>s.cells.forEach(({r,c})=>{ board[r][c]='ship' }))
    if(hoverBoard) for(let r=0;r<g;r++) for(let c=0;c<g;c++) if((hoverBoard[r][c]==='preview-valid'||hoverBoard[r][c]==='preview-invalid')&&board[r][c]!=='ship') board[r][c]=hoverBoard[r][c]
    return board
  }

  function resetGame() {
    setScreen(SCREENS.MODE); setMode(null); setPlacedShips([]); setShipIdx(0)
    setBattleLog([]); setShots(0); setRoomCode(''); setJoinInput('')
    applyGridSize(DEFAULT_GRID_SIZE)
  }

  const ModalWrap = ({onClose,title,children}) => (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(5,13,26,.9)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div className="card glow fade-up" style={{width:'100%',maxWidth:400,padding:36,position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#00d4ff,transparent)'}}/>
        <button onClick={onClose} style={{position:'absolute',top:14,right:18,background:'none',border:'none',color:'#4a7090',fontSize:18,cursor:'pointer'}}>✕</button>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:3,color:'#00d4ff',marginBottom:20}}>{title}</div>
        {children}
      </div>
    </div>
  )

  // ── RENDER ────────────────────────────────────────────────────

  if (screen===SCREENS.MODE) return (
    <div style={{padding:'40px',maxWidth:900,margin:'0 auto',position:'relative',zIndex:1}}>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:32,letterSpacing:5,color:'#00d4ff',marginBottom:8}}>CHOISIR UN MODE</div>
      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:32}}>COMMENT VOULEZ-VOUS JOUER ?</div>
      {gridSize !== DEFAULT_GRID_SIZE && (
        <div style={{marginBottom:20,padding:'10px 16px',background:'rgba(0,212,255,.06)',border:'1px solid rgba(0,212,255,.2)',fontFamily:'Share Tech Mono,monospace',fontSize:12,color:'#00d4ff',display:'flex',alignItems:'center',gap:10}}>
          <span>⚓</span> Flotte sélectionnée — grille <strong>{gridSize}×{gridSize}</strong>
          <button onClick={()=>applyGridSize(DEFAULT_GRID_SIZE)} style={{marginLeft:'auto',background:'none',border:'none',color:'#4a7090',cursor:'pointer',fontSize:12}}>× réinitialiser</button>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
        {[
          {id:'online',icon:'🌐',name:'En Ligne',  tag:'RÉSEAU',     desc:'Jouez en temps réel depuis un autre appareil.'},
          {id:'local', icon:'👥',name:'Local 2J',  tag:'MÊME ÉCRAN', desc:'2 joueurs sur le même appareil, écran masqué entre les tours.'},
          {id:'vs-ai', icon:'🤖',name:'Vs IA',     tag:'SOLO',       desc:'3 niveaux de difficulté.'},
        ].map(m=>(
          <div key={m.id} className="card hover-glow fade-up" style={{padding:28,cursor:'pointer'}} onClick={()=>selectMode(m.id)}>
            <div style={{fontSize:38,marginBottom:12}}>{m.icon}</div>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:3,color:'#00d4ff',marginBottom:8}}>{m.name}</div>
            <div style={{fontSize:12,color:'#4a7090',lineHeight:1.6,marginBottom:12}}>{m.desc}</div>
            <span className="tag">{m.tag}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (screen===SCREENS.AI_DIFF) return (
    <div style={{padding:'40px',maxWidth:800,margin:'0 auto',position:'relative',zIndex:1}}>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:32,letterSpacing:5,color:'#00d4ff',marginBottom:8}}>DIFFICULTÉ IA</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginTop:24}}>
        {[{id:'easy',icon:'🟢',name:'Facile',desc:'Tirs aléatoires.'},{id:'medium',icon:'🟡',name:'Moyen',desc:'Suit ses touches.'},{id:'hard',icon:'🔴',name:'Difficile',desc:'Parité + direction.'}].map(d=>(
          <div key={d.id} className="card hover-glow fade-up" style={{padding:28,cursor:'pointer'}} onClick={()=>startVsAI(d.id)}>
            <div style={{fontSize:36,marginBottom:12}}>{d.icon}</div>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:3,color:'#00d4ff',marginBottom:8}}>{d.name}</div>
            <div style={{fontSize:12,color:'#4a7090'}}>{d.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )

  if (screen===SCREENS.ONLINE_LOBBY) return (
    <div style={{padding:'40px',maxWidth:760,margin:'0 auto',position:'relative',zIndex:1}}>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:32,letterSpacing:5,color:'#00d4ff',marginBottom:8}}>MODE EN LIGNE</div>
      {/* Grid size indicator */}
      <div style={{marginBottom:24,padding:'10px 16px',background:'rgba(0,212,255,.06)',border:'1px solid rgba(0,212,255,.2)',fontFamily:'Share Tech Mono,monospace',fontSize:12,color:'#00d4ff'}}>
        ⚓ VOTRE GRILLE : <strong>{gridSize}×{gridSize}</strong> — {getShipsForSize(gridSize).length} navires
        {playerRole==='guest'&&onlineGridSize!==DEFAULT_GRID_SIZE&&<span style={{color:'#ffd700'}}> (imposée par l'hôte)</span>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="card glow" style={{padding:28}}>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:3,color:'#00d4ff',marginBottom:16}}>CRÉER UNE SALLE</div>
          {roomCode ? (
            <>
              <div style={{background:'#050d1a',border:'1px solid #1a3a5c',padding:20,textAlign:'center',marginBottom:12}}>
                <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:52,letterSpacing:10,color:'#00d4ff',textShadow:'0 0 24px rgba(0,212,255,.4)'}}>{roomCode}</div>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginTop:6}}>CODE DE LA SALLE</div>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#00d4ff',marginTop:4}}>GRILLE {gridSize}×{gridSize}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>
                <span className="dot gold"/>{waitingMsg}
              </div>
            </>
          ) : (
            <>
              <p style={{fontSize:12,color:'#4a7090',marginBottom:12}}>La taille de grille de ta flotte ({gridSize}×{gridSize}) sera partagée avec l'adversaire.</p>
              <button className="btn primary full" onClick={createRoom}>CRÉER UNE SALLE</button>
            </>
          )}
        </div>
        <div className="card glow" style={{padding:28}}>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:3,color:'#00d4ff',marginBottom:16}}>REJOINDRE</div>
          <p style={{fontSize:12,color:'#4a7090',marginBottom:12}}>La taille de grille de l'hôte s'appliquera automatiquement.</p>
          <input value={joinInput} onChange={e=>setJoinInput(e.target.value.toUpperCase())} placeholder="CODE" maxLength={6} onKeyDown={e=>e.key==='Enter'&&joinRoom()}
            style={{width:'100%',textAlign:'center',fontSize:22,letterSpacing:4,background:'#050d1a',border:'1px solid #1a3a5c',color:'#c8e6f0',padding:'12px',fontFamily:'Share Tech Mono,monospace',outline:'none',marginBottom:12}}/>
          <button className="btn primary full" onClick={joinRoom}>REJOINDRE</button>
        </div>
      </div>
    </div>
  )

  if (screen===SCREENS.PLACEMENT) {
    const dispBoard=buildPlacementBoard(), shipMap=buildShipMap(placedShips), curShip=activeShips[shipIdx]
    return (
      <div style={{padding:'28px 36px',maxWidth:1000,margin:'0 auto',position:'relative',zIndex:1}}>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:26,letterSpacing:5,color:'#00d4ff',marginBottom:4}}>{placementTitle}</div>
        <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:24}}>CLIQUEZ POUR PLACER · [R] PIVOTER · {activeShips.length} NAVIRES</div>
        <div style={{display:'flex',gap:28,alignItems:'flex-start',flexWrap:'wrap'}}>
          <div className="card" style={{padding:18,minWidth:210,flexShrink:0}}>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:15,letterSpacing:3,color:'#00d4ff',marginBottom:12,paddingBottom:8,borderBottom:'1px solid #1a3a5c'}}>
              FLOTTE — {gridSize}×{gridSize}
            </div>
            {activeShips.map((s,i)=>{
              const placed=!!placedShips.find(p=>p.id===s.id),active=i===shipIdx&&!placed,st=SHIP_STYLES[s.id]
              return (
                <div key={s.id} onClick={()=>!placed&&setShipIdx(i)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',marginBottom:5,border:active?`1px solid ${st.border}`:'1px solid transparent',background:active?st.bg:'transparent',opacity:placed?.35:1,cursor:placed?'not-allowed':'pointer',transition:'all .15s'}}>
                  <div style={{display:'flex',gap:2}}>{Array(s.size).fill(0).map((_,j)=><div key={j} style={{width:13,height:13,background:st.bg,border:`1px solid ${st.border}`}}/>)}</div>
                  <div>
                    <div style={{fontSize:12,color:placed?'#4a7090':st.color}}>{st.label} {s.name}</div>
                    <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090'}}>{s.size} cases{placed?' ✓':''}</div>
                  </div>
                </div>
              )
            })}
            <div style={{borderTop:'1px solid #1a3a5c',marginTop:10,paddingTop:10,display:'flex',flexDirection:'column',gap:6}}>
              <button className="btn sm" onClick={()=>setOrientation(o=>o==='H'?'V':'H')}>↻ {orientation==='H'?'HORIZONTAL':'VERTICAL'}</button>
              <button className="btn sm" onClick={randomPlacement}>🎲 ALÉATOIRE</button>
              <button className="btn sm danger" onClick={clearPlacement}>✕ RESET</button>
              {savedFleets.filter(f=>f.ships?.length>0).length>0&&<button className="btn sm" onClick={()=>setLoadModal(true)}>📂 CHARGER</button>}
              {allPlaced&&<button className="btn sm" onClick={()=>{setSaveModal(true);setSaveName('')}}>💾 SAUVEGARDER</button>}
            </div>
            <button className="btn primary full" style={{marginTop:10}} disabled={!allPlaced} onClick={confirmPlacement}>✔ CONFIRMER</button>
          </div>
          <div>
            {curShip&&!allPlaced&&<div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:SHIP_STYLES[curShip.id].color,marginBottom:10}}>► {curShip.name.toUpperCase()} — {curShip.size} cases — {orientation==='H'?'HORIZONTAL':'VERTICAL'}</div>}
            <Grid board={dispBoard} gridSize={gridSize} shipMap={shipMap} onCellClick={onPlacementClick} onCellHover={onPlacementHover} onCellLeave={()=>setHoverBoard(null)} interactive={!allPlaced} cellSize={cellSize}/>
          </div>
        </div>
        {saveModal&&(
          <ModalWrap title="SAUVEGARDER LA FLOTTE" onClose={()=>setSaveModal(false)}>
            <div className="field"><label>Nom</label><input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="ex: Flotte Rapide 8×8" maxLength={30} autoFocus/></div>
            <button className="btn primary full" onClick={saveCurrentFleet}>SAUVEGARDER</button>
          </ModalWrap>
        )}
        {loadModal&&(
          <ModalWrap title="CHARGER UNE FLOTTE" onClose={()=>setLoadModal(false)}>
            {savedFleets.filter(f=>f.ships?.length>0).length===0
              ? <p style={{fontSize:12,color:'#4a7090'}}>Aucune flotte avec placement sauvegardé</p>
              : savedFleets.filter(f=>f.ships?.length>0).map(f=>(
                <div key={f.id} className="card hover-glow" style={{padding:'12px 16px',marginBottom:8,cursor:'pointer'}} onClick={()=>loadFleet(f)}>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:15,letterSpacing:2}}>{f.name}</div>
                  <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090'}}>{f.ships.length} navires · {f.gridSize||10}×{f.gridSize||10}</div>
                </div>
              ))}
          </ModalWrap>
        )}
      </div>
    )
  }

  if (screen===SCREENS.LOCAL_SWITCH) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'calc(100vh - 60px)',position:'relative',zIndex:1}}>
      <div className="fade-up" style={{textAlign:'center',padding:40}}>
        <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',letterSpacing:3,marginBottom:12}}>PASSEZ L'APPAREIL À</div>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'clamp(48px,12vw,88px)',letterSpacing:8,color:'#00d4ff',textShadow:'0 0 40px rgba(0,212,255,.4)',marginBottom:24}}>{switchName}</div>
        <p style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:32}}>L'autre joueur ne doit pas voir l'écran</p>
        <button className="btn primary lg" onClick={resumeSwitch}>JE SUIS PRÊT ▶</button>
      </div>
    </div>
  )

  if (screen===SCREENS.BATTLE) {
    const myShipMap=buildShipMap(myShips)
    const logColors={hit:'#ff6600',sunk:'#ff3333',miss:'#2a5070','':`#7aaabb`}
    const g = battleGridSize // use locked battle grid size
    const safeEnemyBoard=enemyBoard?enemyBoard.map(row=>row.map(v=>v==='ship'?null:v)):null
    const activeTheme = SEA_THEMES[equippedTheme] || SEA_THEMES.default
    const activeSkin  = SHIP_SKINS[equippedSkin]  || SHIP_SKINS.default
    return (
      <div style={{padding:'20px 28px',maxWidth:1100,margin:'0 auto',position:'relative',zIndex:1}}>
        {/* Event banner */}
        {activeEvent && EVENT_TYPES[activeEvent.eventType] && (
          <div style={{marginBottom:10,padding:'8px 18px',background:`${EVENT_TYPES[activeEvent.eventType].color}15`,border:`1px solid ${EVENT_TYPES[activeEvent.eventType].color}55`,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:20}}>{EVENT_TYPES[activeEvent.eventType].icon}</span>
            <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:3,color:EVENT_TYPES[activeEvent.eventType].color}}>ÉVÉNEMENT : {activeEvent.title||EVENT_TYPES[activeEvent.eventType].name}</span>
            <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginLeft:8}}>{EVENT_TYPES[activeEvent.eventType].desc}</span>
            {speedTimer!==null&&<span style={{marginLeft:'auto',fontFamily:'Bebas Neue,sans-serif',fontSize:24,color:speedTimer<=3?'#ff3a3a':'#ffd700',letterSpacing:2}}>⏱ {speedTimer}s</span>}
          </div>
        )}

        <div className="card" style={{padding:'12px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <span className={isMyTurn?'dot gold':'dot dim'}/>
          <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:3,color:isMyTurn?'#ffd700':'#4a7090'}}>
            {isMyTurn?'⚔ TON TOUR — TIRE !':'⏳ TOUR DE '+enemyName.toUpperCase()}
          </span>
          {doubleShot&&isMyTurn&&<span style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#ffd700',border:'1px solid rgba(255,215,0,.4)',padding:'2px 8px'}}>⚡ DOUBLE TIR</span>}
          <span style={{marginLeft:'auto',fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>Tirs: {shots}</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:16}}>
          <div className="card" style={{padding:18}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <span className={isMyTurn?'dot red':'dot dim'}/>
              <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:15,letterSpacing:3}}>MER ENNEMIE — {enemyName.toUpperCase()}</span>
            </div>
            <Grid board={safeEnemyBoard} gridSize={g} onCellClick={onAttack} interactive={isMyTurn} cellSize={cellSize} eventType={activeEvent?.eventType} discTick={discoTick} fogCells={fogCells} mirrored={activeEvent?.eventType==='miroir'} theme={activeTheme}/>
          </div>
          <div className="card" style={{padding:18}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <span className="dot green"/>
              <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:15,letterSpacing:3}}>MA FLOTTE — {myName.toUpperCase()}</span>
            </div>
            <Grid board={myBoard} gridSize={g} shipMap={myShipMap} cellSize={cellSize} eventType={activeEvent?.eventType} discTick={discoTick} theme={activeTheme} shipSkin={activeSkin}/>
            <ShipLegend ships={myShips}/>
          </div>
        </div>
        <div className="card" style={{padding:12}}>
          <div ref={el=>{if(el)el.scrollTop=el.scrollHeight}} style={{height:100,overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>
            {battleLog.length===0
              ? <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#1a3a5c'}}>En attente du premier tir...</span>
              : battleLog.map(l=><div key={l.id} style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:logColors[l.type]||'#7aaabb'}}>› {l.msg}</div>)
            }
          </div>
        </div>
      </div>
    )
  }

  if (screen===SCREENS.WIN) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'calc(100vh - 60px)',position:'relative',zIndex:1}}>
      <div className="fade-up" style={{textAlign:'center',padding:40,maxWidth:500}}>
        <div style={{fontSize:80,marginBottom:20}}>{winData?.won?'🏆':'💀'}</div>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'clamp(48px,10vw,80px)',letterSpacing:6,color:winData?.won?'#ffd700':'#ff3a3a',textShadow:winData?.won?'0 0 40px rgba(255,215,0,.35)':'0 0 30px rgba(255,58,58,.3)',marginBottom:12}}>
          {winData?.won?'VICTOIRE !':'DÉFAITE...'}
        </div>
        <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:13,color:'#4a7090',marginBottom:36}}>
          {winData?.won?'Flotte ennemie détruite en '+winData.shots+' tirs !':'Votre flotte a été anéantie...'}
        </div>
        <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
          <button className="btn primary lg" onClick={resetGame}>↺ REJOUER</button>
          <button className="btn lg" onClick={()=>navigate('/dashboard')}>⬅ ACCUEIL</button>
        </div>
      </div>
    </div>
  )

  return null
}
