// src/components/Toast.jsx
import { useState, useCallback, useEffect, createContext, useContext } from 'react'

const ToastContext = createContext(null)
let _push = null

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200)
  }, [])

  useEffect(() => { _push = push; return () => { _push = null } }, [push])

  const colors = { info:'#00d4ff', success:'#00ff88', error:'#ff3a3a', warning:'#ffd700' }

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
        {toasts.map((t, i) => (
          <div key={t.id} style={{
            background:'#091525',
            border:`1px solid #1a3a5c`,
            borderLeft:`3px solid ${colors[t.type] || colors.info}`,
            padding:'11px 18px',
            fontFamily:'Share Tech Mono,monospace',
            fontSize:12,
            color:'#c8e6f0',
            minWidth:240,
            maxWidth:320,
            boxShadow:'0 4px 20px rgba(0,0,0,.5)',
            animation:'toastIn .28s ease both',
            animationDelay: `${i * 0.04}s`,
          }}>
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }
export function toast(msg, type) { _push?.(msg, type) }
