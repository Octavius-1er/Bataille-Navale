// src/components/AnnouncementBanner.jsx
// Shows the latest active announcement as a floating banner at the top of every page
// Dismissable, auto-fetches, styled like Grow a Garden

import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'

const TYPE_STYLE = {
  info:    { bg:'rgba(0,212,255,.12)', border:'#00d4ff', color:'#00d4ff', icon:'📢' },
  warning: { bg:'rgba(255,215,0,.12)', border:'#ffd700', color:'#ffd700', icon:'⚠️' },
  event:   { bg:'rgba(0,255,136,.12)', border:'#00ff88', color:'#00ff88', icon:'🎉' },
}

export default function AnnouncementBanner() {
  const [ann,       setAnn]       = useState(null)
  const [visible,   setVisible]   = useState(false)
  const [dismissed, setDismissed] = useState(null) // id of dismissed announcement

  useEffect(() => {
    load()
    // Refresh every 60s
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    try {
      const snap = await getDocs(query(collection(db,'announcements'), orderBy('createdAt','desc'), limit(1)))
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() }
        setAnn(data)
        // Show if not dismissed
        const savedDismiss = sessionStorage.getItem('dismissedAnn')
        if (savedDismiss !== data.id) {
          setVisible(true)
          setDismissed(null)
        }
      }
    } catch {}
  }

  function dismiss() {
    setVisible(false)
    if (ann) sessionStorage.setItem('dismissedAnn', ann.id)
  }

  if (!ann || !visible) return null

  const s = TYPE_STYLE[ann.type] || TYPE_STYLE.info

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      background: s.bg,
      borderBottom: `2px solid ${s.border}`,
      boxShadow: `0 0 20px ${s.border}44`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 20px',
      backdropFilter: 'blur(8px)',
      animation: 'slideDown 0.3s ease',
    }}>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity:0 }
          to   { transform: translateY(0);     opacity:1 }
        }
      `}</style>

      <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: 'Bebas Neue,sans-serif',
          fontSize: 15, letterSpacing: 2,
          color: s.color, marginRight: 10,
        }}>
          {ann.title}
        </span>
        <span style={{
          fontFamily: 'Share Tech Mono,monospace',
          fontSize: 11, color: '#c8e6f0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {ann.body}
        </span>
      </div>

      <span style={{
        fontFamily: 'Share Tech Mono,monospace',
        fontSize: 9, color: '#4a7090', flexShrink: 0, marginRight: 8,
      }}>
        {ann.author}
      </span>

      <button onClick={dismiss} style={{
        background: 'none', border: 'none',
        color: '#4a7090', cursor: 'pointer',
        fontSize: 16, padding: 0, lineHeight: 1,
        flexShrink: 0,
      }}>✕</button>
    </div>
  )
}
