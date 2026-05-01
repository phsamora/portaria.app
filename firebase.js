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
/* --------------------------------------------------------- */

let app, auth, db;
let _useDemo = false;

try {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
  console.log("✅ Firebase inicializado");
} catch (e) {
  console.warn("⚠️ Firebase não configurado. Usando modo demo.", e);
  _useDemo = true;
}
/* ============================================================
   AUTH EXPORTS
   ============================================================ */
export function fbSignIn(email, password) {
  if (_useDemo) {
    if (email === "porteiro@demo.com" && password === "demo123") {
      return Promise.resolve({ user: demo.user });
    }
    return Promise.reject(new Error("Credenciais inválidas. Use porteiro@demo.com / demo123"));
  }
  return signInWithEmailAndPassword(auth, email, password);
}

export function fbSignOut() {
  if (_useDemo) return Promise.resolve();
  return signOut(auth);
}

export function fbOnAuthChange(cb) {
  if (_useDemo) {
    // Simula estado deslogado inicialmente
    setTimeout(() => cb(null), 100);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export function fbCurrentUser() {
  if (_useDemo) return null;
  return auth?.currentUser || null;
}

/* ============================================================
   FIRESTORE HELPERS
   ============================================================ */

/* ----- VISITORS ----- */
export function fbListenVisitors(cb) {
  if (_useDemo) {
    cb(demo.visitors);
    return () => {};
  }
  const q = query(collection(db, "visitors"), orderBy("entryTime", "desc"));
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(items);
  });
}

export async function fbAddVisitor(data) {
  if (_useDemo) {
    const item = { id: "v" + Date.now(), ...data, status: "inside", entryTime: new Date(), exitTime: null };
    demo.visitors.unshift(item);
    return item;
  }
  const ref = await addDoc(collection(db, "visitors"), {
    ...data,
    status: "inside",
    entryTime: serverTimestamp(),
    exitTime: null
  });
  return { id: ref.id, ...data };
}

export async function fbCheckOutVisitor(id) {
  if (_useDemo) {
    const v = demo.visitors.find(x => x.id === id);
    if (v) { v.status = "outside"; v.exitTime = new Date(); }
    return;
  }
  await updateDoc(doc(db, "visitors", id), {
    status: "outside",
    exitTime: serverTimestamp()
  });
}

/* ----- PACKAGES ----- */
export function fbListenPackages(cb) {
  if (_useDemo) {
    cb(demo.packages);
    return () => {};
  }
  const q = query(collection(db, "packages"), orderBy("receivedAt", "desc"));
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(items);
  });
}

export async function fbAddPackage(data) {
  if (_useDemo) {
    const item = { id: "p" + Date.now(), ...data, status: "pending", receivedAt: new Date() };
    demo.packages.unshift(item);
    return item;
  }
  const ref = await addDoc(collection(db, "packages"), {
    ...data,
    status: "pending",
    receivedAt: serverTimestamp()
  });
  return { id: ref.id, ...data };
}

export async function fbDeliverPackage(id) {
  if (_useDemo) {
    const p = demo.packages.find(x => x.id === id);
    if (p) { p.status = "delivered"; p.deliveredAt = new Date(); }
    return;
  }
  await updateDoc(doc(db, "packages", id), {
    status: "delivered",
    deliveredAt: serverTimestamp()
  });
}

/* ----- RESIDENTS ----- */
export function fbListenResidents(cb) {
  if (_useDemo) {
    cb(demo.residents);
    return () => {};
  }
  const q = query(collection(db, "residents"), orderBy("name"));
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(items);
  });
}

export async function fbAddResident(data) {
  if (_useDemo) {
    const item = { id: "r" + Date.now(), ...data };
    demo.residents.push(item);
    demo.residents.sort((a,b) => a.name.localeCompare(b.name));
    return item;
  }
  const ref = await addDoc(collection(db, "residents"), data);
  return { id: ref.id, ...data };
}

export async function fbDeleteResident(id) {
  if (_useDemo) {
    const i = demo.residents.findIndex(x => x.id === id);
    if (i > -1) demo.residents.splice(i, 1);
    return;
  }
  await deleteDoc(doc(db, "residents", id));
}

/* ============================================================
   UTILS
   ============================================================ */
export function formatTime(val) {
  if (!val) return "–";
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(val) {
  if (!val) return "–";
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function isToday(val) {
  if (!val) return false;
  const d = val?.toDate ? val.toDate() : new Date(val);
  const now = new Date();
  return d.getDate() === now.getDate() &&
         d.getMonth() === now.getMonth() &&
         d.getFullYear() === now.getFullYear();
}

export function initials(name) {
  return (name || "?").split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
}

export { _useDemo };
