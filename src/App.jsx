// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import GamePage from './pages/GamePage'
import LearnPage from './pages/LearnPage'
import LearnGamesPage from './pages/LearnGamesPage'
import AdminPage from './pages/AdminPage'
import CutsceneOverlay from './components/CutsceneOverlay'
import ShopPage from './pages/ShopPage'
import LockerPage from './pages/LockerPage'
import InboxPage from './pages/InboxPage'

function Loader() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:20 }}>
      <div style={{ position:'relative', width:60, height:60 }}>
        <div style={{ position:'absolute', inset:0, border:'2px solid #1a3a5c', borderRadius:'50%' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', width:'50%', height:2, background:'#00d4ff', transformOrigin:'left center', boxShadow:'0 0 8px #00d4ff', animation:'radarSpin 1s linear infinite' }} />
      </div>
      <p style={{ fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#4a7090', letterSpacing:3 }}>INITIALISATION</p>
      <style>{`@keyframes radarSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function App() {
  const { user, profile } = useAuth()
  if (user === undefined) return <Loader />

  return (
    <>
    <CutsceneOverlay/>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"         element={user ? <Navigate to="/dashboard" replace /> : <HomePage />} />
        <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/" replace />} />
        <Route path="/game"      element={user ? <GamePage />      : <Navigate to="/" replace />} />
        <Route path="/learn-games" element={user ? <LearnGamesPage /> : <Navigate to="/" replace />} />
        <Route path="/learn"       element={user ? <LearnPage />     : <Navigate to="/" replace />} />
        <Route path="/admin"      element={profile?.isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route path="/shop"       element={user ? <ShopPage />    : <Navigate to="/" replace />} />
        <Route path="/locker"     element={user ? <LockerPage />  : <Navigate to="/" replace />} />
        <Route path="/inbox"      element={user ? <InboxPage />   : <Navigate to="/" replace />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  )
}
