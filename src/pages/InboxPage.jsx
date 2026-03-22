// src/pages/InboxPage.jsx
// Boîte de réception — messages système et récompenses admin

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, updateDoc, doc, increment, arrayUnion } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { SEA_THEMES, SHIP_SKINS, RARITY } from '../lib/shopData'

export default function InboxPage() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()

  const [messages, setMessages] = useState(null)
  const [claiming, setClaiming] = useState(null)

  useEffect(() => {
    if (user && !user.isAnonymous) load()
  }, [user])

  async function load() {
    try {
      const q = query(collection(db,'inbox'), where('uid','==',user.uid))
      const snap = await getDocs(q)
      const msgs = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      msgs.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))
      setMessages(msgs)
    } catch { setMessages([]) }
  }

  async function markRead(id) {
    await updateDoc(doc(db,'inbox',id), { read:true })
    setMessages(m => m.map(x => x.id===id ? {...x, read:true} : x))
  }

  async function deleteMessage(id) {
    await deleteDoc(doc(db,'inbox',id))
    setMessages(m => m.filter(x => x.id !== id))
    toast('Message supprimé','info')
  }

  async function claimReward(msg) {
    if (msg.claimed) return
    setClaiming(msg.id)
    try {
      const updates = { claimed:true, read:true }
      await updateDoc(doc(db,'inbox',msg.id), updates)

      // Apply rewards to user
      const userUpdates = {}
      if (msg.coins  > 0) userUpdates.coins  = increment(msg.coins)
      if (msg.wins   > 0) userUpdates.wins   = increment(msg.wins)
      if (msg.losses > 0) userUpdates.losses = increment(msg.losses)
      if (msg.skin)       userUpdates.owned  = arrayUnion(msg.skin)
      // Pack items (pre-rolled by admin)
      if (msg.packItems?.length > 0) {
        userUpdates.owned = arrayUnion(...msg.packItems.filter(id=>id&&!id.startsWith('coins')))
      }

      if (Object.keys(userUpdates).length > 0) {
        await updateDoc(doc(db,'users',user.uid), userUpdates)
      }

      // Update local state
      setMessages(m => m.map(x => x.id===msg.id ? {...x, claimed:true, read:true} : x))

      // Toast summary
      const parts = []
      if (msg.coins  > 0) parts.push(`+${msg.coins} 🪙`)
      if (msg.wins   > 0) parts.push(`+${msg.wins} victoires`)
      if (msg.losses > 0) parts.push(`+${msg.losses} défaites`)
      if (msg.skin) {
        const item = SEA_THEMES[msg.skin] || SHIP_SKINS[msg.skin]
        if (item) parts.push(`${item.icon} ${item.name} débloqué !`)
      }
      if (msg.packItems?.length > 0) parts.push(`📦 ${msg.packItems.length} objets débloqués !`)
      toast(parts.length ? parts.join(' · ') : 'Récompense réclamée !', 'success')
      refreshProfile()
    } catch(e) { toast('Erreur: '+e.message,'error') }
    setClaiming(null)
  }

  const unread = messages?.filter(m => !m.read).length || 0

  return (
    <div style={{ padding:'36px 40px', maxWidth:800, margin:'0 auto', position:'relative', zIndex:1 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28 }}>
        <div>
          <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, letterSpacing:5, color:'#00d4ff', marginBottom:4 }}>
            📬 BOÎTE DE RÉCEPTION
          </div>
          <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#4a7090' }}>
            {messages === null ? 'Chargement...' : `${messages.length} MESSAGE${messages.length!==1?'S':''}`}
            {unread > 0 && <span style={{ marginLeft:10, color:'#ff3a3a', border:'1px solid rgba(255,58,58,.4)', padding:'1px 8px', fontSize:10 }}>{unread} NON LU{unread>1?'S':''}</span>}
          </div>
        </div>
      </div>

      {/* Messages */}
      {messages === null ? (
        <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:12, color:'#4a7090', display:'flex', alignItems:'center', gap:10 }}>
          <span className="spinner"/> Chargement...
        </div>
      ) : messages.length === 0 ? (
        <div className="card" style={{ padding:40, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:20, letterSpacing:3, color:'#4a7090' }}>AUCUN MESSAGE</div>
          <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#2a4a6a', marginTop:8 }}>
            Les annonces et récompenses admin apparaîtront ici.
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {messages.map(msg => {
            const isReward = msg.type === 'reward'
            const hasItems = msg.coins > 0 || msg.wins > 0 || msg.losses > 0 || msg.skin
            const skinItem = msg.skin ? (SEA_THEMES[msg.skin] || SHIP_SKINS[msg.skin]) : null
            const skinRarity = skinItem ? RARITY[skinItem.rarity] : null

            return (
              <div key={msg.id} className="card" style={{
                padding:22,
                borderLeft:`3px solid ${!msg.read ? '#00d4ff' : isReward ? '#ffd700' : '#1a3a5c'}`,
                opacity: msg.claimed && !hasItems ? 0.6 : 1,
                transition:'all .2s',
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1 }}>
                    {/* Header */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <span style={{ fontSize:20 }}>{isReward ? '🎁' : msg.type==='system' ? '⚙️' : '📢'}</span>
                      <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:15, letterSpacing:2, color: !msg.read?'#00d4ff':'#c8e6f0' }}>
                        {msg.from || 'Système'}
                      </span>
                      {!msg.read && <span style={{ fontFamily:'Share Tech Mono,monospace', fontSize:9, color:'#00d4ff', border:'1px solid rgba(0,212,255,.4)', padding:'1px 6px' }}>NOUVEAU</span>}
                      {msg.claimed && <span style={{ fontFamily:'Share Tech Mono,monospace', fontSize:9, color:'#00ff88', border:'1px solid rgba(0,255,136,.3)', padding:'1px 6px' }}>✓ RÉCLAMÉ</span>}
                      <span style={{ fontFamily:'Share Tech Mono,monospace', fontSize:9, color:'#2a4a6a', marginLeft:'auto' }}>
                        {msg.createdAt ? new Date(msg.createdAt.seconds*1000).toLocaleDateString('fr-FR', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}
                      </span>
                    </div>

                    {/* Message text */}
                    <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:12, color:'#c8e6f0', lineHeight:1.7, marginBottom: hasItems ? 14 : 0 }}>
                      {msg.message}
                    </div>

                    {/* Reward items preview */}
                    {hasItems && (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                        {msg.coins > 0 && (
                          <div style={{ padding:'6px 14px', background:'rgba(255,215,0,.1)', border:'1px solid rgba(255,215,0,.3)', fontFamily:'Bebas Neue,sans-serif', fontSize:16, letterSpacing:1, color:'#ffd700' }}>
                            🪙 {msg.coins}
                          </div>
                        )}
                        {msg.wins > 0 && (
                          <div style={{ padding:'6px 14px', background:'rgba(0,255,136,.08)', border:'1px solid rgba(0,255,136,.25)', fontFamily:'Bebas Neue,sans-serif', fontSize:16, letterSpacing:1, color:'#00ff88' }}>
                            🏆 +{msg.wins} V
                          </div>
                        )}
                        {msg.losses > 0 && (
                          <div style={{ padding:'6px 14px', background:'rgba(255,102,102,.08)', border:'1px solid rgba(255,102,102,.25)', fontFamily:'Bebas Neue,sans-serif', fontSize:16, letterSpacing:1, color:'#ff6666' }}>
                            💀 +{msg.losses} D
                          </div>
                        )}
                        {msg.pack && (
                          <div style={{ padding:'6px 14px', background:'rgba(68,136,255,.08)', border:'1px solid rgba(68,136,255,.25)', fontFamily:'Bebas Neue,sans-serif', fontSize:14, letterSpacing:1, color:'#4488ff' }}>
                            📦 Pack offert
                          </div>
                        )}
                        {skinItem && (
                          <div style={{ padding:'6px 14px', background:`${skinRarity?.color||'#4a7090'}15`, border:`1px solid ${skinRarity?.color||'#4a7090'}55`, fontFamily:'Bebas Neue,sans-serif', fontSize:14, letterSpacing:1, color:skinRarity?.color||'#c8e6f0' }}>
                            {skinItem.icon} {skinItem.name} <span style={{fontSize:10,opacity:.7}}>— {skinRarity?.label}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:8, marginTop:hasItems?0:8 }}>
                  {isReward && !msg.claimed && (
                    <button onClick={() => claimReward(msg)}
                      disabled={claiming===msg.id}
                      style={{ padding:'8px 20px', fontFamily:'Bebas Neue,sans-serif', fontSize:15, letterSpacing:2,
                        background:'rgba(255,215,0,.12)', border:'2px solid #ffd700', color:'#ffd700',
                        cursor:'pointer', transition:'all .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,215,0,.25)'}
                      onMouseLeave={e=>e.currentTarget.style.background='rgba(255,215,0,.12)'}>
                      {claiming===msg.id ? '...' : '🎁 RÉCLAMER'}
                    </button>
                  )}
                  {!msg.read && (
                    <button onClick={() => markRead(msg.id)}
                      style={{ padding:'8px 14px', fontFamily:'Share Tech Mono,monospace', fontSize:10,
                        background:'transparent', border:'1px solid #1a3a5c', color:'#4a7090', cursor:'pointer' }}>
                      Marquer comme lu
                    </button>
                  )}
                  <button onClick={() => deleteMessage(msg.id)}
                    style={{ padding:'8px 14px', fontFamily:'Share Tech Mono,monospace', fontSize:10,
                      background:'transparent', border:'1px solid rgba(255,58,58,.3)', color:'#ff3a3a', cursor:'pointer',
                      marginLeft:'auto' }}>
                    🗑 SUPPRIMER
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
