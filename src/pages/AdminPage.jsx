// src/pages/AdminPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, getDocs, deleteDoc, doc, updateDoc, addDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp, setDoc, getDoc, increment, arrayUnion,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { EVENT_TYPES } from '../hooks/useActiveEvent'
import { ALL_ITEMS, SHIP_SKINS, SEA_THEMES, RARITY, PACKS, openPack } from '../lib/shopData'
import { useToast } from '../components/Toast'

const TAB = { USERS:'users', GAMES:'games', LEARN:'learn', ANNOUNCE:'announce', EVENTS:'events', SPECTATE:'spectate', STATS:'stats' }

const tabStyle = (active) => ({
  padding:'7px 14px', fontFamily:'Bebas Neue,sans-serif', fontSize:13, letterSpacing:2,
  background: active ? 'rgba(255,58,58,.12)' : 'transparent',
  border:`1px solid ${active?'#ff3a3a':'#1a3a5c'}`,
  color: active ? '#ff3a3a' : '#4a7090',
  cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap',
})

export default function AdminPage() {
  const { user, profile } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  const [tab,        setTab]        = useState(TAB.USERS)
  const [users,      setUsers]      = useState(null)
  const [games,      setGames]      = useState(null)
  const [learnGames, setLearnGames] = useState(null)
  const [announces,  setAnnounces]  = useState(null)
  const [events,     setEvents]     = useState(null)
  const [rooms,      setRooms]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState('')

  // Announcement form
  const [annTitle,   setAnnTitle]   = useState('')
  const [annBody,    setAnnBody]    = useState('')
  const [annType,    setAnnType]    = useState('info') // info | warning | event

  // Event form
  const [evtTitle,   setEvtTitle]   = useState('')
  const [evtDesc,    setEvtDesc]    = useState('')
  const [evtReward,  setEvtReward]  = useState('')
  const [evtEnd,     setEvtEnd]     = useState('')
  const [evtType,    setEvtType]    = useState('disco')

  // Reward modal
  const [rewardUser,    setRewardUser]    = useState(null)
  const [rewardMsg,     setRewardMsg]     = useState('')
  const [rewardCoins,   setRewardCoins]   = useState(0)
  const [rewardSkin,    setRewardSkin]    = useState('')
  const [rewardWins,    setRewardWins]    = useState(0)
  const [rewardLosses,  setRewardLosses]  = useState(0)
  const [rewardPack,    setRewardPack]    = useState('')
  const [rewardPackCount, setRewardPackCount] = useState(1)

  // Spectate
  const [spectateRoom,  setSpectateRoom]  = useState(null)
  const [spectateData,  setSpectateData]  = useState(null)
  const unsubSpectate = useRef(null)

  useEffect(() => {
    if (profile !== null && !profile?.isAdmin) navigate('/dashboard')
  }, [profile])

  useEffect(() => { if (profile?.isAdmin) loadTab(tab) }, [tab, profile])

  async function loadTab(t) {
    setLoading(true)
    try {
      if (t === TAB.USERS) {
        const snap = await getDocs(collection(db,'users'))
        setUsers(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)))
      }
      if (t === TAB.GAMES) {
        const snap = await getDocs(query(collection(db,'games'),orderBy('createdAt','desc'),limit(100)))
        setGames(snap.docs.map(d=>({id:d.id,...d.data()})))
      }
      if (t === TAB.LEARN) {
        const snap = await getDocs(collection(db,'learn_games'))
        setLearnGames(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)))
      }
      if (t === TAB.ANNOUNCE) {
        const snap = await getDocs(query(collection(db,'announcements'),orderBy('createdAt','desc')))
        setAnnounces(snap.docs.map(d=>({id:d.id,...d.data()})))
      }
      if (t === TAB.EVENTS) {
        const snap = await getDocs(query(collection(db,'events'),orderBy('createdAt','desc')))
        setEvents(snap.docs.map(d=>({id:d.id,...d.data()})))
      }
      if (t === TAB.SPECTATE) {
        const snap = await getDocs(query(collection(db,'rooms'),orderBy('createdAt','desc'),limit(20)))
        setRooms(snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.status!=='ended'))
      }
    } catch(e) { toast('Erreur: '+e.message,'error') }
    setLoading(false)
  }

  // ── Users ─────────────────────────────────────────────────────
  async function deleteUser(id, username) {
    if (!confirm(`Supprimer "${username}" de Firestore ?`)) return
    await deleteDoc(doc(db,'users',id))
    toast('Utilisateur supprimé','info')
    loadTab(TAB.USERS)
  }

  async function toggleAdmin(id, current) {
    await updateDoc(doc(db,'users',id),{isAdmin:!current})
    toast(!current?'✓ Promu admin':'Admin retiré','success')
    loadTab(TAB.USERS)
  }

  async function sendReward(uid) {
    if (!rewardMsg.trim() && !rewardCoins && !rewardSkin && !rewardWins && !rewardLosses) {
      toast('Ajoutez au moins une récompense','error'); return
    }
    try {
      // Send inbox message
      const items = []
      if (rewardCoins > 0) items.push(`🪙 ${rewardCoins} pièces`)
      if (rewardSkin)      items.push(`🎨 ${rewardSkin}`)
      if (rewardPack)      items.push(`📦 ${PACKS[rewardPack]?.name||rewardPack}`)
      if (rewardWins > 0)  items.push(`🏆 +${rewardWins} victoires`)
      if (rewardLosses > 0) items.push(`💀 +${rewardLosses} défaites`)
      const msgText = rewardMsg.trim() || `Don de l'admin : ${items.join(', ')}`

      // If pack: pre-roll items and store them
      let packItems = null
      if (rewardPack && PACKS[rewardPack]) {
        const targetSnap = await getDoc(doc(db,'users',uid))
        const targetOwned = targetSnap.exists() ? (targetSnap.data().owned||[]) : []
        packItems = []
        for (let i=0; i<(rewardPackCount||1); i++) {
          packItems.push(...openPack(PACKS[rewardPack], [...targetOwned,...packItems]).map(x=>x.id))
        }
      }

      await addDoc(collection(db,'inbox'),{
        uid, message: msgText, from: profile?.username||'Admin',
        type: 'reward',
        coins:     rewardCoins  || 0,
        skin:      rewardSkin   || null,
        pack:      rewardPack   || null,
        packItems: packItems    || null,
        wins:      rewardWins   || 0,
        losses:    rewardLosses || 0,
        claimed: false, read: false,
        createdAt: serverTimestamp(),
      })

      // Apply stats immediately
      const updates = {}
      if (rewardCoins > 0)  updates.coins  = increment(rewardCoins)
      if (rewardWins > 0)   updates.wins   = increment(rewardWins)
      if (rewardLosses > 0) updates.losses = increment(rewardLosses)
      if (Object.keys(updates).length) await updateDoc(doc(db,'users',uid), updates)

      toast('Récompense envoyée !','success')
      setRewardUser(null)
      setRewardMsg(''); setRewardCoins(0); setRewardSkin(''); setRewardPack(''); setRewardPackCount(1); setRewardWins(0); setRewardLosses(0)
    } catch(e) { toast('Erreur: '+e.message,'error') }
  }

  // ── Announcements ─────────────────────────────────────────────
  async function postAnnouncement() {
    if (!annTitle.trim()||!annBody.trim()) { toast('Remplissez titre et message','error'); return }
    await addDoc(collection(db,'announcements'),{
      title: annTitle.trim(), body: annBody.trim(), type: annType,
      author: profile?.username||'Admin', createdAt: serverTimestamp(),
    })
    toast('Annonce publiée !','success')
    setAnnTitle(''); setAnnBody('')
    loadTab(TAB.ANNOUNCE)
  }

  async function deleteAnnounce(id) {
    await deleteDoc(doc(db,'announcements',id))
    toast('Annonce supprimée','info')
    loadTab(TAB.ANNOUNCE)
  }

  // ── Events ────────────────────────────────────────────────────
  async function postEvent() {
    if (!evtTitle.trim()) { toast('Entrez un titre','error'); return }
    await addDoc(collection(db,'events'),{
      title: evtTitle.trim(), description: evtDesc.trim(),
      reward: evtReward.trim(), endsAt: evtEnd||null,
      eventType: evtType,
      active: true, author: profile?.username||'Admin',
      createdAt: serverTimestamp(),
    })
    toast('Événement créé !','success')
    setEvtTitle(''); setEvtDesc(''); setEvtReward(''); setEvtEnd('')
    loadTab(TAB.EVENTS)
  }

  async function toggleEvent(id, active) {
    await updateDoc(doc(db,'events',id),{active:!active})
    toast(!active?'Événement activé':'Événement désactivé','info')
    loadTab(TAB.EVENTS)
  }

  async function deleteEvent(id) {
    await deleteDoc(doc(db,'events',id))
    toast('Événement supprimé','info')
    loadTab(TAB.EVENTS)
  }

  // ── Spectate ──────────────────────────────────────────────────
  function spectate(room) {
    unsubSpectate.current?.()
    setSpectateRoom(room)
    const unsub = onSnapshot(doc(db,'rooms',room.id), snap => {
      setSpectateData(snap.data())
    })
    unsubSpectate.current = unsub
  }

  function stopSpectate() {
    unsubSpectate.current?.()
    setSpectateRoom(null); setSpectateData(null)
  }

  async function stopGame(roomId) {
    if (!confirm('Forcer la fin de cette partie ?')) return
    await updateDoc(doc(db,'rooms',roomId),{status:'ended',winner:'admin_stopped'})
    toast('Partie arrêtée !','info')
    stopSpectate()
    loadTab(TAB.SPECTATE)
  }

  useEffect(() => () => unsubSpectate.current?.(), [])

  // ── Learn games ───────────────────────────────────────────────
  async function deleteLearnGame(id, name) {
    if (!confirm(`Supprimer "${name}" ?`)) return
    await deleteDoc(doc(db,'learn_games',id))
    toast('Jeu supprimé','info')
    loadTab(TAB.LEARN)
  }

  async function deleteGame(id) {
    await deleteDoc(doc(db,'games',id))
    toast('Partie supprimée','info')
    loadTab(TAB.GAMES)
  }

  const filtered = (arr) => {
    if (!arr||!search.trim()) return arr||[]
    const s=search.toLowerCase()
    return arr.filter(x=>Object.values(x).some(v=>typeof v==='string'&&v.toLowerCase().includes(s)))
  }

  if (!profile?.isAdmin) return null

  // ── INP helper ────────────────────────────────────────────────
  const inp = (extra={}) => ({
    background:'#050d1a', border:'1px solid #1a3a5c', color:'#c8e6f0',
    padding:'9px 12px', fontFamily:'Share Tech Mono,monospace', fontSize:12,
    outline:'none', width:'100%', ...extra,
  })

  // ── Spectate mini-board ───────────────────────────────────────
  function MiniBoard({ board, size=10 }) {
    if (!board) return <div style={{color:'#4a7090',fontFamily:'Share Tech Mono,monospace',fontSize:11}}>En attente...</div>
    let parsed = []
    try { parsed = typeof board==='string' ? JSON.parse(board) : board } catch { return null }
    return (
      <div>
        {Array.from({length:size},(_,r)=>(
          <div key={r} style={{display:'flex'}}>
            {Array.from({length:size},(_,c)=>{
              const v=parsed[r]?.[c]
              const bg=v==='sunk'?'#2e0000':v==='hit'?'#4a1800':v==='miss'?'#0a2a4a':v==='ship'?'#1a3a5c':'#050d1a'
              return <div key={c} style={{width:16,height:16,background:bg,border:'1px solid #0a1a2a'}}/>
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{padding:'28px 32px',maxWidth:1200,margin:'0 auto',position:'relative',zIndex:1}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <div>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:28,letterSpacing:5,color:'#ff3a3a'}}>🛡 PANEL ADMIN</div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090'}}>Connecté : {profile?.username}</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:6,flexWrap:'wrap'}}>
          {[
            [TAB.USERS,'👥 USERS'],
            [TAB.ANNOUNCE,'📢 ANNONCES'],
            [TAB.EVENTS,'🎉 EVENTS'],
            [TAB.SPECTATE,'👁 SPECTATE'],
            [TAB.GAMES,'🎮 PARTIES'],
            [TAB.LEARN,'📚 JEUX ÉDUC.'],
            [TAB.STATS,'📊 STATS'],
          ].map(([t,l])=>(
            <button key={t} style={tabStyle(tab===t)} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Search bar (not on announce/events/spectate) */}
      {[TAB.USERS,TAB.GAMES,TAB.LEARN].includes(tab) && (
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{...inp({maxWidth:360,marginBottom:18})}}/>
      )}

      {loading && <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:16,display:'flex',gap:8,alignItems:'center'}}><span className="spinner"/>Chargement...</div>}

      {/* ══ USERS ══════════════════════════════════════════════════ */}
      {tab===TAB.USERS && users && (
        <div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12}}>{users.length} COMPTES</div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #1a3a5c'}}>
                  {['UTILISATEUR','EMAIL','V/D','RÔLE','CRÉÉ','ACTIONS'].map(h=>(
                    <th key={h} style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090',letterSpacing:1,textAlign:'left'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered(users).map(u=>(
                  <tr key={u.id} style={{borderBottom:'1px solid #0d1e30'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,212,255,.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'9px 12px'}}>
                      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:14,color:'#c8e6f0'}}>{u.username||'—'}</div>
                      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#2a4a6a'}}>{u.id.slice(0,10)}…</div>
                    </td>
                    <td style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>{u.email||'—'}</td>
                    <td style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:11}}>
                      <span style={{color:'#00ff88'}}>{u.wins||0}V</span><span style={{color:'#2a4a6a'}}>/</span><span style={{color:'#ff6666'}}>{u.losses||0}D</span>
                    </td>
                    <td style={{padding:'9px 12px'}}>
                      {u.isAdmin
                        ? <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#ff3a3a',border:'1px solid rgba(255,58,58,.4)',padding:'2px 6px'}}>🛡 ADMIN</span>
                        : <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090'}}>joueur</span>
                      }
                    </td>
                    <td style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090'}}>
                      {u.createdAt?new Date(u.createdAt.seconds*1000).toLocaleDateString('fr-FR'):'—'}
                    </td>
                    <td style={{padding:'9px 12px'}}>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                        <button onClick={()=>toggleAdmin(u.id,u.isAdmin)}
                          style={{padding:'3px 8px',fontFamily:'Share Tech Mono,monospace',fontSize:9,background:'transparent',border:`1px solid ${u.isAdmin?'#ff6666':'#00d4ff'}`,color:u.isAdmin?'#ff6666':'#00d4ff',cursor:'pointer'}}>
                          {u.isAdmin?'− ADMIN':'+ ADMIN'}
                        </button>
                        <button onClick={()=>setRewardUser(u)}
                          style={{padding:'3px 8px',fontFamily:'Share Tech Mono,monospace',fontSize:9,background:'transparent',border:'1px solid #ffd700',color:'#ffd700',cursor:'pointer'}}>
                          🎁 DON
                        </button>
                        {u.id!==user?.uid&&(
                          <button onClick={()=>deleteUser(u.id,u.username)}
                            style={{padding:'3px 8px',fontFamily:'Share Tech Mono,monospace',fontSize:9,background:'transparent',border:'1px solid #ff3a3a',color:'#ff3a3a',cursor:'pointer'}}>
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ ANNOUNCEMENTS ════════════════════════════════════════ */}
      {tab===TAB.ANNOUNCE && (
        <div style={{display:'grid',gridTemplateColumns:'400px 1fr',gap:24,alignItems:'start'}}>
          {/* Form */}
          <div className="card glow" style={{padding:28,position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#ff3a3a,transparent)'}}/>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:3,color:'#ff3a3a',marginBottom:20}}>NOUVELLE ANNONCE</div>

            <div className="field">
              <label>Type</label>
              <div style={{display:'flex',gap:8,marginTop:4}}>
                {[['info','💬 Info','#00d4ff'],['warning','⚠ Important','#ffd700'],['event','🎉 Événement','#00ff88']].map(([k,l,c])=>(
                  <div key={k} onClick={()=>setAnnType(k)}
                    style={{padding:'6px 12px',border:`1px solid ${annType===k?c:'#1a3a5c'}`,background:annType===k?`${c}15`:'transparent',color:annType===k?c:'#4a7090',cursor:'pointer',fontFamily:'Share Tech Mono,monospace',fontSize:10,transition:'all .15s'}}>
                    {l}
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Titre</label>
              <input value={annTitle} onChange={e=>setAnnTitle(e.target.value)} placeholder="ex: Maintenance prévue" maxLength={80} style={inp()}/>
            </div>

            <div className="field">
              <label>Message</label>
              <textarea value={annBody} onChange={e=>setAnnBody(e.target.value)} placeholder="Détails de l'annonce..." rows={4} maxLength={500}
                style={{...inp(),resize:'vertical',lineHeight:1.6}}/>
            </div>

            <button className="btn primary full" onClick={postAnnouncement}>📢 PUBLIER</button>
          </div>

          {/* List */}
          <div>
            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12}}>{announces?.length||0} ANNONCE{announces?.length!==1?'S':''}</div>
            {(announces||[]).map(a=>{
              const color=a.type==='warning'?'#ffd700':a.type==='event'?'#00ff88':'#00d4ff'
              return (
                <div key={a.id} className="card" style={{padding:16,marginBottom:10,borderLeft:`3px solid ${color}`}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:4}}>
                    <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:2,color}}>{a.title}</div>
                    <button onClick={()=>deleteAnnounce(a.id)} style={{background:'none',border:'none',color:'#ff3a3a',cursor:'pointer',fontSize:14}}>✕</button>
                  </div>
                  <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#c8e6f0',lineHeight:1.6,marginBottom:6}}>{a.body}</div>
                  <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090'}}>
                    {a.author} · {a.createdAt?new Date(a.createdAt.seconds*1000).toLocaleDateString('fr-FR'):''}
                  </div>
                </div>
              )
            })}
            {announces?.length===0&&<div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>Aucune annonce.</div>}
          </div>
        </div>
      )}

      {/* ══ EVENTS ═══════════════════════════════════════════════ */}
      {tab===TAB.EVENTS && (
        <div style={{display:'grid',gridTemplateColumns:'400px 1fr',gap:24,alignItems:'start'}}>
          {/* Form */}
          <div className="card glow" style={{padding:28,position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#ffd700,transparent)'}}/>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:3,color:'#ffd700',marginBottom:20}}>NOUVEL ÉVÉNEMENT</div>

            {/* Event type picker */}
            <div className="field">
              <label>Type d'effet en jeu</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginTop:6}}>
                {Object.values(EVENT_TYPES).map(et=>(
                  <div key={et.id} onClick={()=>setEvtType(et.id)}
                    style={{padding:'8px 10px',border:`1px solid ${evtType===et.id?et.color:'#1a3a5c'}`,
                      background:evtType===et.id?`${et.color}15`:'transparent',
                      cursor:'pointer',transition:'all .15s'}}>
                    <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:14,letterSpacing:2,color:evtType===et.id?et.color:'#4a7090'}}>{et.icon} {et.name}</div>
                    <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090'}}>{et.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="field"><label>Titre</label>
              <input value={evtTitle} onChange={e=>setEvtTitle(e.target.value)} placeholder="ex: Nuit Disco !" maxLength={80} style={inp()}/>
            </div>
            <div className="field"><label>Description</label>
              <textarea value={evtDesc} onChange={e=>setEvtDesc(e.target.value)} placeholder="Règles, objectif, comment participer..." rows={3} maxLength={400} style={{...inp(),resize:'vertical'}}/>
            </div>
            <div className="field"><label>🎁 Récompense</label>
              <input value={evtReward} onChange={e=>setEvtReward(e.target.value)} placeholder="ex: Badge Amiral d'Or" maxLength={80} style={inp()}/>
            </div>
            <div className="field"><label>Date de fin (optionnel)</label>
              <input type="date" value={evtEnd} onChange={e=>setEvtEnd(e.target.value)} style={inp()}/>
            </div>
            <button className="btn primary full" onClick={postEvent} style={{borderColor:'#ffd700',color:'#ffd700'}}>🎉 CRÉER L'ÉVÉNEMENT</button>
          </div>

          {/* List */}
          <div>
            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12}}>{events?.length||0} ÉVÉNEMENT{events?.length!==1?'S':''}</div>
            {(events||[]).map(e=>(
              <div key={e.id} className="card" style={{padding:18,marginBottom:10,borderLeft:`3px solid ${e.active?'#ffd700':'#1a3a5c'}`}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:6}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:2,color:e.active?'#ffd700':'#4a7090'}}>{e.title}</div>
                      {e.eventType&&EVENT_TYPES[e.eventType]&&(
                        <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:EVENT_TYPES[e.eventType].color,border:`1px solid ${EVENT_TYPES[e.eventType].color}55`,padding:'1px 6px'}}>
                          {EVENT_TYPES[e.eventType].icon} {EVENT_TYPES[e.eventType].name}
                        </span>
                      )}
                    </div>
                    {e.active&&<span style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#00ff88',border:'1px solid rgba(0,255,136,.3)',padding:'1px 6px'}}>ACTIF</span>}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>toggleEvent(e.id,e.active)}
                      style={{padding:'3px 8px',fontFamily:'Share Tech Mono,monospace',fontSize:9,background:'transparent',border:`1px solid ${e.active?'#4a7090':'#00ff88'}`,color:e.active?'#4a7090':'#00ff88',cursor:'pointer'}}>
                      {e.active?'DÉSACTIVER':'ACTIVER'}
                    </button>
                    <button onClick={()=>deleteEvent(e.id)} style={{background:'none',border:'none',color:'#ff3a3a',cursor:'pointer',fontSize:14}}>✕</button>
                  </div>
                </div>
                {e.description&&<div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#c8e6f0',lineHeight:1.6,marginBottom:6}}>{e.description}</div>}
                {e.reward&&<div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#ffd700'}}>🎁 {e.reward}</div>}
                {e.endsAt&&<div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090',marginTop:4}}>Fin : {e.endsAt}</div>}
              </div>
            ))}
            {events?.length===0&&<div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>Aucun événement.</div>}
          </div>
        </div>
      )}

      {/* ══ SPECTATE ═════════════════════════════════════════════ */}
      {tab===TAB.SPECTATE && (
        <div>
          {!spectateRoom ? (
            <div>
              <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12}}>
                PARTIES EN COURS — {rooms?.filter(r=>r.status!=='ended').length||0} SALLE{(rooms?.length||0)!==1?'S':''}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                {(rooms||[]).map(room=>(
                  <div key={room.id} className="card hover-glow" style={{padding:18}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                      <span className={room.status==='waiting'?'dot dim':'dot green'}/>
                      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:3,color:'#00d4ff'}}>{room.id}</div>
                    </div>
                    <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:4}}>
                      🏠 {room.hostName||'?'} vs 👤 {room.guestName||'En attente'}
                    </div>
                    <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12}}>
                      Statut: <span style={{color:room.status==='waiting'?'#ffd700':'#00ff88'}}>{room.status}</span>
                      {room.gridSize&&` · Grille ${room.gridSize}×${room.gridSize}`}
                    </div>
                    <button className="btn primary full" style={{fontSize:11}} onClick={()=>spectate(room)}>
                      👁 OBSERVER
                    </button>
                  </div>
                ))}
                {(rooms||[]).length===0&&(
                  <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>
                    Aucune partie active.
                    <button className="btn sm" style={{marginLeft:12}} onClick={()=>loadTab(TAB.SPECTATE)}>↺ Rafraîchir</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'}}>
                <button className="btn sm" onClick={stopSpectate}>⬅ RETOUR</button>
                <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:3,color:'#00d4ff'}}>
                  👁 OBSERVATION — SALLE {spectateRoom.id}
                </div>
                <span className="dot green"/>
                <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#00ff88'}}>EN DIRECT</span>
                <button onClick={()=>stopGame(spectateRoom.id)} style={{marginLeft:'auto',padding:'6px 16px',fontFamily:'Bebas Neue,sans-serif',fontSize:14,letterSpacing:2,background:'rgba(255,58,58,.15)',border:'1px solid #ff3a3a',color:'#ff3a3a',cursor:'pointer'}}>
                  ⛔ ARRÊTER LA PARTIE
                </button>
              </div>

              {spectateData ? (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                  <div className="card" style={{padding:20}}>
                    <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:2,color:'#66aaee',marginBottom:12}}>
                      🏠 {spectateData.hostName||'Hôte'}
                      {spectateData.currentTurn==='host'&&<span style={{color:'#ffd700',fontSize:12,marginLeft:8}}>← TOUR</span>}
                    </div>
                    <MiniBoard board={spectateData.hostBoard} size={spectateData.gridSize||10}/>
                  </div>
                  <div className="card" style={{padding:20}}>
                    <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:2,color:'#55cc88',marginBottom:12}}>
                      👤 {spectateData.guestName||'Invité'}
                      {spectateData.currentTurn==='guest'&&<span style={{color:'#ffd700',fontSize:12,marginLeft:8}}>← TOUR</span>}
                    </div>
                    <MiniBoard board={spectateData.guestBoard} size={spectateData.gridSize||10}/>
                  </div>
                  <div className="card" style={{padding:12,gridColumn:'1/-1'}}>
                    <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:8}}>DERNIERS COUPS</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {(spectateData.moves||[]).slice(-10).reverse().map((m,i)=>(
                        <div key={i} style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:m.result==='miss'?'#4a7090':m.result?.startsWith('sunk')?'#ff3333':'#ff6600',border:`1px solid ${m.result==='miss'?'#1a3a5c':m.result?.startsWith('sunk')?'rgba(255,51,51,.3)':'rgba(255,102,0,.3)'}`,padding:'3px 8px'}}>
                          {m.by} → {m.r},{m.c} {m.result==='miss'?'·':m.result?.startsWith('sunk')?'💥':'🎯'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>Connexion en cours...</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ GAMES ════════════════════════════════════════════════ */}
      {tab===TAB.GAMES && games && (
        <div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12}}>{games.length} DERNIÈRES PARTIES</div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #1a3a5c'}}>
                  {['MODE','ADVERSAIRE','TIRS','GRILLE','DATE','ACTION'].map(h=>(
                    <th key={h} style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090',textAlign:'left'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered(games).map(g=>(
                  <tr key={g.id} style={{borderBottom:'1px solid #0d1e30'}}>
                    <td style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#00d4ff'}}>{g.mode||'—'}</td>
                    <td style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#c8e6f0'}}>{g.opponentName||'—'}</td>
                    <td style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>{g.shots||'—'}</td>
                    <td style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>{g.gridSize?`${g.gridSize}×${g.gridSize}`:'—'}</td>
                    <td style={{padding:'9px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090'}}>
                      {g.createdAt?new Date(g.createdAt.seconds*1000).toLocaleDateString('fr-FR'):'—'}
                    </td>
                    <td style={{padding:'9px 12px'}}>
                      <button onClick={()=>deleteGame(g.id)}
                        style={{padding:'3px 8px',fontFamily:'Share Tech Mono,monospace',fontSize:9,background:'transparent',border:'1px solid #ff3a3a',color:'#ff3a3a',cursor:'pointer'}}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ LEARN ════════════════════════════════════════════════ */}
      {tab===TAB.LEARN && learnGames && (
        <div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:12}}>{learnGames.length} JEUX ÉDUCATIFS</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
            {filtered(learnGames).map(g=>(
              <div key={g.id} className="card" style={{padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:15,letterSpacing:2,color:'#c8e6f0'}}>{g.name}</div>
                  <button onClick={()=>deleteLearnGame(g.id,g.name)} style={{background:'none',border:'none',color:'#ff3a3a',cursor:'pointer'}}>✕</button>
                </div>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090'}}>
                  {g.subject} · {g.rows?.length||'?'}×{g.cols?.length||'?'} · {g.uid?.slice(0,8)}…
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ STATS ════════════════════════════════════════════════ */}
      {tab===TAB.STATS && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginBottom:24}}>
            {[
              {icon:'👥',label:'Utilisateurs',  value:users?.length,         color:'#00d4ff'},
              {icon:'🎮',label:'Parties',        value:games?.length,         color:'#ffd700'},
              {icon:'📚',label:'Jeux éducatifs', value:learnGames?.length,    color:'#55cc88'},
              {icon:'🛡',label:'Admins',         value:users?.filter(u=>u.isAdmin).length, color:'#ff3a3a'},
              {icon:'🏆',label:'Total victoires',value:users?.reduce((s,u)=>s+(u.wins||0),0), color:'#00ff88'},
              {icon:'📢',label:'Annonces',       value:announces?.length,     color:'#ff6600'},
              {icon:'🎉',label:'Événements actifs',value:events?.filter(e=>e.active).length, color:'#ffd700'},
            ].map(s=>(
              <div key={s.label} className="card" style={{padding:20,textAlign:'center'}}>
                <div style={{fontSize:32,marginBottom:6}}>{s.icon}</div>
                <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:40,letterSpacing:2,color:s.color}}>{s.value??'…'}</div>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090',letterSpacing:1}}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#2a4a6a'}}>
            ℹ Ouvre chaque onglet pour charger les données complètes.
          </div>
        </div>
      )}

      {/* ══ REWARD MODAL ═════════════════════════════════════════ */}
      {rewardUser && (
        <div onClick={e=>e.target===e.currentTarget&&setRewardUser(null)}
          style={{position:'fixed',inset:0,background:'rgba(5,13,26,.95)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}}>
          <div className="card glow fade-up" style={{width:'100%',maxWidth:520,padding:36,position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#ffd700,transparent)'}}/>
            <button onClick={()=>setRewardUser(null)} style={{position:'absolute',top:14,right:18,background:'none',border:'none',color:'#4a7090',fontSize:18,cursor:'pointer'}}>✕</button>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:3,color:'#ffd700',marginBottom:2}}>🎁 DON ADMIN</div>
            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:20}}>→ {rewardUser.username}</div>

            {/* Message */}
            <div className="field">
              <label>Message (optionnel)</label>
              <textarea value={rewardMsg} onChange={e=>setRewardMsg(e.target.value)}
                placeholder="ex: Félicitations pour ta victoire !" rows={2} maxLength={200}
                style={{width:'100%',background:'#050d1a',border:'1px solid #1a3a5c',color:'#c8e6f0',padding:'8px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:12,outline:'none',resize:'none'}}/>
            </div>

            {/* Coins */}
            <div className="field">
              <label>🪙 Pièces à donner</label>
              <div style={{display:'flex',gap:8,alignItems:'center',marginTop:4}}>
                <input type="number" min="0" max="99999" value={rewardCoins||''} onChange={e=>setRewardCoins(+e.target.value)}
                  placeholder="0" style={{width:'120px',background:'#050d1a',border:'1px solid #1a3a5c',color:'#ffd700',padding:'8px 12px',fontFamily:'Bebas Neue,sans-serif',fontSize:18,outline:'none'}}/>
                <div style={{display:'flex',gap:6}}>
                  {[50,100,500,1000].map(n=>(
                    <button key={n} onClick={()=>setRewardCoins(n)}
                      style={{padding:'4px 10px',background:'rgba(255,215,0,.1)',border:'1px solid rgba(255,215,0,.3)',color:'#ffd700',fontFamily:'Share Tech Mono,monospace',fontSize:10,cursor:'pointer'}}>
                      +{n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Skin */}
            <div className="field">
              <label>🎨 Skin / Thème à donner</label>
              <select value={rewardSkin} onChange={e=>setRewardSkin(e.target.value)}
                style={{width:'100%',background:'#050d1a',border:'1px solid #1a3a5c',color:'#c8e6f0',padding:'8px 12px',fontFamily:'Share Tech Mono,monospace',fontSize:12,outline:'none'}}>
                <option value="">— Aucun —</option>
                <optgroup label="Thèmes de mer">
                  {Object.values(SEA_THEMES).filter(t=>!t.free).map(t=>(
                    <option key={t.id} value={t.id}>{t.icon} {t.name} ({RARITY[t.rarity]?.label})</option>
                  ))}
                </optgroup>
                <optgroup label="Flottes">
                  {Object.values(SHIP_SKINS).filter(s=>!s.free).map(s=>(
                    <option key={s.id} value={s.id}>{s.icon} {s.name} ({RARITY[s.rarity]?.label})</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Pack */}
            <div className="field">
              <label>📦 Seed Pack à offrir</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                <div onClick={()=>setRewardPack('')}
                  style={{padding:'6px 12px',border:`1px solid ${!rewardPack?'#00d4ff':'#1a3a5c'}`,background:!rewardPack?'rgba(0,212,255,.1)':'transparent',color:!rewardPack?'#00d4ff':'#4a7090',cursor:'pointer',fontFamily:'Share Tech Mono,monospace',fontSize:10}}>
                  Aucun
                </div>
                {Object.values(PACKS).map(pack=>(
                  <div key={pack.id} onClick={()=>setRewardPack(pack.id)}
                    style={{padding:'6px 12px',border:`1px solid ${rewardPack===pack.id?pack.color:'#1a3a5c'}`,background:rewardPack===pack.id?`${pack.color}15`:'transparent',color:rewardPack===pack.id?pack.color:'#4a7090',cursor:'pointer',fontFamily:'Share Tech Mono,monospace',fontSize:10,transition:'all .15s'}}>
                    {pack.icon} {pack.name}
                  </div>
                ))}
              </div>
            </div>

            {rewardPack && (
              <div className="field">
                <label>Nombre de packs ({rewardPackCount})</label>
                <div style={{display:'flex',gap:8,marginTop:4}}>
                  {[1,2,3,5,10].map(n=>(
                    <div key={n} onClick={()=>setRewardPackCount(n)}
                      style={{padding:'6px 14px',border:`1px solid ${rewardPackCount===n?'#ffd700':'#1a3a5c'}`,
                        background:rewardPackCount===n?'rgba(255,215,0,.15)':'transparent',
                        color:rewardPackCount===n?'#ffd700':'#4a7090',cursor:'pointer',
                        fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:1}}>
                      ×{n}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="field" style={{marginBottom:0}}>
                <label>🏆 + Victoires</label>
                <input type="number" min="0" max="9999" value={rewardWins||''} onChange={e=>setRewardWins(+e.target.value)}
                  placeholder="0" style={{width:'100%',background:'#050d1a',border:'1px solid rgba(0,255,136,.3)',color:'#00ff88',padding:'8px 12px',fontFamily:'Bebas Neue,sans-serif',fontSize:18,outline:'none',marginTop:4}}/>
              </div>
              <div className="field" style={{marginBottom:0}}>
                <label>💀 + Défaites</label>
                <input type="number" min="0" max="9999" value={rewardLosses||''} onChange={e=>setRewardLosses(+e.target.value)}
                  placeholder="0" style={{width:'100%',background:'#050d1a',border:'1px solid rgba(255,102,102,.3)',color:'#ff6666',padding:'8px 12px',fontFamily:'Bebas Neue,sans-serif',fontSize:18,outline:'none',marginTop:4}}/>
              </div>
            </div>

            <button className="btn primary full" style={{marginTop:20,borderColor:'#ffd700',color:'#ffd700'}} onClick={()=>sendReward(rewardUser.id)}>
              🎁 ENVOYER LE DON
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
