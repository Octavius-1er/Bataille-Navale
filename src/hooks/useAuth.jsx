// src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, query, collection, where, getDocs, serverTimestamp, increment, deleteDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u || null)
      if (u && !u.isAnonymous) {
        const ref  = doc(db, 'users', u.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setProfile(snap.data())
        } else {
          const p = { wins:0, losses:0, username: u.displayName || 'Amiral', email: u.email || '', createdAt: serverTimestamp() }
          await setDoc(ref, p)
          setProfile(p)
        }
        // ── Presence tracking ──────────────────────────────────────
        const presRef = doc(db, 'presence', u.uid)
        await setDoc(presRef, {
          uid: u.uid,
          username: u.displayName || 'Amiral',
          isAnonymous: false,
          online: true,
          lastSeen: serverTimestamp(),
        }, { merge: true })
        // Heartbeat every 30s
        const heartbeat = setInterval(async () => {
          try { await setDoc(presRef, { online:true, lastSeen:serverTimestamp() }, { merge:true }) } catch {}
        }, 30000)
        // Mark offline on unload
        const markOffline = () => setDoc(presRef, { online:false, lastSeen:serverTimestamp() }, { merge:true }).catch(()=>{})
        window.addEventListener('beforeunload', markOffline)
        // ── Total visitor counter ──────────────────────────────────
        const visitKey = `visited_${u.uid}`
        if (!sessionStorage.getItem(visitKey)) {
          sessionStorage.setItem(visitKey, '1')
          try { await setDoc(doc(db,'stats','visitors'), { total: increment(1) }, { merge:true }) } catch {}
        }
        return () => {
          clearInterval(heartbeat)
          window.removeEventListener('beforeunload', markOffline)
          markOffline()
        }
      } else if (u?.isAnonymous) {
        setProfile({ wins:0, losses:0, username: u.displayName || 'Invité', anonymous: true })
        // Presence for anonymous users too
        const presRef = doc(db, 'presence', u.uid)
        await setDoc(presRef, {
          uid: u.uid,
          username: u.displayName || 'Invité',
          isAnonymous: true,
          online: true,
          lastSeen: serverTimestamp(),
        }, { merge: true })
        const heartbeat = setInterval(async () => {
          try { await setDoc(presRef, { online:true, lastSeen:serverTimestamp() }, { merge:true }) } catch {}
        }, 30000)
        const markOffline = () => setDoc(presRef, { online:false, lastSeen:serverTimestamp() }, { merge:true }).catch(()=>{})
        window.addEventListener('beforeunload', markOffline)
        // Count anonymous visitor too
        const visitKey = `visited_anon_${u.uid}`
        if (!sessionStorage.getItem(visitKey)) {
          sessionStorage.setItem(visitKey, '1')
          try { await setDoc(doc(db,'stats','visitors'), { total: increment(1), anonymous: increment(1) }, { merge:true }) } catch {}
        }
        return () => {
          clearInterval(heartbeat)
          window.removeEventListener('beforeunload', markOffline)
          markOffline()
        }
      } else {
        setProfile(null)
      }
    })
  }, [])

  // Register with email + password + username
  async function register(email, password, username) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: username })
    const p = { wins:0, losses:0, username, email, createdAt: serverTimestamp() }
    await setDoc(doc(db, 'users', cred.user.uid), p)
    setProfile(p)
  }

  // Login with email OR username + password
  async function login(emailOrUsername, password) {
    let email = emailOrUsername.trim()
    if (!email.includes('@')) {
      // Lookup email from username — requires read access on users collection
      try {
        const q    = query(collection(db, 'users'), where('username', '==', email))
        const snap = await getDocs(q)
        if (snap.empty) throw { code: 'auth/user-not-found' }
        email = snap.docs[0].data().email
      } catch(e) {
        if (e.code === 'auth/user-not-found') throw e
        // If Firestore blocked the query, tell user to use email instead
        throw { code: 'auth/user-not-found', message: 'Identifiant non trouvé. Essayez avec votre email.' }
      }
    }
    await signInWithEmailAndPassword(auth, email, password)
  }

  // Anonymous — no account, nothing saved to Firestore
  async function loginAnonymous(guestName) {
    const cred = await signInAnonymously(auth)
    const name = guestName?.trim() || 'Invité'
    await updateProfile(cred.user, { displayName: name })
    setProfile({ wins:0, losses:0, username: name, anonymous: true })
  }

  async function logout() { await signOut(auth) }

  async function refreshProfile() {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid))
    if (snap.exists()) setProfile(snap.data())
  }

  return (
    <AuthContext.Provider value={{ user, profile, register, login, loginAnonymous, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
