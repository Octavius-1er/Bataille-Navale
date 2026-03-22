// src/components/AdSense.jsx
// Google AdSense integration
// IMPORTANT: Replace XXXXXXXXXXXXXXXX with your real publisher ID (ca-pub-...)
// and replace the slot IDs with your real ad unit IDs from AdSense dashboard

import { useEffect, useRef, useState } from 'react'
import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './Toast'

// ── Your AdSense publisher ID ─────────────────────────────────────
// Replace this with your real ID from adsense.google.com
const PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXX'

// ── Ad slot IDs (create these in your AdSense dashboard) ──────────
const AD_SLOTS = {
  banner:   '0000000001',  // Display ad — 728x90 leaderboard
  sidebar:  '0000000002',  // Display ad — 300x250 rectangle
  rewarded: '0000000003',  // Rewarded ad — video
}

// ── Coins earned per rewarded ad view ─────────────────────────────
const REWARDED_COINS = 30

// ── Display Banner Ad ─────────────────────────────────────────────
export function AdBanner({ slot = 'banner', style = {} }) {
  const adRef = useRef(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    if (typeof window === 'undefined') return
    // Don't show ads if AdSense not loaded yet
    if (!window.adsbygoogle) return
    try {
      pushed.current = true
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch(e) {
      console.warn('AdSense push error:', e)
    }
  }, [])

  // Don't render if publisher ID not set
  if (PUBLISHER_ID === 'ca-pub-XXXXXXXXXXXXXXXX') {
    return (
      <div style={{
        background:'rgba(0,212,255,.04)',
        border:'1px dashed rgba(0,212,255,.2)',
        padding:'10px 20px',
        textAlign:'center',
        fontFamily:'Share Tech Mono,monospace',
        fontSize:10,
        color:'#2a4a6a',
        ...style
      }}>
        📢 ESPACE PUBLICITAIRE — En attente d'approbation AdSense
      </div>
    )
  }

  return (
    <div style={{ textAlign:'center', overflow:'hidden', ...style }}>
      <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:8, color:'#2a4a6a', marginBottom:4 }}>
        PUBLICITÉ
      </div>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display:'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={AD_SLOTS[slot] || AD_SLOTS.banner}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

// ── Rewarded Ad Button ────────────────────────────────────────────
// Shows a simulated countdown until AdSense is approved
// Once approved, replace with real rewarded ad logic
export function RewardedAdButton({ onRewarded }) {
  const { user } = useAuth()
  const toast = useToast()
  const [state,    setState]    = useState('idle') // idle | watching | done
  const [countdown, setCountdown] = useState(0)
  const [canWatch, setCanWatch] = useState(true)
  const timerRef = useRef(null)

  // Check last watch time (max once per 10 min)
  useEffect(() => {
    const last = localStorage.getItem('lastAdWatch')
    if (last) {
      const elapsed = Date.now() - parseInt(last)
      if (elapsed < 10 * 60 * 1000) setCanWatch(false)
      else setCanWatch(true)
    }
  }, [])

  async function watchAd() {
    if (!canWatch) { toast('Attend 10 minutes entre chaque pub !', 'error'); return }
    if (!user || user.isAnonymous) { toast('Connecte-toi pour gagner des pièces !', 'error'); return }

    setState('watching')
    setCountdown(15)

    // If real AdSense rewarded ad is available, use it
    // Otherwise simulate with countdown
    const adsbygoogle = window.adsbygoogle
    if (adsbygoogle && PUBLISHER_ID !== 'ca-pub-XXXXXXXXXXXXXXXX') {
      // Real rewarded ad
      try {
        adsbygoogle.push({
          googletag: {
            cmd: [function() {
              googletag.pubads().addEventListener('rewardedSlotGranted', async () => {
                await giveReward()
              })
            }]
          }
        })
      } catch { }
    }

    // Countdown (works as standalone + as fallback)
    let t = 15
    timerRef.current = setInterval(() => {
      t--
      setCountdown(t)
      if (t <= 0) {
        clearInterval(timerRef.current)
        giveReward()
      }
    }, 1000)
  }

  async function giveReward() {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        coins: increment(REWARDED_COINS)
      })
      localStorage.setItem('lastAdWatch', Date.now().toString())
      setCanWatch(false)
      setState('done')
      toast(`+${REWARDED_COINS} 🪙 gagnés !`, 'success')
      onRewarded?.(REWARDED_COINS)
      setTimeout(() => setState('idle'), 3000)
    } catch(e) {
      toast('Erreur: ' + e.message, 'error')
      setState('idle')
    }
  }

  useEffect(() => () => { if(timerRef.current) clearInterval(timerRef.current) }, [])

  if (state === 'watching') return (
    <div style={{
      padding:'16px 24px',
      background:'rgba(0,212,255,.06)',
      border:'1px solid rgba(0,212,255,.3)',
      textAlign:'center',
    }}>
      <div style={{
        fontFamily:'Bebas Neue,sans-serif',
        fontSize:48,
        color:'#00d4ff',
        lineHeight:1,
        marginBottom:6,
      }}>{countdown}</div>
      <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#4a7090'}}>
        REGARDEZ LA PUBLICITÉ...
      </div>
      {/* Simulated ad space */}
      {PUBLISHER_ID === 'ca-pub-XXXXXXXXXXXXXXXX' && (
        <div style={{
          margin:'10px 0',
          height:90,
          background:'linear-gradient(135deg,#091525,#0d2137)',
          border:'1px dashed #1a3a5c',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'Share Tech Mono,monospace', fontSize:10, color:'#2a4a6a',
        }}>
          [ESPACE PUBLICITAIRE — En attente AdSense]
        </div>
      )}
      <div style={{
        height:4, background:'#1a3a5c', marginTop:8, borderRadius:2, overflow:'hidden',
      }}>
        <div style={{
          height:'100%',
          width:`${((15 - countdown) / 15) * 100}%`,
          background:'#00d4ff',
          transition:'width 1s linear',
        }}/>
      </div>
    </div>
  )

  if (state === 'done') return (
    <div style={{
      padding:'16px 24px',
      background:'rgba(0,255,136,.08)',
      border:'1px solid rgba(0,255,136,.3)',
      textAlign:'center',
      fontFamily:'Bebas Neue,sans-serif',
      fontSize:20,
      letterSpacing:2,
      color:'#00ff88',
    }}>
      +{REWARDED_COINS} 🪙 GAGNÉS !
    </div>
  )

  return (
    <button onClick={watchAd} disabled={!canWatch}
      style={{
        width:'100%', padding:'12px 20px',
        fontFamily:'Bebas Neue,sans-serif', fontSize:16, letterSpacing:3,
        background: canWatch ? 'rgba(0,212,255,.08)' : 'transparent',
        border:`1px solid ${canWatch ? '#00d4ff' : '#1a3a5c'}`,
        color: canWatch ? '#00d4ff' : '#2a4a6a',
        cursor: canWatch ? 'pointer' : 'not-allowed',
        transition:'all .2s',
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
      }}>
      <span style={{fontSize:20}}>📺</span>
      {canWatch
        ? `REGARDER UNE PUB → +${REWARDED_COINS} 🪙`
        : 'DISPONIBLE DANS 10 MIN'
      }
    </button>
  )
}
