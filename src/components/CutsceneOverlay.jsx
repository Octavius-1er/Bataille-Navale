// src/components/CutsceneOverlay.jsx
import { useState, useEffect, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

// ── Scene configs ─────────────────────────────────────────────────
const SCENES = {
  fireworks: {
    bg1:'#ff6600', bg2:'#ff0000', bg3:'#ffcc00',
    accent:'#ffd700',
    particles:['🎆','🎇','✨','💥','⭐','🌟'],
    flash:'rgba(255,200,0,0.4)',
    vignette:'rgba(255,100,0,0.6)',
    icon:'🎆',
  },
  victory: {
    bg1:'#ffd700', bg2:'#ff9900', bg3:'#ffff00',
    accent:'#ffd700',
    particles:['🏆','👑','⭐','✨','🌟','🎖'],
    flash:'rgba(255,215,0,0.5)',
    vignette:'rgba(180,120,0,0.5)',
    icon:'🏆',
  },
  disco: {
    bg1:'#ff00ff', bg2:'#00ffff', bg3:'#ff0099',
    accent:'#ff00ff',
    particles:['🪩','💃','🕺','🌈','🎵','🎶','⚡'],
    flash:'rgba(255,0,255,0.4)',
    vignette:'rgba(100,0,150,0.6)',
    icon:'🪩',
  },
  alert: {
    bg1:'#ff0000', bg2:'#cc0000', bg3:'#ff3300',
    accent:'#ff3a3a',
    particles:['🚨','⚠️','❗','💀','🔴','☠️'],
    flash:'rgba(255,0,0,0.5)',
    vignette:'rgba(150,0,0,0.7)',
    icon:'🚨',
  },
  rain: {
    bg1:'#ffd700', bg2:'#ffaa00', bg3:'#ffe566',
    accent:'#ffd700',
    particles:['🪙','💰','🤑','💵','💸','✨'],
    flash:'rgba(255,215,0,0.5)',
    vignette:'rgba(120,80,0,0.5)',
    icon:'🪙',
  },
  levelup: {
    bg1:'#00ff88', bg2:'#00ccff', bg3:'#00ff44',
    accent:'#00ff88',
    particles:['🚀','⬆️','⚡','💚','🌟','✅'],
    flash:'rgba(0,255,136,0.4)',
    vignette:'rgba(0,80,40,0.5)',
    icon:'🚀',
  },
}

function randomBetween(a, b) { return a + Math.random() * (b - a) }

export default function CutsceneOverlay() {
  const [scene,   setScene]   = useState(null)
  const [tick,    setTick]    = useState(0)
  const [phase,   setPhase]   = useState(0) // 0=off 1=flash 2=main 3=out
  const [letters, setLetters] = useState([])
  const [particles, setParticles] = useState([])
  const timers = useRef([])
  const tickRef = useRef(null)

  useEffect(() => {
    const q = query(collection(db,'cutscenes'), orderBy('createdAt','desc'), limit(1))
    const unsub = onSnapshot(q, snap => {
      if (snap.empty) return
      const data = snap.docs[0].data()
      if (data.active) trigger(data)
    })
    return () => unsub()
  }, [])

  function trigger(data) {
    timers.current.forEach(clearTimeout)
    if (tickRef.current) clearInterval(tickRef.current)
    timers.current = []

    const cfg = SCENES[data.type] || SCENES.fireworks
    const msg = (data.message || data.type).toUpperCase()

    // Split message into individual letters for animation
    setLetters(msg.split('').map((ch, i) => ({
      ch, i,
      delay: i * 60,
      x: randomBetween(-8, 8),
      rot: randomBetween(-15, 15),
    })))

    // Generate particles
    setParticles(Array.from({length:40}, (_, i) => ({
      id: i,
      emoji: cfg.particles[i % cfg.particles.length],
      x: randomBetween(0, 100),
      y: randomBetween(10, 90),
      size: randomBetween(16, 36),
      delay: randomBetween(0, 2),
      dur: randomBetween(1.5, 3),
      rot: randomBetween(-180, 180),
    })))

    setScene({ ...data, cfg })
    setPhase(1)

    // Tick for disco/strobe
    tickRef.current = setInterval(() => setTick(t => t + 1), 80)

    const t1 = setTimeout(() => setPhase(2), 200)
    const t2 = setTimeout(() => setPhase(3), 6500)
    const t3 = setTimeout(() => {
      setPhase(0); setScene(null)
      clearInterval(tickRef.current)
    }, 8000)
    timers.current = [t1, t2, t3]
  }

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    if (tickRef.current) clearInterval(tickRef.current)
  }, [])

  if (phase === 0 || !scene) return null
  const { cfg } = scene
  const isOut = phase === 3
  const isFlash = phase === 1
  const discoHue = scene.type === 'disco' ? tick * 15 : 0

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      overflow:'hidden', pointerEvents:'none',
    }}>
      <style>{`
        @keyframes cs-float {
          0%   { transform:translateY(0) rotate(var(--r)) scale(1); opacity:1 }
          100% { transform:translateY(-110vh) rotate(calc(var(--r) + 360deg)) scale(0.5); opacity:0 }
        }
        @keyframes cs-letter {
          0%   { transform:translateY(60px) rotate(var(--rot)) scale(0.3); opacity:0; filter:blur(8px) }
          60%  { transform:translateY(-8px) rotate(calc(var(--rot)*-0.3)) scale(1.15); opacity:1; filter:blur(0px) }
          80%  { transform:translateY(4px) rotate(0deg) scale(0.97); opacity:1 }
          100% { transform:translateY(0) rotate(0deg) scale(1); opacity:1 }
        }
        @keyframes cs-scanline {
          0%   { transform:translateY(-100%) }
          100% { transform:translateY(200%) }
        }
        @keyframes cs-vignette-pulse {
          0%,100% { opacity:0.6 }
          50%     { opacity:0.9 }
        }
        @keyframes cs-icon {
          0%   { transform:scale(0) rotate(-180deg); opacity:0 }
          50%  { transform:scale(1.3) rotate(10deg); opacity:1 }
          70%  { transform:scale(0.9) rotate(-5deg) }
          100% { transform:scale(1) rotate(0deg); opacity:1 }
        }
        @keyframes cs-glitch1 {
          0%,100% { clip-path:inset(0 0 95% 0); transform:translateX(0) }
          20%     { clip-path:inset(10% 0 80% 0); transform:translateX(-4px) }
          40%     { clip-path:inset(40% 0 50% 0); transform:translateX(4px) }
          60%     { clip-path:inset(70% 0 20% 0); transform:translateX(-2px) }
          80%     { clip-path:inset(85% 0 5% 0);  transform:translateX(2px) }
        }
        @keyframes cs-glitch2 {
          0%,100% { clip-path:inset(0 0 95% 0); transform:translateX(0) }
          20%     { clip-path:inset(5% 0 85% 0); transform:translateX(6px) }
          40%     { clip-path:inset(35% 0 55% 0); transform:translateX(-6px) }
          60%     { clip-path:inset(65% 0 25% 0); transform:translateX(3px) }
          80%     { clip-path:inset(80% 0 10% 0); transform:translateX(-3px) }
        }
        @keyframes cs-shake {
          0%,100% { transform:translate(0,0) }
          10%     { transform:translate(-3px,2px) }
          20%     { transform:translate(3px,-2px) }
          30%     { transform:translate(-2px,3px) }
          40%     { transform:translate(2px,-3px) }
          50%     { transform:translate(-1px,1px) }
        }
        @keyframes cs-chromatic {
          0%,100% { text-shadow: -2px 0 #ff0000, 2px 0 #00ffff }
          50%     { text-shadow: 2px 0 #ff0000, -2px 0 #00ffff }
        }
        @keyframes cs-fadeout {
          0%   { opacity:1; transform:scale(1) }
          100% { opacity:0; transform:scale(1.05) }
        }
      `}</style>

      {/* ── Background flash ─────────────────────────────────────── */}
      <div style={{
        position:'absolute', inset:0,
        background: isFlash
          ? cfg.flash
          : `radial-gradient(ellipse at 50% 50%, ${cfg.bg1}22 0%, ${cfg.bg2}11 40%, transparent 70%)`,
        transition: 'background 0.3s',
        animation: isOut ? 'cs-fadeout 1.5s ease forwards' : 'none',
      }}/>

      {/* ── Vignette ─────────────────────────────────────────────── */}
      <div style={{
        position:'absolute', inset:0,
        background:`radial-gradient(ellipse at 50% 50%, transparent 30%, ${cfg.vignette} 100%)`,
        animation:'cs-vignette-pulse 0.8s ease infinite',
        opacity: isOut ? 0 : 1, transition:'opacity 1.5s',
      }}/>

      {/* ── Scanlines ────────────────────────────────────────────── */}
      <div style={{
        position:'absolute', inset:0,
        background:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.08) 3px,rgba(0,0,0,.08) 4px)',
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:6,
        background:`linear-gradient(90deg,transparent,${cfg.accent},transparent)`,
        animation:'cs-scanline 1.2s linear infinite',
        opacity:0.8,
      }}/>
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:3,
        background:`linear-gradient(90deg,transparent,white,transparent)`,
        animation:'cs-scanline 0.7s linear 0.3s infinite',
        opacity:0.3,
      }}/>

      {/* ── Disco color shift ────────────────────────────────────── */}
      {scene.type === 'disco' && (
        <div style={{
          position:'absolute', inset:0,
          background:`hsl(${discoHue},100%,50%)`,
          opacity:0.08, mixBlendMode:'screen',
        }}/>
      )}

      {/* ── Alert strobe ─────────────────────────────────────────── */}
      {scene.type === 'alert' && (
        <div style={{
          position:'absolute', inset:0,
          background:'rgba(255,0,0,0.15)',
          opacity: tick%4 < 2 ? 0.8 : 0,
          transition:'opacity 0.05s',
        }}/>
      )}

      {/* ── Floating particles ───────────────────────────────────── */}
      {phase === 2 && particles.map(p => (
        <div key={p.id} style={{
          position:'absolute',
          left:`${p.x}%`, top:`${p.y}%`,
          fontSize: p.size,
          '--r': `${p.rot}deg`,
          animation:`cs-float ${p.dur}s ease-in ${p.delay}s infinite`,
          opacity:0.9, zIndex:1,
        }}>{p.emoji}</div>
      ))}

      {/* ── Center content ───────────────────────────────────────── */}
      <div style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        animation: isOut ? 'cs-fadeout 1.5s ease forwards' : phase===2?'cs-shake 0.4s ease 0.5s 1':'none',
      }}>

        {/* Big icon */}
        <div style={{
          fontSize: 'clamp(60px,12vw,110px)',
          marginBottom:16,
          animation: phase===2 ? 'cs-icon 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
          filter:`drop-shadow(0 0 30px ${cfg.accent}) drop-shadow(0 0 60px ${cfg.accent})`,
          transform: phase < 2 ? 'scale(0) rotate(-180deg)' : undefined,
        }}>
          {cfg.icon}
        </div>

        {/* Letter-by-letter text */}
        <div style={{
          display:'flex', flexWrap:'wrap', justifyContent:'center',
          gap:2, maxWidth:'90vw', position:'relative',
          marginBottom:12,
        }}>
          {/* Glitch layers */}
          <div style={{position:'absolute',inset:0,display:'flex',flexWrap:'wrap',justifyContent:'center',gap:2,animation:'cs-glitch1 0.15s linear 1s 3',color:'#ff0000',opacity:0.6}}>
            {letters.map(l=>(
              <span key={l.i} style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'clamp(32px,8vw,80px)',letterSpacing:4,color:'#ff0000',whiteSpace:l.ch===' '?'pre':undefined,width:l.ch===' '?'0.5ch':undefined}}>
                {l.ch}
              </span>
            ))}
          </div>
          <div style={{position:'absolute',inset:0,display:'flex',flexWrap:'wrap',justifyContent:'center',gap:2,animation:'cs-glitch2 0.15s linear 1.05s 3',color:'#00ffff',opacity:0.6}}>
            {letters.map(l=>(
              <span key={l.i} style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'clamp(32px,8vw,80px)',letterSpacing:4,color:'#00ffff',whiteSpace:l.ch===' '?'pre':undefined,width:l.ch===' '?'0.5ch':undefined}}>
                {l.ch}
              </span>
            ))}
          </div>

          {/* Main letters */}
          {letters.map(l => (
            <span key={l.i} style={{
              fontFamily:'Bebas Neue,sans-serif',
              fontSize:'clamp(32px,8vw,80px)',
              letterSpacing:6,
              color: scene.type==='disco' ? `hsl(${discoHue + l.i*20},100%,70%)` : 'white',
              textShadow:`0 0 20px ${cfg.accent}, 0 0 40px ${cfg.accent}, 0 0 80px ${cfg.accent}`,
              '--rot': `${l.rot}deg`,
              animation: phase===2 ? `cs-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) ${l.delay}ms both` : 'none',
              display:'inline-block',
              whiteSpace: l.ch===' ' ? 'pre' : undefined,
              width: l.ch===' ' ? '0.4em' : undefined,
              animation: phase===2
                ? `cs-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) ${l.delay}ms both${scene.type==='disco'?', cs-chromatic 0.3s linear infinite':''}` 
                : 'none',
            }}>{l.ch}</span>
          ))}
        </div>

        {/* Sub line */}
        <div style={{
          fontFamily:'Share Tech Mono,monospace',
          fontSize:'clamp(10px,2vw,16px)',
          letterSpacing:6,
          color:`${cfg.accent}cc`,
          opacity: phase===2 ? 1 : 0,
          transform: phase===2 ? 'translateY(0)' : 'translateY(20px)',
          transition:'all 0.6s ease 0.8s',
        }}>
          ⚓ NAVAL COMMAND
        </div>

        {/* Horizontal lines */}
        <div style={{position:'absolute',top:'calc(50% - 80px)',left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${cfg.accent},transparent)`,opacity:0.6}}/>
        <div style={{position:'absolute',top:'calc(50% + 80px)',left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${cfg.accent},transparent)`,opacity:0.6}}/>

        {/* Corner decorations */}
        {['tl','tr','bl','br'].map(corner => (
          <div key={corner} style={{
            position:'absolute',
            top:    corner.startsWith('t') ? 20 : undefined,
            bottom: corner.startsWith('b') ? 20 : undefined,
            left:   corner.endsWith('l')   ? 20 : undefined,
            right:  corner.endsWith('r')   ? 20 : undefined,
            width:40, height:40,
            borderTop:    corner.startsWith('t') ? `2px solid ${cfg.accent}` : 'none',
            borderBottom: corner.startsWith('b') ? `2px solid ${cfg.accent}` : 'none',
            borderLeft:   corner.endsWith('l')   ? `2px solid ${cfg.accent}` : 'none',
            borderRight:  corner.endsWith('r')   ? `2px solid ${cfg.accent}` : 'none',
            opacity:0.7,
          }}/>
        ))}
      </div>
    </div>
  )
}
