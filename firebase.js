/* ============================================================
   PORTAFÁCIL – firebase.js
   Firebase Authentication + Firestore
   ============================================================
   
   ⚠️  INSTRUÇÕES DE CONFIGURAÇÃO:
   1. Acesse https://console.firebase.google.com
   2. Crie um projeto → Adicione um app Web
   3. Copie as credenciais do seu projeto e substitua abaixo
   4. No Firebase Console, ative:
      - Authentication → Email/Senha
      - Firestore Database (modo production ou teste)
   5. Crie os primeiros usuários em Authentication → Users
   
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* -------- 🔧 SUBSTITUA AQUI COM SUAS CREDENCIAIS -------- */
const firebaseConfig = {
  apiKey: "AIzaSyBMi8I-t4tBrD71gpFkPPra9yuRLmVXCo0",
  authDomain: "portaria-condominio-2a03f.firebaseapp.com",
  databaseURL: "https://portaria-condominio-2a03f-default-rtdb.firebaseio.com",
  projectId: "portaria-condominio-2a03f",
  storageBucket: "portaria-condominio-2a03f.firebasestorage.app",
  messagingSenderId: "865427708236",
  appId: "1:865427708236:web:00281ab28926a48b00d7e9"
};
