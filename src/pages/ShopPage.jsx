// src/pages/ShopPage.jsx
import { useState, useEffect, useRef } from 'react'
import { doc, getDoc, updateDoc, arrayUnion, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { RewardedAdButton, AdBanner } from '../components/AdSense'
import { PACKS, ALL_ITEMS, SEA_THEMES, SHIP_SKINS, RARITY, openPack, COIN_REWARDS, getItemIcon } from '../lib/shopData'

const TAB = { PACKS:'packs', ITEMS:'items' }

// ── Satisfying pack roll sound using Web Audio ────────────────────
function playTick() {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.08)
    osc.start(); osc.stop(ctx.currentTime+0.08)
  } catch {}
}

function playWin(rarity) {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)()
    const freqs = rarity==='legendary'?[523,659,784,1047]:rarity==='epic'?[440,554,659]:rarity==='rare'?[392,494]:[330]
    freqs.forEach((f,i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = f
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.3, t+0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t+0.4)
      osc.start(t); osc.stop(t+0.4)
    })
  } catch {}
}

// ── Item card ─────────────────────────────────────────────────────
function ItemCard({ item, size='md', glowing=false, owned=false }) {
  if (!item) return null
  const r = RARITY[item.rarity] || RARITY.common
  const w = size==='sm'?80:size==='md'?120:160
  const h = size==='sm'?100:size==='md'?150:200
  return (
    <div style={{
      width:w, height:h, flexShrink:0,
      background:`linear-gradient(135deg,#050d1a,#091525)`,
      border:`2px solid ${glowing?r.color:'#1a3a5c'}`,
      boxShadow: glowing?`0 0 24px ${r.glow},0 0 48px ${r.glow}`:'none',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:8, textAlign:'center', position:'relative', transition:'box-shadow .3s',
      borderRadius:2,
    }}>
      {/* Rarity top bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:r.color,opacity:.8}}/>
      {owned&&<div style={{position:'absolute',top:4,right:4,fontFamily:'Share Tech Mono,monospace',fontSize:8,color:'#00ff88',background:'rgba(0,255,136,.15)',border:'1px solid rgba(0,255,136,.3)',padding:'1px 4px'}}>✓</div>}
      <div style={{fontSize:size==='sm'?22:size==='md'?34:44,marginBottom:6}}>{item.icon||'📦'}</div>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:size==='sm'?11:size==='md'?14:18,letterSpacing:1,color:'#c8e6f0',lineHeight:1.2,marginBottom:4}}>{item.name}</div>
      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:size==='sm'?8:9,color:r.color,letterSpacing:1}}>{r.label}</div>
      {item.type&&<div style={{fontFamily:'Share Tech Mono,monospace',fontSize:8,color:'#2a4a6a',marginTop:2}}>{item.type==='sea_theme'?'THÈME MER':'NAVIRES'}</div>}
    </div>
  )
}

// ── Item icon component ──────────────────────────────────────────
function ItemIcon({ itemId, size=72 }) {
  const src = getItemIcon(itemId, size)
  if (src) return <img src={src} width={size} height={size} style={{imageRendering:'pixelated'}} alt=""/>
  // Fallback: colored square
  return <div style={{width:size,height:size,background:'#1a3a5c',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.5}}>📦</div>
}

// ── Reel card ─────────────────────────────────────────────────────
function ReelCard({ item, highlight=false, size=78 }) {
  if (!item) return <div style={{width:size,height:size+44,flexShrink:0}}/>
  const r = RARITY[item.rarity] || RARITY.common
  return (
    <div style={{
      width: size, flexShrink:0,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      background: highlight ? `${r.color}18` : '#060e1c',
      border: `1px solid ${highlight ? r.color : '#0f2030'}`,
      boxShadow: highlight ? `0 0 18px ${r.glow}` : 'none',
      padding: '6px 3px',
      transition: 'all 0.2s',
      position: 'relative',
    }}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:r.color,opacity:highlight?0.9:0.2}}/>
      <ItemIcon itemId={item.id} size={46}/>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:10,letterSpacing:1,color:highlight?r.color:'#6a9abb',marginTop:4,textAlign:'center',lineHeight:1.2,maxWidth:size-6,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{item.name}</div>
      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:7,color:r.color,marginTop:1,opacity:highlight?1:0.6}}>{r.label}</div>
    </div>
  )
}

// ── Horizontal Reel (Grow-a-Garden style) ─────────────────────────
function PackReel({ items, onDone }) {
  const CARD_W     = 90   // card width px
  const CARD_GAP   = 6
  const CARD_TOTAL = CARD_W + CARD_GAP
  const REEL_COUNT = 32   // cards visible in reel
  const WINNER_POS = 22   // winner lands at this position (0-indexed)

  const trackRef  = useRef(null)
  const [reelItems,   setReelItems]   = useState([])
  const [itemIdx,     setItemIdx]     = useState(0)
  const [phase,       setPhase]       = useState('idle') // idle|spinning|stopped
  const [winnerIdx,   setWinnerIdx]   = useState(null)
  const [revealed,    setRevealed]    = useState([])
  const started = useRef(false)
  const timers  = useRef([])

  function t(fn, ms) { const id = setTimeout(fn, ms); timers.current.push(id) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function buildReel(winItem) {
    const pool = ALL_ITEMS.length > 1 ? ALL_ITEMS.filter(x=>x.id!==winItem.id) : ALL_ITEMS
    const arr = Array.from({length: REEL_COUNT}, (_, i) =>
      i === WINNER_POS ? winItem : pool[Math.floor(Math.random()*pool.length)]
    )
    return arr
  }

  function spinFor(i) {
    if (i >= items.length) { setPhase('done'); setTimeout(()=>onDone?.(items), 800); return }
    setItemIdx(i)
    setWinnerIdx(null)
    const win   = items[i]
    const reel  = buildReel(win)
    setReelItems(reel)
    setPhase('idle')

    // Wait for DOM render then animate
    t(() => {
      const el = trackRef.current
      if (!el) return

      // Start far right (off-screen)
      const startX = CARD_TOTAL * 4
      el.style.transition = 'none'
      el.style.transform  = `translateX(${startX}px)`
      void el.offsetWidth // force reflow

      // Target: center the winner card
      const containerW = el.parentElement?.offsetWidth || 900
      const targetX = -(WINNER_POS * CARD_TOTAL) + containerW/2 - CARD_W/2

      setPhase('spinning')

      // Fire animation
      t(() => {
        el.style.transition = 'transform 4s cubic-bezier(0.25, 1, 0.3, 1)'
        el.style.transform  = `translateX(${targetX}px)`

        // Tick sounds while spinning
        let ticks = 0
        const tickId = setInterval(() => {
          playTick()
          if (++ticks > 35) clearInterval(tickId)
        }, 100)

        // After scroll stops
        t(() => {
          clearInterval(tickId)
          setPhase('stopped')
          setWinnerIdx(WINNER_POS)
          playWin(win.rarity)
          setRevealed(prev => [...prev, i])

          // Move to next
          t(() => spinFor(i + 1), 2200)
        }, 4100)
      }, 80)
    }, 60)
  }

  useEffect(() => {
    if (started.current || items.length === 0) return
    started.current = true
    spinFor(0)
  }, [])

  const currentWinner = winnerIdx !== null ? reelItems[winnerIdx] : null
  const wr = currentWinner ? RARITY[currentWinner.rarity] : null

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(3,8,18,.97)', zIndex:2000,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      overflow:'hidden',
    }}>
      {/* Counter */}
      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:12,color:'#4a7090',
        marginBottom:20,letterSpacing:3}}>
        OBJET {itemIdx+1} / {items.length}
      </div>

      {/* Reel track */}
      <div style={{
        width:'100%', position:'relative', overflow:'hidden',
        height: CARD_W + 52, marginBottom:28,
      }}>
        {/* Left/right fade */}
        <div style={{position:'absolute',inset:0,zIndex:10,pointerEvents:'none',
          background:'linear-gradient(90deg,rgba(3,8,18,1) 0%,transparent 20%,transparent 80%,rgba(3,8,18,1) 100%)'}}/>
        {/* Center selector */}
        <div style={{
          position:'absolute', top:0, bottom:0, left:'50%',
          transform:`translateX(${-CARD_W/2-4}px)`,
          width: CARD_W+8,
          border: `3px solid ${wr?.color||'#00d4ff'}`,
          boxShadow: wr ? `0 0 20px ${wr.glow}` : '0 0 12px rgba(0,212,255,.3)',
          zIndex:11, pointerEvents:'none',
          transition:'border-color 0.3s, box-shadow 0.3s',
        }}/>

        {/* The scrolling track */}
        <div ref={trackRef} style={{
          display:'flex', gap:CARD_GAP+'px', padding:'4px 0',
          position:'absolute', top:0, left:0,
          willChange:'transform',
        }}>
          {reelItems.map((item, i) => (
            <ReelCard key={i} item={item}
              size={CARD_W}
              highlight={phase==='stopped' && i===winnerIdx}/>
          ))}
        </div>
      </div>

      {/* Winner name */}
      {phase==='stopped' && currentWinner && wr && (
        <div style={{textAlign:'center',marginBottom:24,animation:'fadeUp .3s ease'}}>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:32,letterSpacing:6,
            color:wr.color,textShadow:`0 0 30px ${wr.glow}`,marginBottom:4}}>
            {wr.label} !
          </div>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,letterSpacing:2,color:'#c8e6f0'}}>
            {currentWinner.name}
          </div>
        </div>
      )}

      {/* Already received */}
      {revealed.length > 0 && (
        <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center',padding:'0 24px',maxWidth:700}}>
          {revealed.map(i => {
            const it = items[i]; const ri = RARITY[it.rarity]
            return (
              <div key={i} style={{textAlign:'center',padding:'6px 10px',
                background:'#091525',border:`2px solid ${ri?.color||'#1a3a5c'}`,
                boxShadow:`0 0 8px ${ri?.glow||'transparent'}`,minWidth:70}}>
                <ItemIcon itemId={it.id} size={40}/>
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:8,
                  color:ri?.color,marginTop:3}}>{it.name}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ShopPage ─────────────────────────────────────────────────
export default function ShopPage() {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()

  const [tab,      setTab]      = useState(TAB.PACKS)
  const [coins,    setCoins]    = useState(0)
  const [owned,    setOwned]    = useState([])
  const [opening,  setOpening]  = useState(null) // { items } during pack opening
  const [buying,   setBuying]   = useState(null)

  useEffect(() => {
    if (user && !user.isAnonymous) loadInventory()
  }, [user])

  async function loadInventory() {
    try {
      const snap = await getDoc(doc(db,'users',user.uid))
      if (snap.exists()) {
        const d = snap.data()
        setCoins(d.coins||0)
        setOwned(d.owned||[])
      }
    } catch(e) { console.error(e) }
  }

  async function buyPack(pack) {
    if (pack.starterOnly && owned.includes('__starter_claimed__')) {
      toast('Pack Starter déjà réclamé !', 'error'); return
    }
    if (coins < pack.cost) { toast(`Pas assez de 🪙 ! (${pack.cost} requis)`, 'error'); return }
    setBuying(pack.id)
    try {
      // Roll items
      const items = openPack(pack, owned)
      // Deduct coins and add items to Firestore
      const newOwnedIds = items.filter(i=>i.type!=='coins').map(i=>i.id)
      if (pack.starterOnly) newOwnedIds.push('__starter_claimed__')
      const refundCoins = items.filter(i=>i.type==='coins').reduce((s,i)=>s+i.refund,0)
      await updateDoc(doc(db,'users',user.uid), {
        coins: increment(-pack.cost + refundCoins),
        owned: arrayUnion(...newOwnedIds),
      })
      setCoins(c => c - pack.cost + refundCoins)
      setOwned(o => [...new Set([...o,...newOwnedIds])])
      // Show opening animation
      setOpening(items)
    } catch(e) { toast('Erreur: '+e.message,'error') }
    setBuying(null)
  }

  function onReelDone() {
    setTimeout(() => setOpening(null), 500)
    refreshProfile()
  }

  const tabBtn = (t,label) => ({
    padding:'8px 20px', fontFamily:'Bebas Neue,sans-serif', fontSize:15, letterSpacing:2,
    background: tab===t?'rgba(0,212,255,.1)':'transparent',
    border:`1px solid ${tab===t?'#00d4ff':'#1a3a5c'}`, color:tab===t?'#00d4ff':'#4a7090',
    cursor:'pointer', transition:'all .15s',
  })

  return (
    <div style={{padding:'36px 40px',maxWidth:1100,margin:'0 auto',position:'relative',zIndex:1}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28,flexWrap:'wrap'}}>
        <div>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:32,letterSpacing:5,color:'#00d4ff',marginBottom:4}}>🏪 MAGASIN</div>
          <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>COSMÉTIQUES · THÈMES · FLOTTES</div>
        </div>
        {/* Coin display */}
        <div style={{marginLeft:'auto',padding:'10px 20px',background:'rgba(255,215,0,.08)',border:'1px solid rgba(255,215,0,.3)',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:24}}>🪙</span>
          <div>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:28,letterSpacing:2,color:'#ffd700'}}>{coins}</div>
            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090'}}>PIÈCES</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:28}}>
        <button style={tabBtn(TAB.PACKS,'PACKS')} onClick={()=>setTab(TAB.PACKS)}>📦 PACKS</button>
        <button style={tabBtn(TAB.ITEMS,'ITEMS')} onClick={()=>setTab(TAB.ITEMS)}>🎨 TOUS LES OBJETS</button>
      </div>

      {/* Earn coins */}
      <div style={{marginBottom:16,padding:'12px 16px',background:'rgba(255,215,0,.04)',border:'1px solid rgba(255,215,0,.15)',fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090'}}>
        💡 Victoire: +{COIN_REWARDS.win}🪙 · Défaite: +{COIN_REWARDS.loss}🪙 · Pub: +30🪙
      </div>

      {/* Rewarded Ad */}
      <div style={{marginBottom:24,maxWidth:500}}>
        <RewardedAdButton onRewarded={amt => setCoins(c => c + amt)}/>
      </div>

      {/* Ad banner */}
      <AdBanner style={{marginBottom:24}}/>

      {/* ── PACKS TAB ──────────────────────────────────────────────── */}
      {tab===TAB.PACKS && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
          {Object.values(PACKS).map(pack => (
            <div key={pack.id} className="card fade-up" style={{padding:32,textAlign:'center',position:'relative',overflow:'hidden',border:`1px solid ${pack.color}44`}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${pack.color},transparent)`}}/>
              <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 0%,${pack.glow},transparent 60%)`,pointerEvents:'none'}}/>

              <div style={{fontSize:64,marginBottom:12}}>{pack.icon}</div>
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:26,letterSpacing:4,color:pack.color,marginBottom:6}}>{pack.name}</div>
              <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:'#4a7090',marginBottom:8}}>{pack.desc}</div>

              {/* Rarity distribution */}
              <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:20,flexWrap:'wrap'}}>
                {[...new Set(pack.rarityPool)].map(r=>(
                  <span key={r} style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:RARITY[r].color,border:`1px solid ${RARITY[r].color}55`,padding:'2px 8px'}}>
                    {pack.rarityPool.filter(x=>x===r).length}× {RARITY[r].label}
                  </span>
                ))}
              </div>

              <button
                onClick={()=>buyPack(pack)}
                disabled={buying===pack.id||coins<pack.cost}
                style={{width:'100%',padding:'14px',fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:3,
                  background:coins>=pack.cost?`${pack.color}20`:'transparent',
                  border:`2px solid ${coins>=pack.cost?pack.color:'#1a3a5c'}`,
                  color:coins>=pack.cost?pack.color:'#2a4a6a',
                  cursor:coins>=pack.cost?'pointer':'not-allowed',
                  transition:'all .2s',
                }}
                onMouseEnter={e=>{if(coins>=pack.cost)e.currentTarget.style.background=`${pack.color}35`}}
                onMouseLeave={e=>{if(coins>=pack.cost)e.currentTarget.style.background=`${pack.color}20`}}
              >
                🪙 {pack.cost} PIÈCES
              </button>

              {coins<pack.cost&&(
                <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#ff3a3a',marginTop:8}}>
                  Manque {pack.cost-coins} 🪙
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ITEMS TAB ──────────────────────────────────────────────── */}
      {tab===TAB.ITEMS && (
        <div>
          {/* Sea themes */}
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:4,color:'#00d4ff',marginBottom:16}}>🌊 THÈMES DE MER</div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:32}}>
            {Object.values(SEA_THEMES).map(t=>(
              <div key={t.id} style={{opacity:t.free||owned.includes(t.id)?1:.5}}>
                <ItemCard item={{...t,type:'sea_theme'}} size='md' glowing={owned.includes(t.id)} owned={owned.includes(t.id)||t.free}/>
              </div>
            ))}
          </div>

          {/* Ship skins */}
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:4,color:'#00d4ff',marginBottom:16}}>⚓ FLOTTES</div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            {Object.values(SHIP_SKINS).map(s=>(
              <div key={s.id} style={{opacity:s.free||owned.includes(s.id)?1:.5}}>
                <ItemCard item={{...s,type:'ship_skin'}} size='md' glowing={owned.includes(s.id)} owned={owned.includes(s.id)||s.free}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pack opening overlay ──────────────────────────────────── */}
      {opening && <PackReel items={opening} onDone={onReelDone}/>}
    </div>
  )
}
