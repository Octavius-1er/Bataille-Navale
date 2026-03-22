// src/hooks/useActiveEvent.js
// Reads the currently active event from Firestore in real-time

import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'

export const EVENT_TYPES = {
  disco:      { id:'disco',      icon:'🪩', name:'DISCO',       color:'#ff00ff', desc:'La grille pulse en couleurs !' },
  fog:        { id:'fog',        icon:'🌊', name:'BROUILLARD',  color:'#4a9abb', desc:'La mer ennemie est partiellement cachée.' },
  mines:      { id:'mines',      icon:'💣', name:'MINES',       color:'#ff6600', desc:'Explosion autour de chaque tir !' },
  doubletir:  { id:'doubletir',  icon:'⚡', name:'DOUBLE TIR',  color:'#ffd700', desc:'Chaque tour = 2 tirs.' },
  miroir:     { id:'miroir',     icon:'🌀', name:'MIROIR',      color:'#00ffff', desc:'La grille ennemie est retournée.' },
  speed:      { id:'speed',      icon:'🏃', name:'SPEED',       color:'#ff3a3a', desc:'10s pour tirer sinon tour perdu !' },
  random:     { id:'random',     icon:'🎰', name:'ALÉATOIRE',   color:'#aa44ff', desc:'Effet surprise à chaque partie !' },
}

export function useActiveEvent() {
  const [activeEvent, setActiveEvent] = useState(null)

  useEffect(() => {
    const q = query(collection(db,'events'), where('active','==',true), limit(1))
    const unsub = onSnapshot(q, snap => {
      if (snap.empty) { setActiveEvent(null); return }
      const data = snap.docs[0].data()
      // If random, pick a random event type each time
      if (data.eventType === 'random') {
        const types = Object.keys(EVENT_TYPES).filter(t => t !== 'random')
        const picked = types[Math.floor(Math.random() * types.length)]
        setActiveEvent({ ...data, eventType: picked, originalType: 'random' })
      } else {
        setActiveEvent(data)
      }
    })
    return () => unsub()
  }, [])

  return activeEvent
}
