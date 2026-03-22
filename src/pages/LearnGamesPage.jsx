// src/pages/LearnGamesPage.jsx
// Sélection et création de jeux éducatifs
// Un jeu = un nom + des lignes + des colonnes + des cellules (contenu de chaque case)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_GAME } from '../lib/defaultGame'
import {
  collection, query, where, getDocs, addDoc, deleteDoc,
  doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'


// ── Couleurs par matière ──────────────────────────────────────────
const SUBJECTS = ['Anglais','Allemand','Espagnol','Français','Latin','Histoire','Géographie','Sciences','Maths','Autre']

// ── Bateaux disponibles ───────────────────────────────────────────
const ALL_SHIPS = [
  { id:'carrier',    name:'Porte-avions', size:5, label:'✈', color:'#66aaee' },
  { id:'battleship', name:'Cuirassé',     size:4, label:'⚔', color:'#aa77ee' },
  { id:'cruiser',    name:'Croiseur',     size:3, label:'⛴', color:'#55cc88' },
  { id:'submarine',  name:'Sous-marin',   size:3, label:'◈', color:'#44bb77' },
  { id:'destroyer',  name:'Destroyer',    size:2, label:'⚡', color:'#ee8844' },
  { id:'patrol',     name:'Patrouille',   size:2, label:'🔹', color:'#cc88cc' },
]
const SUBJECT_STYLE = {
  'Anglais':     { bg:'#0e2a1a', border:'#339966', color:'#55cc88' },
  'Allemand':    { bg:'#1a0e2a', border:'#7744bb', color:'#aa77ee' },
  'Espagnol':    { bg:'#2a1a0e', border:'#cc6633', color:'#ee8844' },
  'Français':    { bg:'#0e1a2a', border:'#3377bb', color:'#66aaee' },
  'Histoire':    { bg:'#2a200e', border:'#cc9933', color:'#ffcc55' },
  'Géographie':  { bg:'#0e2a2a', border:'#33aaaa', color:'#55dddd' },
  'Sciences':    { bg:'#1a2a0e', border:'#77aa33', color:'#aadd55' },
  'Latin':       { bg:'#2a1a08', border:'#cc8833', color:'#ffaa44' },
  'Maths':       { bg:'#2a0e0e', border:'#cc3333', color:'#ff6666' },
  'Autre':       { bg:'#1a1a1a', border:'#555555', color:'#aaaaaa' },
}
const ss = s => SUBJECT_STYLE[s] || SUBJECT_STYLE['Autre']

export default function LearnGamesPage() {
  const { user } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  const [myGames,   setMyGames]   = useState(null)
  const [creating,  setCreating]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')

  // Form
  const [name,          setName]          = useState('')
  const [subject,       setSubject]       = useState('Anglais')
  const [forms,         setForms]         = useState(['positive','negative','interrogative'])
  const [selectedShips, setSelectedShips] = useState(['cruiser','destroyer','patrol'])
  const [rows,    setRows]    = useState(['', '', '', '', ''])
  const [cols,    setCols]    = useState(['', '', '', '', '', ''])
  const [cells,   setCells]   = useState([])
  const [step,    setStep]    = useState(1) // 1=info, 2=structure, 3=cells
  const [aiModal,     setAiModal]     = useState(false)
  const [aiPasted,    setAiPasted]    = useState('')
  const [aiImageMode, setAiImageMode] = useState(false) // toggle image vs text mode
  const [aiImage,     setAiImage]     = useState(null)  // base64 image
  const [aiImagePreview, setAiImagePreview] = useState(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiError,     setAiError]     = useState('')

  useEffect(() => { loadGames() }, [user])

  // Rebuild cells when rows/cols count changes
  useEffect(() => {
    setCells(prev =>
      rows.map((_, r) =>
        cols.map((_, c) => prev[r]?.[c] ?? '')
      )
    )
  }, [rows.length, cols.length])

  async function loadGames() {
    if (!user) return
    try {
      const q    = query(collection(db,'learn_games'), where('uid','==',user.uid))
      const snap = await getDocs(q)
      const games = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      // Sort client-side by createdAt descending
      games.sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
      setMyGames(games)
    } catch(e) { console.error('loadGames error:', e); setMyGames([]) }
  }

  async function deleteGame(id, name) {
    if (!confirm(`Supprimer "${name}" ?`)) return
    await deleteDoc(doc(db,'learn_games',id))
    toast('Jeu supprimé','info')
    loadGames()
  }

  function selectGame(game) {
    sessionStorage.setItem('learnGame', JSON.stringify(game))
    navigate('/learn')
  }

  // ── Helpers ─────────────────────────────────────────────────────
  function setRow(i, v) { setRows(r => { const n=[...r]; n[i]=v; return n }) }
  function setCol(i, v) { setCols(c => { const n=[...c]; n[i]=v; return n }) }
  function setCell(r, c, v) {
    setCells(prev => {
      const next = prev.map(row => [...row])
      if (!next[r]) next[r] = []
      next[r][c] = v
      return next
    })
  }

  function addRow()    { if (rows.length < 10) setRows(r => [...r, '']) }
  function removeRow() { if (rows.length > 2)  setRows(r => r.slice(0,-1)) }
  function addCol()    { if (cols.length < 10) setCols(c => [...c, '']) }
  function removeCol() { if (cols.length > 2)  setCols(c => c.slice(0,-1)) }

  const activeRows = rows.filter(r => r.trim())
  const activeCols = cols.filter(c => c.trim())

  // Generate a JSON template to give to an AI
  function generateTemplate() {
    const activeR = rows.filter(r=>r.trim())
    const activeC = cols.filter(c=>c.trim())
    const template = {
      name: name.trim() || 'Mon jeu',
      subject: subject,
      rows: activeR.length ? activeR : ['Ligne 1', 'Ligne 2', 'Ligne 3'],
      cols: activeC.length ? activeC : ['Colonne 1', 'Colonne 2', 'Colonne 3'],
      forms: forms,
      cells: (activeR.length ? activeR : ['Ligne 1','Ligne 2','Ligne 3']).map(r =>
        (activeC.length ? activeC : ['Colonne 1','Colonne 2','Colonne 3']).map(c => ({
          prompt:        `[Défi pour ${r} + ${c}]`,
          positive:      forms.includes('positive')      ? `[Réponse positive pour ${r} + ${c}]`      : '',
          negative:      forms.includes('negative')      ? `[Réponse négative pour ${r} + ${c}]`      : '',
          interrogative: forms.includes('interrogative') ? `[Question pour ${r} + ${c}]` : '',
        }))
      )
    }
    return JSON.stringify(template, null, 2)
  }

  async function analyzeImage() {
    if (!aiImage) { toast('Choisissez une image','error'); return }
    setAiLoading(true)
    setAiError('')
    try {
      const prompt = `Tu es un assistant qui analyse des tableaux de jeu éducatif.
Regarde cette image d'un tableau (Excel, Numbers ou papier).
Extrait le contenu et génère un JSON avec ce format EXACT, sans aucun texte avant ou après :
{
  "name": "Nom du jeu détecté ou déduit",
  "subject": "Matière détectée (Anglais/Français/Maths/etc)",
  "rows": ["ligne1", "ligne2", ...],
  "cols": ["col1", "col2", ...],
  "forms": ["positive"],
  "cells": [
    [{"prompt":"contenu case","positive":"réponse","negative":"","interrogative":""},...]
  ]
}
Règles :
- rows = étiquettes des lignes (ex: pronoms I/You/He...)
- cols = étiquettes des colonnes (ex: verbes Eat/Have...)
- cells[r][c] correspond à row[r] + col[c]
- prompt = ce que l'élève voit
- positive/negative/interrogative = réponses (laisser vide si pas applicable)
Réponds UNIQUEMENT avec le JSON, rien d'autre.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              { type:'image', source:{ type:'base64', media_type:'image/jpeg', data: aiImage } },
              { type:'text', text: prompt }
            ]
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.find(b => b.type==='text')?.text || ''
      // Clean JSON
      const clean = text.replace(/```json|```/g,'').trim()
      setAiPasted(clean)
      toast('Image analysée ! Vérifiez et importez.','success')
    } catch(e) {
      setAiError(`Erreur lors de l'analyse : ` + e.message)
      toast("Erreur analyse",'error')
    }
    setAiLoading(false)
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target.result
      setAiImagePreview(result)
      // Extract base64 data only
      setAiImage(result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  function importFromAI() {
    try {
      const data = JSON.parse(aiPasted)
      if (data.name)    setName(data.name)
      if (data.subject) setSubject(data.subject)
      if (data.forms)   setForms(data.forms)
      if (data.rows)    setRows(data.rows.concat(Array(Math.max(0,5-data.rows.length)).fill('')))
      if (data.cols)    setCols(data.cols.concat(Array(Math.max(0,6-data.cols.length)).fill('')))
      if (data.cells) {
        const newCells = data.rows.map((_, r) =>
          data.cols.map((_, c) => data.cells[r]?.[c] || '')
        )
        setCells(newCells)
        setStep(3)
      }
      setAiModal(false)
      setAiPasted('')
      toast("Jeu importé depuis l'IA !", 'success')
    } catch(e) {
      toast('JSON invalide — vérifiez le format', 'error')
    }
  }

  async function saveGame() {
    if (!name.trim())           { toast('Entrez un nom','error'); return }
    if (activeRows.length < 2)  { toast('Minimum 2 lignes non vides','error'); return }
    if (activeCols.length < 2)  { toast('Minimum 2 colonnes non vides','error'); return }

    // Keep only filled rows/cols
    const rowIdx = rows.map((r,i) => r.trim() ? i : null).filter(i => i !== null)
    const colIdx = cols.map((c,i) => c.trim() ? i : null).filter(i => i !== null)
    const trimmedCells = rowIdx.map(r => colIdx.map(c => cells[r]?.[c] || ''))

    // Firestore does not support nested arrays — flatten to 1D with separator
    // Format: "r,c:prompt|positive|negative|interrogative"
    const flatCells = trimmedCells.flatMap((row, r) =>
      row.map((cell, c) => {
        // cell can be: string, {prompt,positive,negative,interrogative}, or {prompt,answers:{...}}
        const isObj = cell && typeof cell === 'object'
        return {
          r, c,
          prompt:        isObj ? (cell.prompt || '') : (cell || ''),
          positive:      isObj ? (cell.positive || cell.answers?.positive || '') : '',
          negative:      isObj ? (cell.negative || cell.answers?.negative || '') : '',
          interrogative: isObj ? (cell.interrogative || cell.answers?.interrogative || '') : '',
        }
      })
    )

    setSaving(true)
    try {
      await addDoc(collection(db,'learn_games'), {
        uid: user.uid, name: name.trim(), subject,
        rows: activeRows, cols: activeCols,
        cells: flatCells,
        numRows: activeRows.length,
        numCols: activeCols.length,
        forms: forms.length > 0 ? forms : ['positive'],
        ships: selectedShips,
        createdAt: serverTimestamp(),
      })
      toast(`Jeu "${name}" créé !`,'success')
      setCreating(false); setStep(1)
      setName(''); setSubject('Anglais')
      setForms(['positive','negative','interrogative']); setSelectedShips(['cruiser','destroyer','patrol'])
      setRows(['','','','','']); setCols(['','','','','','']); setCells([])
      loadGames()
    } catch(e) { toast('Erreur: '+e.message,'error') }
    finally { setSaving(false) }
  }

  const allGames = [DEFAULT_GAME, ...(myGames||[])]
  const filtered = allGames.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.subject||'').toLowerCase().includes(search.toLowerCase())
  )

  // ── Input style shorthand ─────────────────────────────────────
  const inp = (extra={}) => ({
    background:'#050d1a', border:'1px solid #1a3a5c', color:'#c8e6f0',
    padding:'9px 12px', fontFamily:'Share Tech Mono,monospace', fontSize:12,
    outline:'none', width:'100%', ...extra,
  })

  // ══════════════════════════════════════════════════════════════
  // CREATION FORM
  // ══════════════════════════════════════════════════════════════
  if (creating) return (
    <div style={{ padding:'32px 40px', maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28, flexWrap:'wrap' }}>
        <button className="btn sm" onClick={() => { setCreating(false); setStep(1) }}>⬅ RETOUR</button>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:26, letterSpacing:5, color:'#00d4ff' }}>CRÉER UN JEU</div>
        {/* Steps */}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {['INFOS','STRUCTURE','CONTENU'].map((s,i) => (
            <div key={i} onClick={() => step > i+1 && setStep(i+1)}
              style={{ padding:'4px 14px', fontFamily:'Share Tech Mono,monospace', fontSize:10, letterSpacing:1,
                border:`1px solid ${step===i+1?'#00d4ff':'#1a3a5c'}`,
                background: step===i+1?'rgba(0,212,255,.1)':'transparent',
                color: step===i+1?'#00d4ff':'#4a7090',
                cursor: step>i+1?'pointer':'default' }}>
              {i+1}. {s}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1 — Infos */}
      {step === 1 && (
        <div className="fade-up" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:900 }}>

          {/* Left — Général */}
          <div className="card glow" style={{ padding:28, position:'relative' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#00d4ff,transparent)' }}/>
            <div style={{ fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:3,color:'#00d4ff',marginBottom:20 }}>INFORMATIONS</div>

            <div className="field">
              <label>Nom du jeu</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="ex: Allemand — Verbes" maxLength={60} autoFocus style={inp()} />
            </div>

            <div className="field">
              <label>Matière</label>
              <select value={subject} onChange={e=>setSubject(e.target.value)} style={inp()}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="field" style={{marginBottom:0}}>
              <label>Formes à utiliser</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                {[
                  { key:'positive',      label:'➕ Positif',      color:'#00ff88' },
                  { key:'negative',      label:'➖ Négatif',      color:'#ff6666' },
                  { key:'interrogative', label:'❓ Interrogatif', color:'#ffd700' },
                ].map(({key,label,color}) => {
                  const on = forms.includes(key)
                  return (
                    <div key={key} onClick={()=>setForms(f=>on?f.filter(x=>x!==key):[...f,key])}
                      style={{ padding:'7px 12px', border:`1px solid ${on?color:'#1a3a5c'}`, background:on?`${color}15`:'transparent',
                        color:on?color:'#4a7090', cursor:'pointer', fontFamily:'Share Tech Mono,monospace', fontSize:11,
                        transition:'all .15s' }}>
                      {label}
                    </div>
                  )
                })}
              </div>
              <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090',marginTop:6 }}>
                Détermine les formes que l'élève devra dire à voix haute.
              </div>
            </div>
          </div>

          {/* Right — Ships */}
          <div className="card" style={{ padding:28 }}>
            <div style={{ fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:3,color:'#00d4ff',marginBottom:8 }}>BATEAUX</div>
            <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:16 }}>
              CHOISISSEZ LES BATEAUX UTILISÉS EN JEU
            </div>
            {ALL_SHIPS.map(ship => {
              const on = selectedShips.includes(ship.id)
              return (
                <div key={ship.id} onClick={()=>setSelectedShips(s=>on?s.filter(x=>x!==ship.id):[...s,ship.id])}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', marginBottom:6,
                    border:`1px solid ${on?ship.color:'#1a2a3a'}`,
                    background:on?`${ship.color}10`:'transparent',
                    cursor:'pointer', transition:'all .15s' }}>
                  <span style={{ fontSize:16, color:ship.color }}>{ship.label}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:on?ship.color:'#4a7090' }}>{ship.name}</div>
                    <div style={{ display:'flex', gap:2, marginTop:3 }}>
                      {Array(ship.size).fill(0).map((_,j)=>(
                        <div key={j} style={{ width:10,height:10,background:on?ship.color:'#1a3a5c',transition:'background .15s' }}/>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:10,color:on?ship.color:'#4a7090' }}>
                    {ship.size} cases
                  </div>
                </div>
              )
            })}
            {selectedShips.length === 0 && (
              <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#ff3a3a',marginTop:8 }}>
                ⚠ Sélectionnez au moins 1 bateau
              </div>
            )}
          </div>

          <div style={{ gridColumn:'1/-1' }}>
            <button className="btn primary" onClick={()=>setStep(2)} disabled={!name.trim()||selectedShips.length===0}>
              SUIVANT — DÉFINIR LA GRILLE →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Structure */}
      {step === 2 && (
        <div className="fade-up">
          <div className="card" style={{ padding:28, marginBottom:20 }}>
            <div style={{ fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:3,color:'#00d4ff',marginBottom:6 }}>STRUCTURE DE LA GRILLE</div>
            <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:24 }}>
              Définissez les étiquettes des lignes (ex: pronoms) et des colonnes (ex: verbes). Taille libre jusqu'à 10×10.
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
              {/* Lignes */}
              <div>
                <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#66aaee',letterSpacing:2,marginBottom:12 }}>
                  LIGNES ({rows.length})
                </div>
                {rows.map((r,i) => (
                  <input key={i} value={r} onChange={e=>setRow(i,e.target.value)} placeholder={`Ligne ${i+1}`}
                    style={{ ...inp(), marginBottom:6 }} />
                ))}
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button className="btn sm" onClick={addRow} disabled={rows.length>=10}>+ LIGNE</button>
                  <button className="btn sm danger" onClick={removeRow} disabled={rows.length<=2}>− LIGNE</button>
                </div>
              </div>

              {/* Colonnes */}
              <div>
                <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#55cc88',letterSpacing:2,marginBottom:12 }}>
                  COLONNES ({cols.length})
                </div>
                {cols.map((c,i) => (
                  <input key={i} value={c} onChange={e=>setCol(i,e.target.value)} placeholder={`Colonne ${i+1}`}
                    style={{ ...inp(), marginBottom:6 }} />
                ))}
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button className="btn sm" onClick={addCol} disabled={cols.length>=10}>+ COLONNE</button>
                  <button className="btn sm danger" onClick={removeCol} disabled={cols.length<=2}>− COLONNE</button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview mini */}
          {activeRows.length >= 2 && activeCols.length >= 2 && (
            <div className="card" style={{ padding:16, marginBottom:20, overflow:'auto' }}>
              <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:10,letterSpacing:1 }}>APERÇU DE LA GRILLE</div>
              <table style={{ borderCollapse:'collapse', fontSize:11, fontFamily:'Share Tech Mono,monospace' }}>
                <thead>
                  <tr>
                    <th style={{ padding:'6px 10px', color:'#4a7090', borderBottom:'1px solid #1a3a5c', textAlign:'center' }}>×</th>
                    {cols.filter(c=>c.trim()).map((c,i) => (
                      <th key={i} style={{ padding:'6px 10px', color:'#55cc88', borderBottom:'1px solid #1a3a5c', textAlign:'center', minWidth:80 }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.filter(r=>r.trim()).map((r,i) => (
                    <tr key={i}>
                      <td style={{ padding:'6px 10px', color:'#66aaee', borderRight:'1px solid #1a3a5c', whiteSpace:'nowrap' }}>{r}</td>
                      {cols.filter(c=>c.trim()).map((_,j) => (
                        <td key={j} style={{ padding:'6px 10px', border:'1px solid #0d1e30', color:'#2a4a5a', textAlign:'center' }}>—</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display:'flex', gap:12 }}>
            <button className="btn" onClick={()=>setStep(1)}>⬅ RETOUR</button>
            <button className="btn primary" onClick={()=>setStep(3)} disabled={activeRows.length<2||activeCols.length<2}>
              SUIVANT — REMPLIR LES CASES →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Cells */}
      {step === 3 && (
        <div className="fade-up">
          <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:4,letterSpacing:1 }}>
            REMPLISSEZ CHAQUE CASE — "Défi" = ce que voit l'élève · Les réponses = ce que le prof voit après validation.
          </div>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            {forms.includes('positive')      && <span style={{ fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#00ff88',border:'1px solid rgba(0,255,136,.3)',padding:'2px 8px' }}>➕ Positif activé</span>}
            {forms.includes('negative')      && <span style={{ fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#ff6666',border:'1px solid rgba(255,102,102,.3)',padding:'2px 8px' }}>➖ Négatif activé</span>}
            {forms.includes('interrogative') && <span style={{ fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#ffd700',border:'1px solid rgba(255,215,0,.3)',padding:'2px 8px' }}>❓ Interrogatif activé</span>}
          </div>

          <div style={{ overflowX:'auto', marginBottom:20 }}>
            <table style={{ borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding:'8px 14px',fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',borderBottom:'1px solid #1a3a5c',textAlign:'left',whiteSpace:'nowrap' }}>↓ / →</th>
                  {cols.filter(c=>c.trim()).map((c,ci) => (
                    <th key={ci} style={{ padding:'8px 14px',fontFamily:'Bebas Neue,sans-serif',fontSize:15,letterSpacing:2,color:'#55cc88',borderBottom:'1px solid #1a3a5c',textAlign:'center',minWidth:180 }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.filter(r=>r.trim()).map((r, ri) => (
                  <tr key={ri}>
                    <td style={{ padding:'8px 14px',fontFamily:'Bebas Neue,sans-serif',fontSize:14,letterSpacing:2,color:'#66aaee',borderRight:'1px solid #1a3a5c',whiteSpace:'nowrap',verticalAlign:'top' }}>{r}</td>
                    {cols.filter(c=>c.trim()).map((c, ci) => {
                      const cell = cells[ri]?.[ci] || {}
                      const prompt   = typeof cell === 'string' ? cell : (cell.prompt || '')
                      const positive = typeof cell === 'object' ? (cell.positive || '') : ''
                      const negative = typeof cell === 'object' ? (cell.negative || '') : ''
                      const interrogative = typeof cell === 'object' ? (cell.interrogative || '') : ''
                      return (
                        <td key={ci} style={{ padding:5, border:'1px solid #0d1e30', verticalAlign:'top' }}>
                          <div style={{ background:'#080f1c', padding:8 }}>
                            {/* Prompt — always */}
                            <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090',marginBottom:3 }}>DÉFI (affiché à l'élève)</div>
                            <input value={prompt} onChange={e=>setCell(ri,ci,{...cell,prompt:e.target.value})}
                              placeholder={`${r} + ${c}…`}
                              style={{ ...inp({padding:'5px 8px',fontSize:11,marginBottom:4}) }}/>
                            {/* Positive */}
                            {forms.includes('positive') && <>
                              <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#00ff88',marginBottom:2 }}>➕ Positif</div>
                              <input value={positive} onChange={e=>setCell(ri,ci,{...cell,positive:e.target.value})}
                                placeholder="Ex: I ate a brownie."
                                style={{ ...inp({padding:'5px 8px',fontSize:11,marginBottom:4}) }}/>
                            </>}
                            {/* Negative */}
                            {forms.includes('negative') && <>
                              <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#ff6666',marginBottom:2 }}>➖ Négatif</div>
                              <input value={negative} onChange={e=>setCell(ri,ci,{...cell,negative:e.target.value})}
                                placeholder="Ex: I didn't eat a brownie."
                                style={{ ...inp({padding:'5px 8px',fontSize:11,marginBottom:4}) }}/>
                            </>}
                            {/* Interrogative */}
                            {forms.includes('interrogative') && <>
                              <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#ffd700',marginBottom:2 }}>❓ Interrogatif</div>
                              <input value={interrogative} onChange={e=>setCell(ri,ci,{...cell,interrogative:e.target.value})}
                                placeholder="Ex: Did I eat a brownie?"
                                style={{ ...inp({padding:'5px 8px',fontSize:11,marginBottom:0}) }}/>
                            </>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display:'flex', gap:12 }}>
            <button className="btn" onClick={()=>setStep(2)}>⬅ RETOUR</button>
            <button className="btn primary" onClick={saveGame} disabled={saving}>
              {saving ? <><span className="spinner"/> SAUVEGARDE...</> : '💾 SAUVEGARDER LE JEU'}
            </button>
          </div>
        </div>
      )}


      {/* ── AI Template Modal ──────────────────────────────────────── */}
      {aiModal && (
        <div onClick={e=>e.target===e.currentTarget&&setAiModal(false)}
          style={{position:'fixed',inset:0,background:'rgba(5,13,26,.95)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,overflowY:'auto'}}>
          <div className="card glow fade-up" style={{width:'100%',maxWidth:700,padding:36,position:'relative',marginTop:40}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#aa44ff,transparent)'}}/>
            <button onClick={()=>setAiModal(false)} style={{position:'absolute',top:14,right:18,background:'none',border:'none',color:'#4a7090',fontSize:18,cursor:'pointer'}}>✕</button>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:3,color:'#aa44ff',marginBottom:16}}>🤖 REMPLIR AVEC UNE IA</div>

            {/* Mode tabs */}
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              {[
                [false,'📋 TEMPLATE TEXTE','Copie un template à donner à une IA'],
                [true, '📸 IMAGE EXCEL','Envoie une photo de ton tableau'],
              ].map(([isImg,label,desc])=>(
                <div key={label} onClick={()=>setAiImageMode(isImg)}
                  style={{flex:1,padding:'10px 14px',border:`2px solid ${aiImageMode===isImg?'#aa44ff':'#1a3a5c'}`,background:aiImageMode===isImg?'rgba(170,68,255,.12)':'transparent',cursor:'pointer',textAlign:'center'}}>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:14,letterSpacing:2,color:aiImageMode===isImg?'#aa44ff':'#4a7090'}}>{label}</div>
                  <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090',marginTop:3}}>{desc}</div>
                </div>
              ))}
            </div>

            {/* TEXT MODE */}
            {!aiImageMode && (<>
              <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12,lineHeight:1.7}}>
                1. Copiez le template → 2. Donnez à Claude/ChatGPT avec votre sujet → 3. Collez la réponse
              </div>
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#aa44ff',letterSpacing:1}}>TEMPLATE</div>
                  <button onClick={()=>{navigator.clipboard.writeText(generateTemplate());toast('Copié !','success')}}
                    style={{padding:'4px 12px',background:'rgba(170,68,255,.15)',border:'1px solid #aa44ff',color:'#aa44ff',fontFamily:'Share Tech Mono,monospace',fontSize:10,cursor:'pointer'}}>
                    📋 COPIER
                  </button>
                </div>
                <pre style={{background:'#030810',border:'1px solid #1a3a5c',padding:10,fontSize:9,fontFamily:'Share Tech Mono,monospace',color:'#4a7090',overflowX:'auto',maxHeight:160,overflowY:'auto',lineHeight:1.5}}>
                  {generateTemplate()}
                </pre>
              </div>
            </>)}

            {/* IMAGE MODE */}
            {aiImageMode && (<>
              <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12,lineHeight:1.7}}>
                Fais une capture de ton tableau Excel/Numbers → l'IA lit l'image et remplit automatiquement le jeu.
              </div>

              {/* Upload zone */}
              <label style={{display:'block',marginBottom:14,cursor:'pointer'}}>
                <div style={{border:`2px dashed ${aiImagePreview?'#aa44ff':'#1a3a5c'}`,background:aiImagePreview?'rgba(170,68,255,.05)':'#030810',padding:aiImagePreview?8:24,textAlign:'center',transition:'all .2s'}}>
                  {aiImagePreview
                    ? <img src={aiImagePreview} style={{maxWidth:'100%',maxHeight:200,objectFit:'contain'}} alt="preview"/>
                    : <>
                        <div style={{fontSize:32,marginBottom:8}}>📸</div>
                        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:2,color:'#aa44ff'}}>CLIQUEZ POUR IMPORTER</div>
                        <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginTop:4}}>PNG, JPG, JPEG</div>
                      </>
                  }
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:'none'}}/>
              </label>

              {aiImagePreview && (
                <button className="btn primary full" onClick={analyzeImage} disabled={aiLoading}
                  style={{borderColor:'#aa44ff',color:'#aa44ff',marginBottom:14}}>
                  {aiLoading ? '⏳ ANALYSE EN COURS...' : '🔍 ANALYSER L'IMAGE AVEC L'IA'}
                </button>
              )}

              {aiError && <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#ff3a3a',marginBottom:12,padding:'8px 12px',border:'1px solid rgba(255,58,58,.3)'}}>{aiError}</div>}
            </>)}

            {/* JSON result / paste area — shown in both modes */}
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#00d4ff',letterSpacing:1,marginBottom:6}}>
                {aiImageMode ? 'RÉSULTAT GÉNÉRÉ (modifiable)' : 'COLLEZ LA RÉPONSE ICI'}
              </div>
              <textarea value={aiPasted} onChange={e=>setAiPasted(e.target.value)}
                placeholder='{"name":"...","rows":[...],"cols":[...],"cells":[[...]]}'
                rows={6}
                style={{width:'100%',background:'#030810',border:'1px solid #1a3a5c',color:'#c8e6f0',padding:'10px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:10,outline:'none',resize:'vertical',lineHeight:1.5}}/>
            </div>
            <button className="btn primary full" onClick={importFromAI} disabled={!aiPasted.trim()}
              style={{borderColor:'#aa44ff',color:'#aa44ff'}}>
              ✓ IMPORTER ET AUTO-REMPLIR
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════════════
  // GAME LIST
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ padding:'36px 40px', maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>

      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontFamily:'Bebas Neue,sans-serif',fontSize:32,letterSpacing:5,color:'#00d4ff',marginBottom:4 }}>📚 JEUX ÉDUCATIFS</div>
          <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',letterSpacing:1 }}>SÉLECTIONNEZ UN JEU POUR JOUER EN CLASSE</div>
        </div>
        <button className="btn primary" style={{ marginLeft:'auto' }} onClick={() => { setCreating(true); setStep(1) }}>
          ✚ CRÉER UN JEU
        </button>
      </div>

      {/* Search */}
      <input
        value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="🔍 Rechercher par nom ou matière..."
        style={{ width:'100%', maxWidth:420, background:'#091525', border:'1px solid #1a3a5c', color:'#c8e6f0', padding:'10px 16px', fontFamily:'Share Tech Mono,monospace', fontSize:12, outline:'none', marginBottom:28 }}
      />

      {/* Games */}
      {myGames === null ? (
        <div style={{ display:'flex',alignItems:'center',gap:10,color:'#4a7090',fontFamily:'Share Tech Mono,monospace',fontSize:12 }}>
          <span className="spinner"/> Chargement...
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {filtered.map(game => {
            const st = ss(game.subject)
            const nr = game.rows?.length || 0
            const nc = game.cols?.length || 0
            return (
              <div key={game.id} className="card hover-glow fade-up" style={{ padding:24, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${st.color},transparent)` }}/>

                <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'Share Tech Mono,monospace',fontSize:10,letterSpacing:1,color:st.color,background:st.bg,border:`1px solid ${st.border}`,padding:'2px 8px' }}>
                      {game.subject || 'Autre'}
                    </span>
                    {game.isDefault && <span style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#ffd700',border:'1px solid rgba(255,215,0,.3)',padding:'2px 6px' }}>DÉFAUT</span>}
                  </div>
                  {!game.isDefault && (
                    <button onClick={()=>deleteGame(game.id,game.name)} style={{ background:'none',border:'none',color:'#4a7090',cursor:'pointer',fontSize:16,padding:0,lineHeight:1 }} title="Supprimer">✕</button>
                  )}
                </div>

                <div style={{ fontFamily:'Bebas Neue,sans-serif',fontSize:19,letterSpacing:2,color:'#c8e6f0',marginBottom:6 }}>{game.name}</div>
                <div style={{ fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:14 }}>
                  GRILLE {nr}×{nc} — {nr*nc} cases
                </div>

                {/* Cols preview */}
                <div style={{ display:'flex',gap:4,flexWrap:'wrap',marginBottom:6 }}>
                  {game.cols?.slice(0,6).map((c,i) => (
                    <span key={i} style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:st.color,background:st.bg,border:`1px solid ${st.border}`,padding:'1px 6px' }}>
                      {c.substring(0,8)}
                    </span>
                  ))}
                  {nc > 6 && <span style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090' }}>+{nc-6}</span>}
                </div>
                {/* Rows preview */}
                <div style={{ display:'flex',gap:4,flexWrap:'wrap',marginBottom:16 }}>
                  {game.rows?.slice(0,5).map((r,i) => (
                    <span key={i} style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#66aaee',background:'rgba(102,170,238,.07)',border:'1px solid rgba(102,170,238,.2)',padding:'1px 6px' }}>
                      {r.substring(0,10)}
                    </span>
                  ))}
                  {nr > 5 && <span style={{ fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090' }}>+{nr-5}</span>}
                </div>

                <button className="btn primary full" onClick={()=>selectGame(game)}>
                  ▶ JOUER EN CLASSE
                </button>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1',textAlign:'center',padding:48,color:'#4a7090',fontFamily:'Share Tech Mono,monospace',fontSize:12 }}>
              Aucun jeu trouvé. <span style={{ color:'#00d4ff',cursor:'pointer' }} onClick={()=>setCreating(true)}>Créez le vôtre !</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
