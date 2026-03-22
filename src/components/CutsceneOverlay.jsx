// src/components/CutsceneOverlay.jsx
// Affiche une cutscène spectaculaire déclenchée par l'admin

import { useState, useEffect, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

const SCENES = {
  fireworks: {
    color: '#ffd700',
    bg: 'radial-gradient(ellipse at center, rgba(255,100,0,.3) 0%, rgba(3,8,18,.95) 60%)',
    particles: ['🎆','🎇','✨','💥','🌟'],
    text_color: '#ffd700',
  },
  victory: {
    color: '#ffd700',
    bg: 'radial-gradient(ellipse at center, rgba(255,215,0,.25) 0%, rgba(3,8,18,.95) 60%)',
    particles: ['🏆','⭐','🌟','✨','👑'],
    text_color: '#ffd700',
  },
  disco: {
    color: '#ff00ff',
    bg: 'radial-gradient(ellipse at center, rgba(255,0,255,.2) 0%, rgba(3,8,18,.95) 60%)',
    particles: ['🪩','💃','🕺','🎵','🎶','🌈'],
    text_color: '#ff00ff',
  },
  alert: {
    color: '#ff3a3a',
    bg: 'radial-gradient(ellipse at center, rgba(255,0,0,.3) 0%, rgba(30,0,0,.97) 60%)',
    particles: ['🚨','⚠️','❗','🔴','💀'],
    text_color: '#ff3a3a',
  },
  rain: {
    color: '#ffd700',
    bg: 'radial-gradient(ellipse at center, rgba(255,215,0,.2) 0%, rgba(3,8,18,.95) 60%)',
    particles: ['🪙','💰','🤑','💵','✨'],
    text_color: '#ffd700',
  },
  levelup: {
    color: '#00ff88',
    bg: 'radial-gradient(ellipse at center, rgba(0,255,136,.2) 0%, rgba(0,20,10,.95) 60%)',
    particles: ['⬆️','🚀','💚','⚡','🌟'],
    text_color: '#00ff88',
  },
}

function Particle({ emoji, style }) {
  return <div style={{ position:'absolute', fontSize:28, userSelect:'none', pointerEvents:'none', ...style }}>{emoji}</div>
}

export default function CutsceneOverlay() {
  const [scene,   setScene]   = useState(null)
  const [visible, setVisible] = useState(false)
  const [particles, setParticles] = useState([])
  const [phase,   setPhase]   = useState(0) // 0=hidden 1=in 2=hold 3=out
  const timerRef = useRef([])

  useEffect(() => {
    const q = query(collection(db,'cutscenes'), orderBy('createdAt','desc'), limit(1))
    const unsub = onSnapshot(q, snap => {
      if (snap.empty) return
      const data = snap.docs[0].data()
      if (data.active) {
        showScene(data)
      }
    })
    return () => unsub()
  }, [])

  function showScene(data) {
    timerRef.current.forEach(clearTimeout)
    timerRef.current = []

    const cfg = SCENES[data.type] || SCENES.fireworks

    // Generate random particles
    const pts = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji: cfg.particles[Math.floor(Math.random() * cfg.particles.length)],
      left:   Math.random() * 100,
      top:    Math.random() * 80 + 10,
      delay:  Math.random() * 1.5,
      size:   Math.random() * 20 + 18,
      duration: Math.random() * 1.5 + 1.5,
    }))
    setParticles(pts)
    setScene({ ...data, cfg })
    setVisible(true)
    setPhase(1)

    const t1 = setTimeout(() => setPhase(2), 600)
    const t2 = setTimeout(() => setPhase(3), 6000)
    const t3 = setTimeout(() => { setVisible(false); setScene(null); setPhase(0) }, 7500)
    timerRef.current = [t1, t2, t3]
  }

  useEffect(() => () => timerRef.current.forEach(clearTimeout), [])

  if (!visible || !scene) return null

  const cfg = scene.cfg
  const opacity = phase === 1 ? 0.9 : phase === 2 ? 1 : 0
  const scale   = phase === 1 ? 0.85 : phase === 2 ? 1 : 1.05

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9000,
      display:'flex', alignItems:'center', justifyContent:'center',
      background: cfg.bg,
      opacity, transform:`scale(${scale})`,
      transition: phase === 3 ? 'opacity 1.5s ease, transform 1.5s ease' : 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
      pointerEvents:'none',
    }}>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0)   rotate(0deg);   opacity:1 }
          100% { transform: translateY(-90vh) rotate(360deg); opacity:0 }
        }
        @keyframes pulse {
          0%,100% { text-shadow: 0 0 30px var(--tc), 0 0 60px var(--tc) }
          50%     { text-shadow: 0 0 60px var(--tc), 0 0 120px var(--tc) }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%) }
          100% { transform: translateY(100vh) }
        }
        @keyframes glitchX {
          0%,100% { transform: translateX(0) }
          20%     { transform: translateX(-4px) }
          40%     { transform: translateX(4px) }
          60%     { transform: translateX(-2px) }
          80%     { transform: translateX(2px) }
        }
      `}</style>

      {/* Scanline effect */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:`repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.08) 2px,rgba(0,0,0,.08) 4px)`,
      }}/>
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:'4px',
        background:`linear-gradient(90deg,transparent,${cfg.color},transparent)`,
        animation:'scanline 2s linear infinite',
      }}/>

      {/* Floating particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute',
          left: `${p.left}%`, top: `${p.top}%`,
          fontSize: p.size,
          animation: `floatUp ${p.duration}s ease-in ${p.delay}s infinite`,
          opacity: 0.9,
        }}>{p.emoji}</div>
      ))}

      {/* Center content */}
      <div style={{
        textAlign:'center', padding:'0 40px', position:'relative',
        animation: phase===2 ? 'glitchX 0.3s ease 0.5s 2' : 'none',
      }}>
        {/* Glow ring */}
        <div style={{
          position:'absolute', inset:-60,
          border:`2px solid ${cfg.color}`,
          borderRadius:'50%',
          boxShadow:`0 0 40px ${cfg.color}55, inset 0 0 40px ${cfg.color}22`,
          animation:'pulse 1.5s ease infinite',
        }}/>

        {/* Icon */}
        <div style={{
          fontSize: 90, marginBottom:16,
          filter:`drop-shadow(0 0 20px ${cfg.color})`,
          animation:'pulse 1s ease infinite',
        }}>
          {cfg.particles[0]}
        </div>

        {/* Message */}
        <div style={{
          '--tc': cfg.color,
          fontFamily:'Bebas Neue,sans-serif',
          fontSize:'clamp(36px,8vw,80px)',
          letterSpacing:8,
          color: cfg.color,
          animation:'pulse 1.2s ease infinite',
          lineHeight:1,
          marginBottom:12,
        }}>
          {scene.message}
        </div>

        {/* Sub text */}
        <div style={{
          fontFamily:'Share Tech Mono,monospace',
          fontSize:14, letterSpacing:4, color:'rgba(255,255,255,.5)',
        }}>
          NAVAL COMMAND
        </div>
      </div>
    </div>
  )
}
