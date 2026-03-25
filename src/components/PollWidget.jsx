// src/components/PollWidget.jsx
// Affiché à tous les joueurs quand un sondage est actif
// Se ferme automatiquement quand le sondage se termine

import { useState, useEffect } from 'react'
import { doc, onSnapshot, updateDoc, collection, query, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'

export default function PollWidget() {
  const { user } = useAuth()
  const [poll,       setPoll]       = useState(null)
  const [myVotes,    setMyVotes]    = useState([])
  const [results,    setResults]    = useState({})
  const [voted,      setVoted]      = useState(false)
  const [dismissed,  setDismissed]  = useState(false)
  const [expanded,   setExpanded]   = useState(true)

  useEffect(() => {
    if (!user) return
    // Listen for active poll
    const q = query(collection(db,'polls'), where('active','==',true), limit(1))
    const unsub = onSnapshot(q, snap => {
      if (snap.empty) { setPoll(null); setVoted(false); setMyVotes([]); return }
      const data = { id: snap.docs[0].id, ...snap.docs[0].data() }
      setPoll(data)
      // Tally
      const tally = {}
      data.options.forEach((_,i) => { tally[i] = 0 })
      Object.values(data.votes||{}).forEach(v => {
        const arr = Array.isArray(v) ? v : [v]
        arr.forEach(i => { tally[i] = (tally[i]||0)+1 })
      })
      setResults(tally)
      // Check if already voted
      if (data.votes?.[user.uid] !== undefined) {
        setVoted(true)
        setMyVotes(Array.isArray(data.votes[user.uid]) ? data.votes[user.uid] : [data.votes[user.uid]])
      }
    })
    return () => unsub()
  }, [user])

  async function castVote() {
    if (!poll || !user || myVotes.length === 0) return
    try {
      await updateDoc(doc(db,'polls',poll.id), {
        [`votes.${user.uid}`]: poll.multi ? myVotes : myVotes[0],
      })
      setVoted(true)
    } catch(e) { console.error('Vote error:', e) }
  }

  function toggleOption(i) {
    if (voted) return
    if (poll.multi) {
      setMyVotes(v => v.includes(i) ? v.filter(x=>x!==i) : [...v, i])
    } else {
      setMyVotes([i])
    }
  }

  if (!poll || dismissed) return null

  const total = Object.values(results).reduce((s,v)=>s+v,0) || 1
  const maxVotes = Math.max(...Object.values(results), 0)

  return (
    <div style={{
      position:'fixed', bottom:20, right:20, zIndex:500,
      width: expanded ? 320 : 48,
      transition:'width .25s ease',
    }}>
      {/* Collapsed state — just a pulsing icon */}
      {!expanded && (
        <button onClick={()=>setExpanded(true)} style={{
          width:48, height:48, borderRadius:'50%',
          background:'rgba(0,212,255,.15)', border:'2px solid #00d4ff',
          color:'#00d4ff', fontSize:20, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 0 20px rgba(0,212,255,.3)',
          animation:'blink 1.5s ease-in-out infinite',
        }}>📊</button>
      )}

      {/* Expanded state */}
      {expanded && (
        <div style={{
          background:'rgba(9,21,37,.97)', border:'1px solid rgba(0,212,255,.35)',
          boxShadow:'0 8px 40px rgba(0,0,0,.5), 0 0 30px rgba(0,212,255,.1)',
          borderRadius:4, overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding:'10px 14px', background:'rgba(0,212,255,.08)',
            borderBottom:'1px solid rgba(0,212,255,.2)',
            display:'flex', alignItems:'center', gap:8,
          }}>
            <span style={{fontSize:14}}>📊</span>
            <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:14,letterSpacing:3,color:'#00d4ff',flex:1}}>
              SONDAGE EN DIRECT
            </span>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#00ff88',flexShrink:0,animation:'blink 1s infinite'}}/>
            <button onClick={()=>setExpanded(false)} style={{background:'none',border:'none',color:'#4a7090',cursor:'pointer',fontSize:14,padding:0,marginLeft:4}}>_</button>
            <button onClick={()=>setDismissed(true)} style={{background:'none',border:'none',color:'#4a7090',cursor:'pointer',fontSize:14,padding:0}}>✕</button>
          </div>

          {/* Question */}
          <div style={{padding:'12px 14px 8px'}}>
            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:9,color:'#4a7090',marginBottom:6,letterSpacing:1}}>
              {poll.multi ? 'PLUSIEURS CHOIX POSSIBLES' : 'UN SEUL CHOIX'}
              {' · '}{total} participant{total!==1?'s':''}
            </div>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:16,letterSpacing:2,color:'#c8e6f0',lineHeight:1.3,marginBottom:12}}>
              {poll.question}
            </div>

            {/* Options */}
            {poll.options.map((opt, i) => {
              const count = results[i] || 0
              const pct   = Math.round(count/total*100)
              const isSelected = myVotes.includes(i)
              const isWinner   = voted && count === maxVotes && count > 0

              return (
                <div key={i}
                  onClick={()=>toggleOption(i)}
                  style={{
                    marginBottom:8, cursor: voted ? 'default' : 'pointer',
                    border:`1px solid ${isSelected?'#00d4ff':isWinner?'rgba(0,255,136,.4)':'#1a3a5c'}`,
                    background: isSelected ? 'rgba(0,212,255,.08)' : 'transparent',
                    transition:'all .15s', position:'relative', overflow:'hidden',
                  }}>
                  {/* Progress bar fill */}
                  {voted && (
                    <div style={{
                      position:'absolute', top:0, left:0, bottom:0,
                      width:`${pct}%`,
                      background: isWinner ? 'rgba(0,255,136,.12)' : 'rgba(0,212,255,.06)',
                      transition:'width .5s ease',
                    }}/>
                  )}
                  <div style={{padding:'8px 10px',position:'relative',display:'flex',alignItems:'center',gap:8}}>
                    {/* Checkbox/radio */}
                    <div style={{
                      width:14, height:14, borderRadius: poll.multi ? 2 : '50%',
                      border:`1px solid ${isSelected?'#00d4ff':'#2a4a6a'}`,
                      background: isSelected ? '#00d4ff' : 'transparent',
                      flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {isSelected && <span style={{color:'#050d1a',fontSize:9,lineHeight:1}}>✓</span>}
                    </div>
                    <span style={{fontFamily:'Share Tech Mono,monospace',fontSize:11,color:isWinner?'#00ff88':'#c8e6f0',flex:1}}>{opt}</span>
                    {voted && (
                      <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:13,color:isWinner?'#00ff88':'#4a7090',flexShrink:0}}>
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Vote button or voted state */}
            {!voted ? (
              <button
                onClick={castVote}
                disabled={myVotes.length === 0}
                style={{
                  width:'100%', padding:'10px', marginTop:4,
                  fontFamily:'Bebas Neue,sans-serif', fontSize:14, letterSpacing:2,
                  background: myVotes.length > 0 ? 'rgba(0,212,255,.15)' : 'transparent',
                  border:`1px solid ${myVotes.length>0?'#00d4ff':'#1a3a5c'}`,
                  color: myVotes.length > 0 ? '#00d4ff' : '#2a4a6a',
                  cursor: myVotes.length > 0 ? 'pointer' : 'not-allowed',
                  transition:'all .15s',
                }}>
                ✓ VOTER
              </button>
            ) : (
              <div style={{textAlign:'center',padding:'8px 0',fontFamily:'Share Tech Mono,monospace',fontSize:10,color:'#00ff88'}}>
                ✓ Votre vote a été enregistré
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
