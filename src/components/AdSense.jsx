// src/components/AdSense.jsx
import { useEffect, useRef, useState } from 'react'
import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './Toast'

const PUBLISHER_ID = 'ca-pub-4381520676476126'
const AD_SLOTS = {
  banner:   '1227849584',  // ← remplace quand tu crées l'unité dans AdSense
  rewarded: '0000000003',  // ← remplace quand tu crées l'unité rewarded
}
const REWARDED_COINS = 30
const AD_COOLDOWN_MS = 10 * 60 * 1000

function waitForAdsbygoogle(timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (window.adsbygoogle) return resolve(window.adsbygoogle)
    const start = Date.now()
    const interval = setInterval(() => {
      if (window.adsbygoogle) { clearInterval(interval); resolve(window.adsbygoogle) }
      else if (Date.now() - start > timeout) { clearInterval(interval); reject() }
    }, 100)
  })
}

export function AdBanner({ slot = 'banner', style = {} }) {
  const insRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    waitForAdsbygoogle().then(() => {
      if (cancelled) return
      if (insRef.current && !insRef.current.getAttribute('data-adsbygoogle-status')) {
        try { ;(window.adsbygoogle = window.adsbygoogle || []).push({}) }
        catch (e) { console.warn('[AdSense] Banner error:', e.message) }
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [slot])

  return (
    <div style={{ textAlign:'center', overflow:'hidden', ...style }}>
      <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:8, color:'#2a4a6a', marginBottom:4 }}>
        PUBLICITÉ
      </div>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display:'block', minHeight:90 }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={AD_SLOTS[slot] || AD_SLOTS.banner}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

export function RewardedAdButton({ onRewarded }) {
  const { user } = useAuth()
  const toast = useToast()
  const [state, setState] = useState('idle')
  const [countdown, setCountdown] = useState(0)
  const [canWatch, setCanWatch] = useState(true)
  const [nextIn, setNextIn] = useState(0)
  const countdownRef = useRef(null)

  useEffect(() => {
    function check() {
      const last = localStorage.getItem('lastAdWatch')
      if (!last) { setCanWatch(true); setNextIn(0); return }
      const elapsed = Date.now() - parseInt(last)
      if (elapsed >= AD_COOLDOWN_MS) { setCanWatch(true); setNextIn(0) }
      else { setCanWatch(false); setNextIn(Math.ceil((AD_COOLDOWN_MS - elapsed) / 1000)) }
    }
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current) }, [])

  async function watchAd() {
    if (!canWatch) { toast('Attends encore !', 'error'); return }
    if (!user || user.isAnonymous) { toast('Connecte-toi pour gagner des pièces !', 'error'); return }
    setState('watching')
    let t = 15
    setCountdown(t)
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      t--
      setCountdown(t)
      if (t <= 0) { clearInterval(countdownRef.current); giveReward() }
    }, 1000)
  }

  async function giveReward() {
    try {
      await updateDoc(doc(db, 'users', user.uid), { coins: increment(REWARDED_COINS) })
      localStorage.setItem('lastAdWatch', Date.now().toString())
      setCanWatch(false)
      setState('done')
      toast(`+${REWARDED_COINS} 🪙 gagnés !`, 'success')
      onRewarded?.(REWARDED_COINS)
      setTimeout(() => setState('idle'), 3000)
    } catch (e) {
      toast('Erreur: ' + e.message, 'error')
      setState('idle')
    }
  }

  if (state === 'watching') return (
    <div style={{ padding:'16px 24px', background:'rgba(0,212,255,.06)', border:'1px solid rgba(0,212,255,.3)', textAlign:'center' }}>
      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:48, color:'#00d4ff', lineHeight:1, marginBottom:6 }}>{countdown}</div>
      <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:10, color:'#4a7090' }}>REGARDEZ LA PUBLICITÉ...</div>
      <div style={{ height:4, background:'#1a3a5c', marginTop:8, borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${((15-countdown)/15)*100}%`, background:'#00d4ff', transition:'width 1s linear' }}/>
      </div>
    </div>
  )

  if (state === 'done') return (
    <div style={{ padding:'16px 24px', background:'rgba(0,255,136,.08)', border:'1px solid rgba(0,255,136,.3)', textAlign:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:20, letterSpacing:2, color:'#00ff88' }}>
      +{REWARDED_COINS} 🪙 GAGNÉS !
    </div>
  )

  const minutesLeft = Math.ceil(nextIn / 60)
  return (
    <button onClick={watchAd} disabled={!canWatch} style={{
      width:'100%', padding:'12px 20px', fontFamily:'Bebas Neue,sans-serif', fontSize:16, letterSpacing:3,
      background: canWatch ? 'rgba(0,212,255,.08)' : 'transparent',
      border:`1px solid ${canWatch ? '#00d4ff' : '#1a3a5c'}`,
      color: canWatch ? '#00d4ff' : '#2a4a6a',
      cursor: canWatch ? 'pointer' : 'not-allowed', transition:'all .2s',
      display:'flex', alignItems:'center', justifyContent:'center', gap:10,
    }}>
      <span style={{ fontSize:20 }}>📺</span>
      {canWatch ? `REGARDER UNE PUB → +${REWARDED_COINS} 🪙` : `DISPONIBLE DANS ${minutesLeft} MIN`}
    </button>
  )
}
