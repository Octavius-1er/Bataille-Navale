// src/pages/LockerPage.jsx
import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { SEA_THEMES, SHIP_SKINS, RARITY } from '../lib/shopData'

function PreviewGrid({ theme }) {
  const cells = Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r===1&&c===2?'ship':r===3&&c===4?'miss':r===2&&c===0?'hit':null))
  return (
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      {cells.map((row,r)=>(
        <div key={r} style={{display:'flex',gap:2}}>
          {row.map((v,c)=>{
            const bg = v==='ship'?'#1a3a5c':v==='hit'?theme.hitBg:v==='miss'?theme.missBg:theme.cellBg
            const border = v==='ship'?'#2a5a8c':theme.cellBorder
            return <div key={c} style={{width:20,height:20,background:bg,border:`1px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {v==='hit'&&<span style={{color:'#ff6600',fontSize:9}}>✕</span>}
              {v==='miss'&&<span style={{color:'#4a9abb',fontSize:12}}>·</span>}
            </div>
          })}
        </div>
      ))}
    </div>
  )
}

function ShipPreview({ skin }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4}}>
      {['carrier','battleship','cruiser','submarine','destroyer'].map(id=>{
        const sizes={carrier:5,battleship:4,cruiser:3,submarine:3,destroyer:2}
        const st=skin[id]||{bg:'#1a3a5c',border:'#2a5a8c'}
        return (
          <div key={id} style={{display:'flex',gap:2}}>
            {Array(sizes[id]).fill(0).map((_,i)=>(
              <div key={i} style={{width:14,height:14,background:st.bg,border:`1px solid ${st.border}`}}/>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function LockerPage() {
  const { user } = useAuth()
  const toast    = useToast()

  const [owned,       setOwned]       = useState([])
  const [equipped,    setEquipped]    = useState({ seaTheme:'default', shipSkin:'default' })
  const [coins,       setCoins]       = useState(0)
  const [activeTab,   setActiveTab]   = useState('sea')

  useEffect(() => {
    if (user && !user.isAnonymous) load()
  }, [user])

  async function load() {
    try {
      const snap = await getDoc(doc(db,'users',user.uid))
      if (snap.exists()) {
        const d = snap.data()
        setOwned(d.owned||[])
        setEquipped({ seaTheme: d.equippedTheme||'default', shipSkin: d.equippedSkin||'default' })
        setCoins(d.coins||0)
      }
    } catch(e) { console.error(e) }
  }

  async function equipTheme(id) {
    setEquipped(e=>({...e,seaTheme:id}))
    await updateDoc(doc(db,'users',user.uid),{equippedTheme:id})
    toast('Thème équipé !','success')
  }

  async function equipSkin(id) {
    setEquipped(e=>({...e,shipSkin:id}))
    await updateDoc(doc(db,'users',user.uid),{equippedSkin:id})
    toast('Flotte équipée !','success')
  }

  const availableThemes = Object.values(SEA_THEMES).filter(t=>t.free||owned.includes(t.id))
  const availableSkins  = Object.values(SHIP_SKINS).filter(s=>s.free||owned.includes(s.id))

  const tabBtn = (t,label) => ({
    padding:'7px 18px', fontFamily:'Bebas Neue,sans-serif', fontSize:14, letterSpacing:2,
    background: activeTab===t?'rgba(0,212,255,.1)':'transparent',
    border:`1px solid ${activeTab===t?'#00d4ff':'#1a3a5c'}`, color:activeTab===t?'#00d4ff':'#4a7090',
    cursor:'pointer', transition:'all .15s',
  })

  return (
    <div style={{padding:'36px 40px',maxWidth:1100,margin:'0 auto',position:'relative',zIndex:1}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28,flexWrap:'wrap'}}>
        <div>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:32,letterSpacing:5,color:'#00d4ff',marginBottom:4}}>🗄 CASIER</div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>ÉQUIPEZ VOS COSMÉTIQUES</div>
        </div>
        <div style={{marginLeft:'auto',padding:'8px 16px',background:'rgba(255,215,0,.08)',border:'1px solid rgba(255,215,0,.3)',display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:18}}>🪙</span>
          <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,color:'#ffd700'}}>{coins}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:28}}>
        <button style={tabBtn('sea','🌊 THÈMES MER')} onClick={()=>setActiveTab('sea')}>🌊 THÈMES MER</button>
        <button style={tabBtn('ship','⚓ FLOTTES')} onClick={()=>setActiveTab('ship')}>⚓ FLOTTES</button>
      </div>

      {/* ── SEA THEMES ──────────────────────────────────────── */}
      {activeTab==='sea' && (
        <div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:16}}>
            {availableThemes.length} THÈME{availableThemes.length!==1?'S':''} DISPONIBLE{availableThemes.length!==1?'S':''}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
            {availableThemes.map(theme=>{
              const r=RARITY[theme.rarity]||RARITY.common
              const isEquipped=equipped.seaTheme===theme.id
              return (
                <div key={theme.id} className="card" style={{padding:20,cursor:'pointer',border:`2px solid ${isEquipped?r.color:'#1a3a5c'}`,boxShadow:isEquipped?`0 0 16px ${r.glow}`:'none',transition:'all .2s'}}
                  onClick={()=>equipTheme(theme.id)}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:24,marginBottom:4}}>{theme.icon}</div>
                      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:2,color:isEquipped?r.color:'#c8e6f0'}}>{theme.name}</div>
                      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:r.color}}>{r.label}</div>
                    </div>
                    {isEquipped&&<div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:12,letterSpacing:2,color:'#00ff88',border:'1px solid rgba(0,255,136,.4)',padding:'3px 8px'}}>✓ ÉQUIPÉ</div>}
                  </div>
                  <PreviewGrid theme={theme}/>
                  {!isEquipped&&(
                    <div style={{marginTop:10,fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',textAlign:'center'}}>Cliquez pour équiper</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SHIP SKINS ──────────────────────────────────────── */}
      {activeTab==='ship' && (
        <div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',marginBottom:16}}>
            {availableSkins.length} FLOTTE{availableSkins.length!==1?'S':''} DISPONIBLE{availableSkins.length!==1?'S':''}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
            {availableSkins.map(skin=>{
              const r=RARITY[skin.rarity]||RARITY.common
              const isEquipped=equipped.shipSkin===skin.id
              return (
                <div key={skin.id} className="card" style={{padding:20,cursor:'pointer',border:`2px solid ${isEquipped?r.color:'#1a3a5c'}`,boxShadow:isEquipped?`0 0 16px ${r.glow}`:'none',transition:'all .2s'}}
                  onClick={()=>equipSkin(skin.id)}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:24,marginBottom:4}}>{skin.icon}</div>
                      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:2,color:isEquipped?r.color:'#c8e6f0'}}>{skin.name}</div>
                      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:r.color}}>{r.label}</div>
                    </div>
                    {isEquipped&&<div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:12,letterSpacing:2,color:'#00ff88',border:'1px solid rgba(0,255,136,.4)',padding:'3px 8px'}}>✓ ÉQUIPÉ</div>}
                  </div>
                  <ShipPreview skin={skin}/>
                  {!isEquipped&&(
                    <div style={{marginTop:10,fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090',textAlign:'center'}}>Cliquez pour équiper</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
