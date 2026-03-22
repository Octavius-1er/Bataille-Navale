// src/pages/HomePage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'

const AUTH_ERRORS = {
  'auth/email-already-in-use': 'Cet email est déjà utilisé',
  'auth/invalid-email':        'Email invalide',
  'auth/weak-password':        'Mot de passe trop court (6 car. min.)',
  'auth/user-not-found':       'Identifiant ou mot de passe incorrect',
  'auth/wrong-password':       'Identifiant ou mot de passe incorrect',
  'auth/invalid-credential':   'Identifiant ou mot de passe incorrect',
  'auth/operation-not-allowed':'Connexion anonyme non activée dans Firebase',
}

// ── Reusable modal wrapper ────────────────────────────────────────
function Modal({ onClose, title, children }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(5,13,26,.9)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
    >
      <div className="card glow fade-up" style={{ width:'100%', maxWidth:440, padding:44, position:'relative' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#00d4ff,transparent)' }} />
        <button onClick={onClose} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', color:'#4a7090', fontSize:20, cursor:'pointer' }}>✕</button>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, letterSpacing:4, color:'#00d4ff', marginBottom:28 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { register, login, loginAnonymous } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  // 'login' | 'register' | 'guest' | null
  const [modal,   setModal]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({ username:'', emailOrId:'', password:'', guestName:'' })

  function openModal(m) { setModal(m); setError(''); setForm({ username:'', emailOrId:'', password:'', guestName:'' }) }
  function onChange(e)  { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  async function submitAuth(e) {
    e.preventDefault()
    if (loading) return
    setError(''); setLoading(true)
    try {
      if (modal === 'register') {
        if (!form.username.trim()) { setError('Entrez un nom de commandant'); return }
        if (!form.emailOrId.includes('@')) { setError('Entrez un email valide pour l\'inscription'); return }
        await register(form.emailOrId.trim(), form.password, form.username.trim())
        toast('Bienvenue, ' + form.username + ' !', 'success')
      } else {
        await login(form.emailOrId.trim(), form.password)
        toast('Connexion réussie', 'success')
      }
      navigate('/dashboard')
    } catch (err) {
      setError(AUTH_ERRORS[err.code] || err.message)
    } finally { setLoading(false) }
  }

  async function submitGuest(e) {
    e.preventDefault()
    if (loading) return
    setError(''); setLoading(true)
    try {
      await loginAnonymous(form.guestName)
      toast('Bienvenue, ' + (form.guestName.trim() || 'Invité') + ' !', 'success')
      navigate('/dashboard')
    } catch (err) {
      setError(AUTH_ERRORS[err.code] || 'Erreur: ' + err.message)
    } finally { setLoading(false) }
  }

  const features = [
    { icon:'🌐', label:'EN LIGNE',   desc:'2 appareils différents via un code de salle, sync temps réel' },
    { icon:'👥', label:'LOCAL 2J',   desc:'Même écran, écran masqué entre chaque tour' },
    { icon:'🤖', label:'VS IA',      desc:'3 niveaux — aléatoire, tactique, destruction optimale' },
    { icon:'💾', label:'PROFIL',     desc:'Flottes sauvegardées, stats et historique (compte requis)' },
  ]

  return (
    <div style={{ position:'relative', zIndex:1 }}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 60px)', padding:'60px 24px', textAlign:'center' }}>

        <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:300, background:'radial-gradient(ellipse,rgba(0,180,255,.07) 0%,transparent 70%)', pointerEvents:'none' }} />

        <div className="fade-up" style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(64px,12vw,120px)', letterSpacing:'.08em', lineHeight:1, color:'#00d4ff', textShadow:'0 0 60px rgba(0,212,255,.35)' }}>NAVAL</div>
        <div className="fade-up" style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(64px,12vw,120px)', letterSpacing:'.08em', lineHeight:1, color:'#ff3a3a', textShadow:'0 0 40px rgba(255,58,58,.3)', animationDelay:'.05s' }}>COMMAND</div>
        <p className="fade-up" style={{ fontFamily:'Share Tech Mono,monospace', fontSize:12, color:'#4a7090', letterSpacing:4, marginTop:20, marginBottom:40, animationDelay:'.12s' }}>
          BATAILLE NAVALE MULTIJOUEUR EN LIGNE
        </p>

        {/* ── Auth buttons ── */}
        <div className="fade-up" style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', animationDelay:'.2s' }}>
          <button className="btn primary lg" onClick={() => openModal('register')}>✚ CRÉER UN COMPTE</button>
          <button className="btn lg"         onClick={() => openModal('login')}>🎮 SE CONNECTER</button>
          <button className="btn lg"         onClick={() => openModal('guest')}
            style={{ borderColor:'#4a7090', color:'#7aaabb' }}>
            👤 JOUER EN INVITÉ
          </button>
        </div>

        <p className="fade-up" style={{ fontFamily:'Share Tech Mono,monospace', fontSize:10, color:'#2a4a5a', marginTop:12, animationDelay:'.25s' }}>
          INVITÉ : AUCUNE SAUVEGARDE · AUCUN COMPTE REQUIS
        </p>

        {/* ── Features ── */}
        <div className="fade-up" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginTop:56, maxWidth:900, width:'100%', animationDelay:'.3s' }}>
          {features.map(f => (
            <div key={f.label} className="card hover-glow" style={{ padding:'24px 20px', textAlign:'left' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:17, letterSpacing:3, color:'#00d4ff', marginBottom:8 }}>{f.label}</div>
              <div style={{ fontSize:12, color:'#4a7090', lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LOGIN / REGISTER modal ────────────────────────── */}
      {(modal === 'login' || modal === 'register') && (
        <Modal title={modal === 'register' ? 'CRÉER UN COMPTE' : 'CONNEXION'} onClose={() => setModal(null)}>
          <form onSubmit={submitAuth}>
            {error && (
              <div style={{ background:'rgba(255,58,58,.1)', border:'1px solid rgba(255,58,58,.3)', color:'#ff3a3a', padding:'10px 14px', fontFamily:'Share Tech Mono,monospace', fontSize:12, marginBottom:18 }}>
                ⚠ {error}
              </div>
            )}

            {modal === 'register' && (
              <div className="field">
                <label>Nom de commandant</label>
                <input name="username" value={form.username} onChange={onChange} placeholder="ex: Amiral_X" maxLength={20} autoFocus />
              </div>
            )}

            <div className="field">
              <label>{modal === 'register' ? 'Email' : 'Email ou identifiant'}</label>
              <input
                name="emailOrId"
                type={modal === 'register' ? 'email' : 'text'}
                value={form.emailOrId}
                onChange={onChange}
                placeholder={modal === 'register' ? 'votre@email.com' : 'email ou nom de commandant'}
                autoFocus={modal === 'login'}
              />
            </div>

            <div className="field">
              <label>Mot de passe</label>
              <input name="password" type="password" value={form.password} onChange={onChange} placeholder="••••••••" minLength={6} />
            </div>

            <button type="submit" className="btn primary full lg" style={{ marginTop:8 }} disabled={loading}>
              {loading ? <><span className="spinner" /> CHARGEMENT...</> : modal === 'register' ? 'CRÉER MON COMPTE' : 'SE CONNECTER'}
            </button>

            <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#4a7090' }}>
              {modal === 'register' ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
              <span onClick={() => openModal(modal === 'register' ? 'login' : 'register')} style={{ color:'#00d4ff', cursor:'pointer' }}>
                {modal === 'register' ? 'Se connecter' : "S'inscrire"}
              </span>
            </p>

            {/* Quick access to guest */}
            <div style={{ borderTop:'1px solid #1a3a5c', marginTop:20, paddingTop:16, textAlign:'center' }}>
              <span style={{ fontSize:12, color:'#4a7090' }}>Ou </span>
              <span onClick={() => openModal('guest')} style={{ fontSize:12, color:'#7aaabb', cursor:'pointer' }}>
                jouer en invité sans compte →
              </span>
            </div>
          </form>
        </Modal>
      )}

      {/* ── GUEST modal ───────────────────────────────────── */}
      {modal === 'guest' && (
        <Modal title="JOUER EN INVITÉ" onClose={() => setModal(null)}>
          <form onSubmit={submitGuest}>
            {error && (
              <div style={{ background:'rgba(255,58,58,.1)', border:'1px solid rgba(255,58,58,.3)', color:'#ff3a3a', padding:'10px 14px', fontFamily:'Share Tech Mono,monospace', fontSize:12, marginBottom:18 }}>
                ⚠ {error}
              </div>
            )}

            {/* Info banner */}
            <div style={{ background:'rgba(255,215,0,.06)', border:'1px solid rgba(255,215,0,.2)', padding:'10px 14px', fontFamily:'Share Tech Mono,monospace', fontSize:11, color:'#aaa055', marginBottom:20, lineHeight:1.6 }}>
              ℹ MODE INVITÉ<br/>
              Aucun compte requis · Aucune sauvegarde<br/>
              Stats et flottes non conservées
            </div>

            <div className="field">
              <label>Ton prénom ou surnom (optionnel)</label>
              <input
                name="guestName"
                value={form.guestName}
                onChange={onChange}
                placeholder="ex: Octave"
                maxLength={20}
                autoFocus
              />
            </div>

            <button type="submit" className="btn primary full lg" style={{ marginTop:8 }} disabled={loading}>
              {loading ? <><span className="spinner" /> CHARGEMENT...</> : '▶ JOUER MAINTENANT'}
            </button>

            <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'#4a7090' }}>
              Envie de sauvegarder ?{' '}
              <span onClick={() => openModal('register')} style={{ color:'#00d4ff', cursor:'pointer' }}>
                Créer un compte →
              </span>
            </p>
          </form>
        </Modal>
      )}
    </div>
  )
}
