// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'

export default function DashboardPage() {
  const { user, profile, refreshProfile } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  const [fleets,  setFleets]  = useState(null)
  const [history, setHistory] = useState(null)
  const [fleetModal, setFleetModal] = useState(false)
  const [fleetForm,  setFleetForm]  = useState({ name:'', gridSize:'10', notes:'' })
  const [saving,      setSaving]      = useState(false)
  const [announces,   setAnnounces]   = useState([])
  const [events,      setEvents]      = useState([])
  const [rewards,     setRewards]     = useState([])

  useEffect(() => {
    if (user) {
      loadFleets()
      loadHistory()
      loadAnnouncements()
      loadEvents()
      if (!user.isAnonymous) { refreshProfile(); loadRewards() }
    }
  }, [user])

  async function loadFleets() {
    if (!user || user.isAnonymous) { setFleets([]); return }
    try {
      const q = query(collection(db,'fleets'), where('uid','==',user.uid), orderBy('createdAt','desc'))
      const snap = await getDocs(q)
      setFleets(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    } catch { setFleets([]) }
  }

  async function loadHistory() {
    if (!user || user.isAnonymous) { setHistory([]); return }
    try {
      const q = query(collection(db,'games'), where('players','array-contains',user.uid), orderBy('createdAt','desc'), limit(10))
      const snap = await getDocs(q)
      setHistory(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    } catch { setHistory([]) }
  }

  async function loadAnnouncements() {
    try {
      const snap = await getDocs(collection(db,'announcements'))
      const all = snap.docs.map(d=>({id:d.id,...d.data()}))
      // Sort client-side, take last 3
      all.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))
      setAnnounces(all.slice(0,3))
    } catch(e) { console.error('announces:', e); setAnnounces([]) }
  }

  async function loadEvents() {
    try {
      const snap = await getDocs(collection(db,'events'))
      setEvents(snap.docs.map(d=>({id:d.id,...d.data()})).filter(e=>e.active))
    } catch { setEvents([]) }
  }

  async function loadRewards() {
    try {
      // Use inbox collection — filter client-side to avoid composite index
      const snap = await getDocs(query(collection(db,'inbox'), where('uid','==',user.uid)))
      const msgs = snap.docs.map(d=>({id:d.id,...d.data()}))
      setRewards(msgs.filter(m=>!m.read && !m.claimed))
    } catch(e) { console.error('rewards:', e); setRewards([]) }
  }

  async function markRewardRead(id) {
    await updateDoc(doc(db,'inbox',id),{read:true})
    setRewards(r=>r.filter(x=>x.id!==id))
  }

  async function saveFleet() {
    if (!fleetForm.name.trim()) { toast('Entrez un nom', 'error'); return }
    setSaving(true)
    try {
      await addDoc(collection(db,'fleets'), { uid:user.uid, name:fleetForm.name.trim(), gridSize:parseInt(fleetForm.gridSize), notes:fleetForm.notes.trim(), ships:[], createdAt:serverTimestamp() })
      toast('Flotte "' + fleetForm.name + '" sauvegardée !', 'success')
      setFleetModal(false)
      setFleetForm({ name:'', gridSize:'10', notes:'' })
      loadFleets()
    } catch(e) { toast('Erreur : ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  async function deleteFleet(id, name) {
    if (!confirm('Supprimer "' + name + '" ?')) return
    await deleteDoc(doc(db,'fleets',id))
    toast('Flotte supprimée', 'info')
    loadFleets()
  }

  function startGame(mode) {
    sessionStorage.setItem('gameMode', mode)
    navigate('/game')
  }

  const isAnon = user?.isAnonymous || false
  const wins   = profile?.wins   || 0
  const losses = profile?.losses || 0
  const total  = wins + losses
  const ratio  = total ? Math.round(wins/total*100) + '%' : '—'

  const modes = [
    { id:'online', icon:'🌐', name:'En Ligne',  badge:'RÉSEAU', desc:'Créez ou rejoignez une salle. Jouez contre un ami sur un autre appareil en temps réel.' },
    { id:'local',  icon:'👥', name:'Local 2J',  badge:'MÊME ÉCRAN', desc:'2 joueurs sur le même appareil. Écran masqué entre les tours.' },
    { id:'vs-ai',  icon:'🤖', name:'Vs IA',     badge:'SOLO', desc:'Affrontez une IA avec 3 niveaux de difficulté.' },
  ]

  const annColors = { info:'#00d4ff', warning:'#ffd700', event:'#00ff88' }

  return (
    <div style={{ padding:'36px 40px', maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>

      {/* ── Rewards ─── */}
      {rewards.map(r=>(
        <div key={r.id} style={{ marginBottom:10, padding:'12px 18px', background:'rgba(255,215,0,.06)', border:'1px solid rgba(255,215,0,.25)', display:'flex', alignItems:'center', gap:12, borderRadius:2 }}>
          <span style={{ fontSize:22 }}>🎁</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:14, letterSpacing:2, color:'#ffd700' }}>DON DE L'ADMIN — {r.from}</div>
            <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:12, color:'#c8e6f0', marginTop:2 }}>{r.message}</div>
          </div>
          <button onClick={()=>markRewardRead(r.id)} style={{ background:'none', border:'1px solid #ffd700', color:'#ffd700', padding:'4px 12px', fontFamily:'Share Tech Mono,monospace', fontSize:10, cursor:'pointer' }}>✓ LU</button>
        </div>
      ))}

      {/* ── Announcements ─── */}
      {announces.map(a=>{
        const c = annColors[a.type]||'#00d4ff'
        return (
          <div key={a.id} style={{ marginBottom:8, padding:'10px 18px', background:`${c}08`, border:`1px solid ${c}40`, borderLeft:`3px solid ${c}`, display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:14, letterSpacing:2, color:c }}>{a.title}</div>
              <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#c8e6f0', marginTop:2 }}>{a.body}</div>
            </div>
            <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:9, color:'#4a7090', whiteSpace:'nowrap' }}>{a.author}</div>
          </div>
        )
      })}

      {/* ── Active events ─── */}
      {events.length>0&&(
        <div style={{ marginBottom:16, padding:'12px 18px', background:'rgba(255,215,0,.05)', border:'1px solid rgba(255,215,0,.2)', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
          <span style={{ fontSize:22 }}>🎉</span>
          <div>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:14, letterSpacing:2, color:'#ffd700' }}>ÉVÉNEMENT EN COURS</div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:4 }}>
              {events.map(e=>(
                <div key={e.id} style={{ fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#c8e6f0' }}>
                  {e.title}{e.reward&&<span style={{ color:'#ffd700' }}> · 🎁 {e.reward}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Welcome banner ─── */}
      <div className="card card-accent fade-up" style={{ padding:'32px 40px', marginBottom:36, background:'linear-gradient(135deg,#091525,#0d2137)', overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', right:40, top:'50%', transform:'translateY(-50%)', fontSize:80, opacity:.07, pointerEvents:'none' }}>⚓</div>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:38, letterSpacing:4, color:'#00d4ff' }}>
          BIENVENUE, {(user?.displayName || 'AMIRAL').toUpperCase()}
        </div>
        <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#4a7090', marginTop:6, letterSpacing:1 }}>
          {user?.email} · CHOISISSEZ VOTRE MISSION
        </div>
        <div style={{ display:'flex', gap:12, marginTop:18, flexWrap:'wrap' }}>
          {[['Victoires', wins, '#00ff88'], ['Défaites', losses, '#ff3a3a'], ['Parties', total, '#00d4ff'], ['Ratio', ratio, '#ffd700']].map(([k, v, c]) => (
            <div key={k} style={{ background:'rgba(0,0,0,.3)', border:'1px solid #1a3a5c', padding:'8px 16px', fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#4a7090' }}>
              {k}: <strong style={{ color: c, fontSize:15 }}>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ── Anonymous banner ─── */}
      {isAnon && (
        <div style={{ background:'rgba(255,215,0,.06)', border:'1px solid rgba(255,215,0,.2)', padding:'14px 20px', marginBottom:24, display:'flex', alignItems:'center', gap:12, fontFamily:'Share Tech Mono,monospace', fontSize:12, color:'#aaa055' }}>
          <span style={{ fontSize:20 }}>👤</span>
          <div>
            MODE INVITÉ — Aucune sauvegarde · Parties non enregistrées
            <br/>
            <span onClick={() => navigate('/')} style={{ color:'#00d4ff', cursor:'pointer' }}>
              Créer un compte pour sauvegarder flottes et statistiques →
            </span>
          </div>
        </div>
      )}

      {/* ── Modes ─── */}
      <div className="section-heading">MODES DE JEU</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16, marginBottom:44 }}>
        {modes.map((m, i) => (
          <div key={m.id} className="card hover-glow fade-up" style={{ padding:'28px 24px', cursor:'pointer', animationDelay: i*.07+'s' }} onClick={() => startGame(m.id)}>
            <div style={{ fontSize:36, marginBottom:12 }}>{m.icon}</div>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:20, letterSpacing:3, color:'#00d4ff', marginBottom:8 }}>{m.name}</div>
            <div style={{ fontSize:12, color:'#4a7090', lineHeight:1.6, marginBottom:12 }}>{m.desc}</div>
            <span className="tag">{m.badge}</span>
          </div>
        ))}
      </div>

      {/* ── Fleets ─── */}
      <div className="section-heading" style={{ justifyContent:'space-between' }}>
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>MES FLOTTES</span>
        <button className="btn sm" onClick={() => setFleetModal(true)}>+ NOUVELLE</button>
      </div>

      {fleets === null ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, color:'#4a7090', fontFamily:'Share Tech Mono,monospace', fontSize:12, marginBottom:44 }}>
          <span className="spinner" /> Chargement...
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:44 }}>
          {fleets.map(f => (
            <div key={f.id} className="card fade-up" style={{ padding:18 }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:17, letterSpacing:2, marginBottom:5 }}>{f.name}</div>
              <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:10, color:'#4a7090', marginBottom:4 }}>GRILLE {f.gridSize}×{f.gridSize}</div>
              {f.notes && <div style={{ fontSize:11, color:'#4a7090', marginBottom:10 }}>{f.notes}</div>}
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button className="btn sm" style={{ flex:1 }} onClick={() => { sessionStorage.setItem('selectedFleet', f.id); navigate('/game') }}>▶ UTILISER</button>
                <button className="btn sm danger" onClick={() => deleteFleet(f.id, f.name)}>✕</button>
              </div>
            </div>
          ))}
          <div
            onClick={() => setFleetModal(true)}
            style={{ border:'1px dashed #1a3a5c', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:100, cursor:'pointer', color:'#4a7090', gap:8, transition:'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#00d4ff'; e.currentTarget.style.color='#00d4ff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#1a3a5c'; e.currentTarget.style.color='#4a7090' }}
          >
            <span style={{ fontSize:24 }}>+</span>
            <span style={{ fontFamily:'Share Tech Mono,monospace', fontSize:11, letterSpacing:1 }}>NOUVELLE FLOTTE</span>
          </div>
        </div>
      )}

      {/* ── History ─── */}
      <div className="section-heading">HISTORIQUE</div>
      <div className="card" style={{ overflow:'auto', marginBottom:40 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Date','Mode','Adversaire','Résultat','Tirs'].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontFamily:'Share Tech Mono,monospace', fontSize:11, letterSpacing:1, color:'#4a7090', borderBottom:'1px solid #1a3a5c', textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history === null ? (
              <tr><td colSpan={5} style={{ padding:24, textAlign:'center', fontFamily:'Share Tech Mono,monospace', fontSize:12, color:'#4a7090' }}>Chargement...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:24, textAlign:'center', fontFamily:'Share Tech Mono,monospace', fontSize:12, color:'#4a7090' }}>Aucune partie jouée</td></tr>
            ) : history.map(g => {
              const won  = g.winner === user.uid
              const date = g.createdAt?.toDate ? g.createdAt.toDate().toLocaleDateString('fr-FR') : '—'
              const modeLabel = g.mode === 'online' ? '🌐 En ligne' : g.mode === 'local' ? '👥 Local' : '🤖 vs IA'
              return (
                <tr key={g.id}>
                  <td style={{ padding:'11px 16px', fontFamily:'Share Tech Mono,monospace', fontSize:11, borderBottom:'1px solid rgba(26,58,92,.3)' }}>{date}</td>
                  <td style={{ padding:'11px 16px', fontSize:13, borderBottom:'1px solid rgba(26,58,92,.3)' }}>{modeLabel}</td>
                  <td style={{ padding:'11px 16px', fontSize:13, borderBottom:'1px solid rgba(26,58,92,.3)' }}>{g.opponentName || 'Inconnu'}</td>
                  <td style={{ padding:'11px 16px', fontFamily:'Bebas Neue,sans-serif', fontSize:16, letterSpacing:1, color: won ? '#00ff88' : '#ff3a3a', borderBottom:'1px solid rgba(26,58,92,.3)' }}>{won ? 'VICTOIRE' : 'DÉFAITE'}</td>
                  <td style={{ padding:'11px 16px', fontFamily:'Share Tech Mono,monospace', fontSize:11, borderBottom:'1px solid rgba(26,58,92,.3)' }}>{g.shots || 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Fleet modal ─── */}
      {fleetModal && (
        <div onClick={e => e.target===e.currentTarget && setFleetModal(false)}
          style={{ position:'fixed', inset:0, background:'rgba(5,13,26,.88)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card glow fade-up" style={{ width:'100%', maxWidth:420, padding:40, position:'relative' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#00d4ff,transparent)' }} />
            <button onClick={() => setFleetModal(false)} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', color:'#4a7090', fontSize:20, cursor:'pointer' }}>✕</button>
            <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:26, letterSpacing:4, color:'#00d4ff', marginBottom:24 }}>NOUVELLE FLOTTE</h2>
            <div className="field">
              <label>Nom de la flotte</label>
              <input value={fleetForm.name} onChange={e => setFleetForm(f=>({...f,name:e.target.value}))} placeholder="ex: Flotte Atlantique" maxLength={30} autoFocus />
            </div>
            <div className="field">
              <label>Taille de la grille</label>
              <select value={fleetForm.gridSize} onChange={e => setFleetForm(f=>({...f,gridSize:e.target.value}))}>
                <option value="10">10×10 — Standard</option>
                <option value="12">12×12 — Grand</option>
                <option value="8">8×8 — Rapide</option>
              </select>
            </div>
            <div className="field">
              <label>Notes (optionnel)</label>
              <input value={fleetForm.notes} onChange={e => setFleetForm(f=>({...f,notes:e.target.value}))} placeholder="Ma config préférée..." maxLength={80} />
            </div>
            <button className="btn primary full" style={{ marginTop:8 }} onClick={saveFleet} disabled={saving}>
              {saving ? <><span className="spinner" /> SAUVEGARDE...</> : 'SAUVEGARDER'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
