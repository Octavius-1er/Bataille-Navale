// src/pages/LearnPage.jsx
// Mode classe projeté — utilise le jeu sélectionné dans LearnGamesPage
// La carte montre : ligne + colonne + contenu de la case
// Le prof valide oralement, puis le tir part ou le tour est perdu

import React, { useState, useEffect, useRef } from 'react'
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

// ── Couleurs par équipe (OVA + local) ────────────────────────────
const OVA_TEAM_COLORS = [
  { color:'#00d4ff', bg:'rgba(0,212,255,.18)', border:'#00d4ff', miss:'#003a55', hit:'#004466', label:'CYAN'   },
  { color:'#ff6600', bg:'rgba(255,102,0,.18)', border:'#ff6600', miss:'#3a1500', hit:'#551e00', label:'ORANGE' },
  { color:'#00ff88', bg:'rgba(0,255,136,.18)', border:'#00ff88', miss:'#003322', hit:'#004433', label:'VERT'   },
  { color:'#ff44aa', bg:'rgba(255,68,170,.18)',border:'#ff44aa', miss:'#3a0022', hit:'#550033', label:'ROSE'   },
  { color:'#ffd700', bg:'rgba(255,215,0,.18)', border:'#ffd700', miss:'#332e00', hit:'#554b00', label:'OR'     },
  { color:'#aa44ff', bg:'rgba(170,68,255,.18)',border:'#aa44ff', miss:'#220044', hit:'#330066', label:'VIOLET' },
]
const LOCAL_TEAM_COLORS = [
  { color:'#00d4ff', bg:'rgba(0,212,255,.18)', border:'#00d4ff', miss:'#003a55', hit:'#004466' },
  { color:'#ff6600', bg:'rgba(255,102,0,.18)', border:'#ff6600', miss:'#3a1500', hit:'#551e00' },
]

// ── Bateaux stylés SVG ────────────────────────────────────────────
const SHIP_SVG = {
  carrier: (c='#66aaee') => (
    <svg width="100%" height="100%" viewBox="0 0 56 24" xmlns="http://www.w3.org/2000/svg">
      {/* Hull */}
      <path d="M3 19 L8 10 L48 10 L53 19 Z" fill={c+'22'} stroke={c} strokeWidth="1.2"/>
      {/* Waterline */}
      <line x1="3" y1="19" x2="53" y2="19" stroke={c} strokeWidth="0.6" opacity="0.5"/>
      {/* Superstructure */}
      <rect x="14" y="6" width="22" height="8" rx="1" fill={c+'1a'} stroke={c} strokeWidth="0.9"/>
      {/* Bridge */}
      <rect x="22" y="2" width="8" height="6" rx="1" fill={c+'2a'} stroke={c} strokeWidth="0.8"/>
      {/* Mast */}
      <line x1="26" y1="0" x2="26" y2="3" stroke={c} strokeWidth="1.2"/>
      <line x1="23" y1="1" x2="29" y2="1" stroke={c} strokeWidth="0.7"/>
      {/* Radar */}
      <circle cx="26" cy="0.5" r="1" fill={c} opacity="0.8"/>
      {/* Deck details */}
      <rect x="8" y="13" width="6" height="4" rx="0.5" fill={c+'22'} stroke={c} strokeWidth="0.5"/>
      <rect x="40" y="13" width="6" height="4" rx="0.5" fill={c+'22'} stroke={c} strokeWidth="0.5"/>
      {/* Turrets */}
      <ellipse cx="14" cy="12" rx="3" ry="2" fill={c+'33'} stroke={c} strokeWidth="0.7"/>
      <ellipse cx="36" cy="12" rx="3" ry="2" fill={c+'33'} stroke={c} strokeWidth="0.7"/>
      {/* Portholes */}
      <circle cx="18" cy="16" r="1" fill={c+'44'} stroke={c} strokeWidth="0.4"/>
      <circle cx="24" cy="16" r="1" fill={c+'44'} stroke={c} strokeWidth="0.4"/>
      <circle cx="30" cy="16" r="1" fill={c+'44'} stroke={c} strokeWidth="0.4"/>
      <circle cx="36" cy="16" r="1" fill={c+'44'} stroke={c} strokeWidth="0.4"/>
    </svg>
  ),
  battleship: (c='#aa77ee') => (
    <svg width="100%" height="100%" viewBox="0 0 48 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 19 L9 10 L39 10 L45 19 Z" fill={c+'22'} stroke={c} strokeWidth="1.2"/>
      <line x1="3" y1="19" x2="45" y2="19" stroke={c} strokeWidth="0.6" opacity="0.5"/>
      <rect x="13" y="6" width="18" height="8" rx="1" fill={c+'1a'} stroke={c} strokeWidth="0.9"/>
      <rect x="18" y="2" width="8" height="6" rx="1" fill={c+'2a'} stroke={c} strokeWidth="0.8"/>
      <line x1="22" y1="0" x2="22" y2="3" stroke={c} strokeWidth="1.2"/>
      {/* Big gun turrets front & back */}
      <rect x="5" y="12" width="8" height="5" rx="1" fill={c+'22'} stroke={c} strokeWidth="0.7"/>
      <line x1="7" y1="13.5" x2="3" y2="11" stroke={c} strokeWidth="1.2"/>
      <line x1="10" y1="13.5" x2="6" y2="11" stroke={c} strokeWidth="1.2"/>
      <rect x="35" y="12" width="8" height="5" rx="1" fill={c+'22'} stroke={c} strokeWidth="0.7"/>
      <line x1="37" y1="13.5" x2="41" y2="11" stroke={c} strokeWidth="1.2"/>
      <line x1="40" y1="13.5" x2="44" y2="11" stroke={c} strokeWidth="1.2"/>
      <circle cx="18" cy="16" r="1" fill={c+'44'} stroke={c} strokeWidth="0.4"/>
      <circle cx="28" cy="16" r="1" fill={c+'44'} stroke={c} strokeWidth="0.4"/>
    </svg>
  ),
  cruiser: (c='#55cc88') => (
    <svg width="100%" height="100%" viewBox="0 0 44 22" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 17 L8 9 L36 9 L41 17 Z" fill={c+'22'} stroke={c} strokeWidth="1.1"/>
      <line x1="3" y1="17" x2="41" y2="17" stroke={c} strokeWidth="0.6" opacity="0.5"/>
      <rect x="12" y="5" width="16" height="7" rx="1" fill={c+'1a'} stroke={c} strokeWidth="0.9"/>
      <rect x="17" y="2" width="7" height="5" rx="1" fill={c+'2a'} stroke={c} strokeWidth="0.8"/>
      <line x1="20" y1="0" x2="20" y2="2" stroke={c} strokeWidth="1.2"/>
      {/* Missile launcher */}
      <rect x="5" y="11" width="6" height="4" rx="0.5" fill={c+'22'} stroke={c} strokeWidth="0.6"/>
      <line x1="6" y1="12" x2="6" y2="9" stroke={c} strokeWidth="0.8"/>
      <line x1="8" y1="12" x2="8" y2="9" stroke={c} strokeWidth="0.8"/>
      <line x1="10" y1="12" x2="10" y2="9" stroke={c} strokeWidth="0.8"/>
      <rect x="33" y="11" width="6" height="4" rx="0.5" fill={c+'22'} stroke={c} strokeWidth="0.6"/>
      <circle cx="16" cy="14" r="1" fill={c+'44'} stroke={c} strokeWidth="0.4"/>
      <circle cx="24" cy="14" r="1" fill={c+'44'} stroke={c} strokeWidth="0.4"/>
    </svg>
  ),
  submarine: (c='#44bb77') => (
    <svg width="100%" height="100%" viewBox="0 0 44 20" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="22" cy="14" rx="19" ry="5.5" fill={c+'1a'} stroke={c} strokeWidth="1.2"/>
      {/* Conning tower */}
      <path d="M17 9 L18 4 L26 4 L27 9 Z" fill={c+'22'} stroke={c} strokeWidth="0.9"/>
      {/* Periscope */}
      <line x1="20" y1="4" x2="20" y2="1" stroke={c} strokeWidth="1"/>
      <line x1="20" y1="1" x2="23" y2="1" stroke={c} strokeWidth="1"/>
      <circle cx="23" cy="1" r="1" fill={c+'88'} stroke={c} strokeWidth="0.6"/>
      {/* Sonar dome */}
      <ellipse cx="38" cy="14" rx="3" ry="3" fill={c+'33'} stroke={c} strokeWidth="0.8"/>
      {/* Propeller */}
      <line x1="4" y1="12" x2="4" y2="16" stroke={c} strokeWidth="1.5"/>
      <line x1="2" y1="14" x2="6" y2="14" stroke={c} strokeWidth="1.5"/>
      {/* Portholes */}
      <circle cx="16" cy="14" r="1.2" fill={c+'33'} stroke={c} strokeWidth="0.5"/>
      <circle cx="22" cy="14" r="1.2" fill={c+'33'} stroke={c} strokeWidth="0.5"/>
      <circle cx="28" cy="14" r="1.2" fill={c+'33'} stroke={c} strokeWidth="0.5"/>
      {/* Fin */}
      <path d="M8 14 L6 19 L10 19" fill={c+'22'} stroke={c} strokeWidth="0.7"/>
    </svg>
  ),
  destroyer: (c='#ee8844') => (
    <svg width="100%" height="100%" viewBox="0 0 40 20" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 17 L8 9 L32 9 L38 17 Z" fill={c+'22'} stroke={c} strokeWidth="1.1"/>
      <line x1="2" y1="17" x2="38" y2="17" stroke={c} strokeWidth="0.6" opacity="0.5"/>
      <rect x="12" y="5" width="14" height="7" rx="1" fill={c+'1a'} stroke={c} strokeWidth="0.9"/>
      <rect x="16" y="2" width="7" height="5" rx="1" fill={c+'2a'} stroke={c} strokeWidth="0.8"/>
      {/* Twin smokestacks */}
      <rect x="20" y="0" width="2.5" height="5" rx="0.5" fill={c+'44'} stroke={c} strokeWidth="0.7"/>
      <rect x="24" y="1" width="2.5" height="4" rx="0.5" fill={c+'44'} stroke={c} strokeWidth="0.7"/>
      {/* Torpedo tubes */}
      <rect x="4" y="12" width="7" height="3.5" rx="0.5" fill={c+'22'} stroke={c} strokeWidth="0.6"/>
      <line x1="5" y1="13.5" x2="11" y2="13.5" stroke={c} strokeWidth="0.5"/>
      <line x1="5" y1="14.5" x2="11" y2="14.5" stroke={c} strokeWidth="0.5"/>
      <rect x="29" y="12" width="7" height="3.5" rx="0.5" fill={c+'22'} stroke={c} strokeWidth="0.6"/>
    </svg>
  ),
  patrol: (c='#cc88cc') => (
    <svg width="100%" height="100%" viewBox="0 0 36 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 15 L7 8 L29 8 L34 15 Z" fill={c+'22'} stroke={c} strokeWidth="1"}/>
      <line x1="2" y1="15" x2="34" y2="15" stroke={c} strokeWidth="0.6" opacity="0.5"/>
      <rect x="11" y="4" width="13" height="7" rx="1" fill={c+'1a'} stroke={c} strokeWidth="0.9"/>
      <line x1="17" y1="1" x2="17" y2="4" stroke={c} strokeWidth="1.2"/>
      <line x1="14" y1="2" x2="20" y2="2" stroke={c} strokeWidth="0.7"/>
      {/* Machine gun */}
      <rect x="5" y="10" width="5" height="3" rx="0.5" fill={c+'22'} stroke={c} strokeWidth="0.6"/>
      <line x1="6" y1="11.5" x2="4" y2="9.5" stroke={c} strokeWidth="1"/>
      {/* Wake lines */}
      <path d="M2 16 Q5 14 8 16" fill="none" stroke={c} strokeWidth="0.5" opacity="0.4"/>
      <path d="M28 16 Q31 14 34 16" fill="none" stroke={c} strokeWidth="0.5" opacity="0.4"/>
    </svg>
  ),
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

// ── Grid — fully responsive, mobile-first ────────────────────────
function LearnGrid({ board, game, shipMap = {}, onCellClick, onCellHover, onCellLeave, interactive = false, hideShips = false, theme = null, shipSkin = null, ovaColorMap = false }) {
  const NR = game.rows.length
  const NC = game.cols.length

  // Responsive cell sizing using CSS container approach
  const [cellW, setCellW] = React.useState(52)
  const [cellH, setCellH] = React.useState(44)
  const [labelW, setLabelW] = React.useState(70)
  const containerRef = React.useRef(null)

  React.useEffect(() => {
    function resize() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const isMobile = vw < 640
      const lw = isMobile ? 58 : 88
      const availW = Math.min(vw, 900) - lw - (isMobile ? 24 : 80)
      const cw = Math.max(isMobile ? 38 : 52, Math.min(isMobile ? 70 : 110, Math.floor(availW / NC)))
      const ch = Math.max(isMobile ? 36 : 44, Math.min(isMobile ? 60 : 80, Math.floor((vh - (isMobile ? 260 : 320)) / NR)))
      setCellW(cw); setCellH(ch); setLabelW(lw)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [NC, NR])

  return (
    <div ref={containerRef} style={{ userSelect:'none', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
      {/* Column headers */}
      <div style={{ display:'flex', marginLeft: labelW + 2 }}>
        {game.cols.map((v, c) => (
          <div key={c} style={{ width:cellW, textAlign:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:Math.max(9, cellW > 55 ? 12 : 9), letterSpacing:0.5, color:'#55cc88', lineHeight:'22px', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', padding:'0 2px' }}>{v}</div>
        ))}
      </div>
      {/* Rows */}
      {game.rows.map((rowLabel, r) => (
        <div key={r} style={{ display:'flex', alignItems:'center' }}>
          <div style={{ width:labelW, textAlign:'right', paddingRight:6, fontFamily:'Bebas Neue,sans-serif', fontSize:Math.max(9, labelW > 70 ? 12 : 10), letterSpacing:0.5, color:'#66aaee', flexShrink:0, lineHeight:cellH+'px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
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

              // Ship cell — show styled SVG
              if (shipId && (v==='ship'||v===null)) {
                const sc = skinSt || st
                bg = sc ? sc.bg : '#050d1a'
                bc = sc ? sc.border : '#0c1e30'
                const svgColor = sc ? sc.color : '#66aaee'
                const svgFn = SHIP_SVG[shipId] || SHIP_SVG.patrol
                content = <div style={{width:'100%',height:'100%',padding:2,boxSizing:'border-box'}}>{svgFn(svgColor)}</div>
              }

              if (v==='preview-valid')   { bg='rgba(0,212,255,.2)'; bc='#00d4ff'; content=null }
              if (v==='preview-invalid') { bg='rgba(255,58,58,.2)'; bc='#ff3a3a'; content=null }

              // OVA colored: 'hit-N', 'miss-N', 'sunk-N'
              const ovaMatch = v && ovaColorMap && v.match(/^(miss|hit|sunk)-(\d+)$/)
              if (ovaMatch) {
                const [, type, idx] = ovaMatch
                const oc = OVA_TEAM_COLORS[parseInt(idx) % OVA_TEAM_COLORS.length]
                if (type==='miss') { bg=oc.miss; bc=oc.border; content=<span style={{color:oc.color,fontSize:cellH>45?20:14,lineHeight:1}}>·</span> }
                if (type==='hit')  { bg=oc.hit;  bc=oc.border; content=<span style={{color:oc.color,fontSize:cellH>45?15:11,fontWeight:'bold'}}>✕</span> }
                if (type==='sunk') { bg='#2e0000'; bc='#880000'; content=<span style={{color:'#ff3333',fontSize:cellH>45?15:11}}>✕</span> }
              } else if (v) {
                const localMatch = v.match(/^(miss|hit|sunk)-(t[12])$/)
                if (localMatch) {
                  const [, type, team] = localMatch
                  const lc = team==='t1' ? LOCAL_TEAM_COLORS[0] : LOCAL_TEAM_COLORS[1]
                  if (type==='miss') { bg=lc.miss; bc=lc.border; content=<span style={{color:lc.color,fontSize:cellH>45?20:14,lineHeight:1}}>·</span> }
                  if (type==='hit')  { bg=lc.hit;  bc=lc.border; content=<span style={{color:lc.color,fontSize:cellH>45?15:11,fontWeight:'bold'}}>✕</span> }
                  if (type==='sunk') { bg='#2e0000'; bc='#880000'; content=<span style={{color:'#ff3333',fontSize:cellH>45?15:11}}>✕</span> }
                } else {
                  if (v==='miss')  { bg=th.missBg||'#0a2a4a'; bc=th.cellBorder||'#1a5a8a'; content=<span style={{color:'#4a9abb',fontSize:cellH>45?20:14,lineHeight:1}}>·</span> }
                  if (v==='hit')   { bg=th.hitBg||'#4a1800'; bc='#cc5500'; content=<span style={{color:'#ff6600',fontSize:cellH>45?15:11}}>✕</span> }
                  if (v==='sunk')  { bg='#2e0000'; bc='#880000'; content=<span style={{color:'#ff3333',fontSize:cellH>45?15:11}}>✕</span> }
                }
              }

              const hint = (!v && !shipId && interactive)
                ? <span style={{fontSize:7,color:'#1a3a5c',fontFamily:'Share Tech Mono,monospace',textAlign:'center',padding:'0 1px',lineHeight:1.2}}>
                    {colLabel.substring(0,5)}<br/>{rowLabel.substring(0,5)}
                  </span>
                : null

              return (
                <div key={c}
                  onClick={()=>interactive&&onCellClick?.(r,c)}
                  onMouseEnter={()=>interactive&&onCellHover?.(r,c)}
                  onMouseLeave={()=>interactive&&onCellLeave?.()}
                  onTouchEnd={(e)=>{ if(interactive&&onCellClick){ e.preventDefault(); onCellClick(r,c) } }}
                  style={{ width:cellW, height:cellH, background:bg, border:`2px solid ${bc}`, cursor:interactive?'crosshair':'default', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .1s', flexShrink:0, overflow:'hidden', position:'relative', touchAction:'manipulation' }}
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
    if (mode==='one-vs-all') {
      if (result==='sunk') sunkShip.cells.forEach(sc=>{newBoard[sc.r][sc.c]=`sunk-${ovaAttackerIdx}`})
      else newBoard[r][c]=`${result}-${ovaAttackerIdx}`
      attackBoard1Ref.current=newBoard
    } else if (mode==='local') {
      const tag = currentTeam===1 ? 't1' : 't2'
      if (result==='sunk') sunkShip.cells.forEach(sc=>{newBoard[sc.r][sc.c]=`sunk-${tag}`})
      else newBoard[r][c]=`${result}-${tag}`
      if (currentTeam===1) attackBoard1Ref.current=newBoard
      else attackBoard2Ref.current=newBoard
    } else {
      if (result==='sunk') sunkShip.cells.forEach(sc=>{newBoard[sc.r][sc.c]='sunk'})
      else newBoard[r][c]=result
      if (currentTeam===1) attackBoard1Ref.current=newBoard
      else attackBoard2Ref.current=newBoard
    }
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
    const isMobile  = typeof window !== 'undefined' && window.innerWidth < 640
    return (
      <div style={{padding: isMobile ? '12px' : '20px 24px', maxWidth:1200, margin:'0 auto', position:'relative', zIndex:1}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize: isMobile ? 17 : 22,letterSpacing:3,color:'#00d4ff'}}>
            PLACEMENT — {(mode==='one-vs-all'?defenderName:placingTeam===1?team1:team2).toUpperCase()}
          </div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090'}}>
            {isMobile ? 'TAP · BOUTON ↻' : 'CLIC · [R] PIVOTER'}
          </div>
        </div>

        {/* Mobile: stack grid on top, palette below — Desktop: side by side */}
        <div style={{display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : undefined, gridTemplateColumns: isMobile ? undefined : '180px 1fr', gap:12, alignItems:'start'}}>

          {/* On desktop: palette LEFT — on mobile: palette BOTTOM */}
          {!isMobile && (
            <div className="card" style={{padding:14}}>
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:13,letterSpacing:3,color:'#00d4ff',marginBottom:10,paddingBottom:8,borderBottom:'1px solid #1a3a5c'}}>FLOTTE</div>
              {gameShips.map((s,i)=>{
                const p=!!placed.find(p=>p.id===s.id), a=i===shipIdx&&!p, st=SHIP_STYLES[s.id]||SHIP_STYLES.patrol
                return (
                  <div key={s.id} onClick={()=>!p&&setShipIdx(i)}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'7px 8px',marginBottom:4,border:a?`1px solid ${st.border}`:'1px solid transparent',background:a?st.bg:'transparent',opacity:p?.35:1,cursor:p?'not-allowed':'pointer',transition:'all .15s'}}>
                    <div style={{width:40,height:24,flexShrink:0}}>{(SHIP_SVG[s.id]||SHIP_SVG.patrol)(st.color)}</div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:11,color:p?'#4a7090':st.color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{st.label} {s.name}</div>
                      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090'}}>{s.size} cases{p?' ✓':''}</div>
                    </div>
                  </div>
                )
              })}
              <div style={{borderTop:'1px solid #1a3a5c',marginTop:8,paddingTop:8,display:'flex',flexDirection:'column',gap:5}}>
                <button className="btn sm" onClick={()=>setOrientation(o=>o==='H'?'V':'H')}>↻ {orientation==='H'?'H':'V'}</button>
                <button className="btn sm" onClick={()=>{setPlaced(placeShipsRandomly(NR,NC,gameShips));setShipIdx(gameShips.length);setHoverBoard(null)}}>🎲 AUTO</button>
                <button className="btn sm danger" onClick={()=>{setPlaced([]);setShipIdx(0);setHoverBoard(null)}}>✕ RESET</button>
              </div>
              <button className="btn primary full" style={{marginTop:8}} disabled={!allPlaced} onClick={confirmPlacement}>✔ OK</button>
            </div>
          )}

          {/* Grid */}
          <div>
            {curShip&&!allPlaced&&(
              <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:(SHIP_STYLES[curShip.id]||SHIP_STYLES.patrol).color,marginBottom:8,letterSpacing:1}}>
                ► {curShip.name.toUpperCase()} — {curShip.size} cases — {orientation==='H'?'HORIZONTAL':'VERTICAL'}
              </div>
            )}
            <LearnGrid board={dispBoard} game={game} shipMap={shipMap} onCellClick={onClick} onCellHover={onHover} onCellLeave={()=>setHoverBoard(null)} interactive={!allPlaced} theme={SEA_THEMES[equippedTheme]||SEA_THEMES.default} shipSkin={SHIP_SKINS[equippedSkin]||SHIP_SKINS.default}/>
          </div>

          {/* Mobile: palette below grid */}
          {isMobile && (
            <div className="card" style={{padding:12,marginTop:8}}>
              {/* Ship selector as horizontal scroll row */}
              <div style={{display:'flex',gap:8,overflowX:'auto',WebkitOverflowScrolling:'touch',paddingBottom:8,marginBottom:8,borderBottom:'1px solid #1a3a5c'}}>
                {gameShips.map((s,i)=>{
                  const p=!!placed.find(p=>p.id===s.id), a=i===shipIdx&&!p, st=SHIP_STYLES[s.id]||SHIP_STYLES.patrol
                  return (
                    <div key={s.id} onClick={()=>!p&&setShipIdx(i)}
                      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'8px 10px',flexShrink:0,border:a?`1px solid ${st.border}`:'1px solid #1a3a5c',background:a?st.bg:'transparent',opacity:p?.4:1,cursor:p?'not-allowed':'pointer',minWidth:64,borderRadius:4}}>
                      <div style={{width:44,height:24}}>{(SHIP_SVG[s.id]||SHIP_SVG.patrol)(p?'#4a7090':st.color)}</div>
                      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:8,color:p?'#4a7090':st.color,textAlign:'center',whiteSpace:'nowrap'}}>{p?'✓':s.name}</div>
                    </div>
                  )
                })}
              </div>
              {/* Actions row */}
              <div style={{display:'flex',gap:8}}>
                <button className="btn sm" style={{flex:1,fontSize:11}} onClick={()=>setOrientation(o=>o==='H'?'V':'H')}>↻ {orientation}</button>
                <button className="btn sm" style={{flex:1,fontSize:11}} onClick={()=>{setPlaced(placeShipsRandomly(NR,NC,gameShips));setShipIdx(gameShips.length);setHoverBoard(null)}}>🎲 AUTO</button>
                <button className="btn sm danger" style={{fontSize:11}} onClick={()=>{setPlaced([]);setShipIdx(0);setHoverBoard(null)}}>✕</button>
                <button className="btn primary sm" style={{flex:2,fontSize:11}} disabled={!allPlaced} onClick={confirmPlacement}>✔ OK</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (screen===S.BATTLE) {
    const isOVA   = mode==='one-vs-all'
    const isVsAI  = mode==='vs-ai'
    const isLocal = mode==='local'
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    const ovaColor   = isOVA   ? OVA_TEAM_COLORS[ovaAttackerIdx % OVA_TEAM_COLORS.length] : null
    const localColor = isLocal ? LOCAL_TEAM_COLORS[currentTeam===1 ? 0 : 1] : null
    const accentColor = isOVA ? ovaColor.color : isLocal ? localColor.color : '#ffd700'
    const tname  = isOVA ? attackerNames[ovaAttackerIdx] : (currentTeam===1?team1:(isVsAI?'Classe':team2))
    const ename  = isOVA ? defenderName : (currentTeam===1?(isVsAI?'IA':team2):team1)
    return (
      <div style={{padding: isMobile ? '8px' : '20px 32px',maxWidth:1100,margin:'0 auto',position:'relative',zIndex:1}}>
        {/* Status bar */}
        <div className="card" style={{padding: isMobile ? '10px 12px' : '14px 20px',marginBottom:10,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <span className="dot" style={{background:accentColor}}/>
          <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize: isMobile ? 15 : 22,letterSpacing: isMobile ? 2 : 4,color:accentColor}}>
            {isOVA ? '🎯' : '⚔'} {tname.toUpperCase()}
          </span>
          {isOVA && (
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {attackerNames.map((n,i)=>{
                const oc = OVA_TEAM_COLORS[i % OVA_TEAM_COLORS.length]
                return (
                  <span key={i} style={{fontFamily:'Share Tech Mono,monospace',fontSize: isMobile ? 9 : 10,padding:'2px 6px',
                    border:`1px solid ${i===ovaAttackerIdx?oc.border:'#1a3a5c'}`,
                    color:i===ovaAttackerIdx?oc.color:'#4a7090',
                    background:i===ovaAttackerIdx?oc.bg:'transparent'}}>
                    {i===ovaAttackerIdx?'▶ ':''}{n}
                  </span>
                )
              })}
            </div>
          )}
          <div style={{marginLeft:'auto',display:'flex',gap: isMobile ? 8 : 16,alignItems:'center'}}>
            {isOVA ? (
              <span style={{fontFamily:'Share Tech Mono,monospace',fontSize: isMobile ? 9 : 11,color:'#4a7090'}}>
                🛡 {defenderName} — {team1ShipsRef.current.filter(s=>!s.sunk).length} restant(s)
              </span>
            ) : (<>
              <span style={{fontFamily:'Share Tech Mono,monospace',fontSize: isMobile ? 9 : 11,color:LOCAL_TEAM_COLORS[0].color}}>{isMobile ? shots[0]+'✦' : `${team1}: ${shots[0]} tir${shots[0]!==1?'s':''}`}</span>
              <span style={{fontFamily:'Share Tech Mono,monospace',fontSize: isMobile ? 9 : 11,color:isVsAI?'#4a7090':LOCAL_TEAM_COLORS[1].color}}>{isMobile ? shots[1]+'✦' : `${isVsAI?'IA':team2}: ${shots[1]} tir${shots[1]!==1?'s':''}`}</span>
            </>)}
          </div>
        </div>

        {/* Boards */}
        <div style={{display:'grid',gridTemplateColumns:isVsAI&&!isMobile?'1fr 1fr':'1fr',gap:10,marginBottom:10}}>
          <div className="card" style={{padding: isMobile ? 10 : 20}}>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize: isMobile ? 12 : 15,letterSpacing:2,color:'#ff3a3a',marginBottom:isOVA?6:10,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              <span className="dot red"/>MER {isOVA?'DU DÉFENSEUR':'ENNEMIE'} — {ename.toUpperCase()}
            </div>
            {isOVA && (
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                {attackerNames.map((n,i) => {
                  const oc = OVA_TEAM_COLORS[i % OVA_TEAM_COLORS.length]
                  return <span key={i} style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,padding:'2px 6px',border:`1px solid ${oc.border}`,color:oc.color,background:i===ovaAttackerIdx?oc.bg:'transparent'}}>{i===ovaAttackerIdx?'▶ ':''}{n}</span>
                })}
              </div>
            )}
            <LearnGrid board={displayBoard} game={game} onCellClick={onCellClick} interactive={true} hideShips={true} theme={SEA_THEMES[equippedTheme]||SEA_THEMES.default} ovaColorMap={isOVA||isLocal}/>
          </div>
          {isVsAI && !isMobile && (
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
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    const formColor = isLatin
      ? (form==='positive'?'#00d4ff':form==='negative'?'#aa44ff':'#ffd700')
      : (form==='positive'?'#00ff88':form==='negative'?'#ff6666':form?'#ffd700':'#00d4ff')

    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'calc(100vh - 60px)',position:'relative',zIndex:1,padding: isMobile ? '12px 8px' : 20}}>
        <div className="fade-up" style={{maxWidth:620,width:'100%',textAlign:'center'}}>
          <div className="card glow" style={{padding: isMobile ? '24px 16px' : '44px 40px',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${formColor},transparent)`}}/>

            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize: isMobile ? 10 : 12,color:'#4a7090',marginBottom:8,letterSpacing:2}}>{tname.toUpperCase()} — DÉFI ORAL</div>

            {formLabel && (
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize: isMobile ? 18 : 22,letterSpacing:3,color:formColor,marginBottom:4}}>
                {isLatin
                  ? (form==='positive'?'🔵 SINGULIER':form==='negative'?'🟣 PLURIEL':'❓ INTERROGATIF')
                  : (form==='positive'?'➕ AFFIRMATIVE':form==='negative'?'➖ NÉGATIVE':'❓ INTERROGATIF')}
              </div>
            )}
            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize: isMobile ? 10 : 13,color:'#4a7090',marginBottom: isMobile ? 16 : 30,letterSpacing:2}}>
              {isLatin
                ? (formLabel ? 'DIS LA FORME DEMANDÉE' : 'DIS LA PHRASE À VOIX HAUTE')
                : (formLabel ? 'DIS LA PHRASE AU PASSÉ' : 'DIS LA PHRASE À VOIX HAUTE')}
            </div>

            {/* Row + Col + Cell — responsive flex */}
            <div style={{display:'flex',gap: isMobile ? 6 : 10,justifyContent:'center',alignItems:'center',flexWrap:'wrap',marginBottom: isMobile ? 16 : 32}}>
              <div style={{padding: isMobile ? '8px 12px' : '12px 20px',background:'#0e1e2e',border:'1px solid #2a4a6a',fontFamily:'Bebas Neue,sans-serif',fontSize: isMobile ? 18 : 26,letterSpacing:2,color:'#66aaee'}}>{row}</div>
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize: isMobile ? 18 : 24,color:'#4a7090'}}>+</div>
              <div style={{padding: isMobile ? '8px 12px' : '12px 20px',background:'#0e2a1a',border:'1px solid #339966',fontFamily:'Bebas Neue,sans-serif',fontSize: isMobile ? 18 : 26,letterSpacing:2,color:'#55cc88'}}>{col}</div>
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize: isMobile ? 18 : 24,color:'#4a7090'}}>+</div>
              <div style={{padding: isMobile ? '8px 10px' : '12px 20px',background:'#1a1a0e',border:'1px solid #555522',fontFamily:'Share Tech Mono,monospace',fontSize: isMobile ? 13 : 16,color:'#bbbb55',lineHeight:1.5,maxWidth:200,textAlign:'center'}}>{prompt}</div>
            </div>

            {challengeRevealed && answer && (
              <div style={{background:challengeRevealed==='correct'?'rgba(0,255,136,.08)':'rgba(255,58,58,.08)',border:`1px solid ${challengeRevealed==='correct'?'rgba(0,255,136,.3)':'rgba(255,58,58,.3)'}`,padding: isMobile ? '10px 14px' : '14px 20px',marginBottom:16,animation:'fadeUp .25s ease'}}>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',letterSpacing:2,marginBottom:6}}>BONNE RÉPONSE</div>
                <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize: isMobile ? 16 : 20,letterSpacing:2,color:challengeRevealed==='correct'?'#00ff88':'#ff6666'}}>{answer}</div>
              </div>
            )}
            {(challengeRevealed && !answer) && <div style={{height:4,marginBottom:16}}/>}
            {!challengeRevealed && <div style={{height:4,marginBottom:16}}/>}

            {!challengeRevealed ? (
              <div>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12}}>ÉCOUTEZ L'ÉLÈVE, PUIS VALIDEZ :</div>
                <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                  <button className="btn lg" onClick={()=>setChallengeRevealed('incorrect')}
                    style={{borderColor:'#ff3a3a',color:'#ff3a3a',flex:1,padding: isMobile ? '14px 8px' : '13px 38px',fontSize: isMobile ? 13 : 15}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,58,58,.1)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                    ✕ INCORRECT
                  </button>
                  <button className="btn lg" onClick={()=>setChallengeRevealed('correct')}
                    style={{borderColor:'#00ff88',color:'#00ff88',flex:1,padding: isMobile ? '14px 8px' : '13px 38px',fontSize: isMobile ? 13 : 15}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,255,136,.1)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                    ✓ CORRECT
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn primary lg" style={{width:'100%',fontSize: isMobile ? 13 : 15}} onClick={()=>resolveChallenge(challengeRevealed==='correct')}>
                {challengeRevealed==='correct'?'🎯 TIRER — CONTINUER':'💀 TOUR PERDU — CONTINUER'}
              </button>
            )}
          </div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#2a4a5a',marginTop:10}}>
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
