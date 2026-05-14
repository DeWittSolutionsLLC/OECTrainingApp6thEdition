import { initializeApp } from 'firebase/app';
import { getFirestore, serverTimestamp, collection, addDoc, query, orderBy, limit, getDocs, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase only once
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTION_NAME = 'leaderboard';

function requireEnv(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing Firebase env var: ${key}`);
  return v;
}

export function assertFirebaseConfigured() {
  requireEnv('REACT_APP_FIREBASE_API_KEY');
  requireEnv('REACT_APP_FIREBASE_AUTH_DOMAIN');
  requireEnv('REACT_APP_FIREBASE_PROJECT_ID');
  requireEnv('REACT_APP_FIREBASE_STORAGE_BUCKET');
  requireEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID');
  requireEnv('REACT_APP_FIREBASE_APP_ID');
}

export async function submitLeaderboardEntry({ name, mode, scorePct, correct, wrong, total }) {
  // Fire-and-forget is not used; we return the write result.
  const safeName = (name || '').trim().slice(0, 30) || 'Anonymous';
  const safeMode = (mode || '').toString();

  return addDoc(collection(db, COLLECTION_NAME), {
    name: safeName,
    mode: safeMode,
    scorePct: Number.isFinite(scorePct) ? scorePct : 0,
    correct: Number.isFinite(correct) ? correct : 0,
    wrong: Number.isFinite(wrong) ? wrong : 0,
    total: Number.isFinite(total) ? total : 0,
    createdAt: serverTimestamp(),
  });
}

export async function fetchTopLeaderboardEntries({ mode = 'all', limit: topN = 20 } = {}) {
  const qParts = [];

  if (mode && mode !== 'all') {
    qParts.push(where('mode', '==', mode));
  }

  qParts.push(orderBy('scorePct', 'desc'), orderBy('createdAt', 'desc'), limit(topN));

  const q = query(collection(db, COLLECTION_NAME), ...qParts);
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

