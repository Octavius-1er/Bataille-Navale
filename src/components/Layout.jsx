// src/components/Layout.jsx
import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AnnouncementBanner from './AnnouncementBanner'

export default function Layout() {
  const { user, profile, logout } = useAuth()
  const [unread, setUnread] = useState(0)
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const isGame = pathname === '/game'

  useEffect(() => {
    if (!user || user.isAnonymous) return
    const load = async () => {
      try {
        const q = query(collection(db,'inbox'), where('uid','==',user.uid))
        const snap = await getDocs(q)
        setUnread(snap.docs.filter(d=>!d.data().read).length)
      } catch {}
    }
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [user])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <>
      <AnnouncementBanner/>
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
        <header style={{
          display:'flex', alignItems:'center',
          padding:'0 24px', height:60,
          borderBottom:'1px solid rgba(0,212,255,.12)',
          background:'rgba(5,13,26,.9)', backdropFilter:'blur(12px)',
          position:'sticky', top:0, zIndex:200, flexShrink:0,
          gap:16, overflow:'hidden',
        }}>
          {/* Logo — fixed width so it never wraps */}
          <Link to={user ? '/dashboard' : '/'} style={{
            display:'flex', alignItems:'center', gap:6,
            fontFamily:'Bebas Neue,sans-serif', fontSize:22, letterSpacing:4,
            textShadow:'0 0 18px rgba(0,212,255,.4)',
            transition:'opacity .2s', flexShrink:0, whiteSpace:'nowrap',
            textDecoration:'none',
          }}>
            <span style={{color:'#00d4ff'}}>⚓ NAVAL</span>
            <span style={{color:'#ff3a3a'}}>COMMAND</span>
          </Link>

          {/* Nav — scrollable on small screens */}
          <nav style={{ display:'flex', alignItems:'center', gap:10, overflowX:'auto', flex:1, justifyContent:'flex-end', scrollbarWidth:'none' }}>
            {user ? (
              <>
                <span style={{ fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#4a7090', letterSpacing:1, flexShrink:0 }}>
                  {user.displayName?.toUpperCase()}
                </span>
                {isGame ? (
                  <Link to="/dashboard" className="btn danger sm" style={{flexShrink:0}}>⬅ QUITTER</Link>
                ) : (<>
                  <Link to="/learn-games" className="btn sm" style={{flexShrink:0}}>📚 APPRENDRE</Link>
                  <Link to="/inbox" className="btn sm" style={{position:'relative',flexShrink:0}}>
                    📬 INBOX
                    {unread > 0 && <span style={{position:'absolute',top:-6,right:-6,background:'#ff3a3a',color:'white',borderRadius:'50%',width:16,height:16,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Share Tech Mono,monospace'}}>{unread}</span>}
                  </Link>
                  <Link to="/shop"   className="btn sm" style={{flexShrink:0}}>🏪 SHOP</Link>
                  <Link to="/locker" className="btn sm" style={{flexShrink:0}}>🗄 CASIER</Link>
                  {profile?.isAdmin && <Link to="/admin" className="btn sm" style={{borderColor:'#ff3a3a',color:'#ff3a3a',flexShrink:0}}>🛡 ADMIN</Link>}
                  <Link to="/game"   className="btn primary sm" style={{flexShrink:0}}>▶ JOUER</Link>
                </>)}
                <button className="btn ghost sm" onClick={handleLogout} style={{flexShrink:0}}>DÉCO</button>
              </>
            ) : (
              <span style={{ fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#4a7090', letterSpacing:2 }}>
                BATAILLE NAVALE MULTIJOUEUR
              </span>
            )}
          </nav>
        </header>

        <main style={{ flex:1 }}>
          <Outlet />
        </main>
      </div>
    </>
  )
}
