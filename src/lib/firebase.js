// src/lib/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "AIzaSyBNUpPS3iNrXstd2Kc36FTRkbp4raxHeIE",
  authDomain:        "bataille-navale-aec67.firebaseapp.com",
  projectId:         "bataille-navale-aec67",
  storageBucket:     "bataille-navale-aec67.firebasestorage.app",
  messagingSenderId: "1095315014465",
  appId:             "1:1095315014465:web:4a07493ea259c50b2757c0",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)
export default app
