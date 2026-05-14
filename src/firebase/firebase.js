import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

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
export const auth = getAuth(app);
export const db = getFirestore(app);

const COLLECTION_NAME = 'leaderboard';
export const googleProvider = new GoogleAuthProvider();
 
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(result.user);
  return result.user;
}
 
export async function signUpWithEmail(email, password, displayName) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await ensureUserDoc(result.user);
  return result.user;
}
 
export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}
 
export async function logOut() {
  await signOut(auth);
}
 
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
 
// ─── USER DOCUMENT ────────────────────────────────────────────
 
/**
 * Creates or verifies a user document in Firestore.
 * Schema: users/{uid}
 */
async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      totalSessions: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalQuestions: 0,
    });
  }
}
 
export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
 
export async function updateUserProfile(uid, updates) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, updates);
}
 
// ─── WEAKNESS TRACKING ────────────────────────────────────────
 
/**
 * Record a single question answer for a user.
 * Stores in: users/{uid}/weakness/{sectionId_num}
 */
export async function recordAnswerForUser(uid, question, isCorrect) {
  const key = `${question.sectionId}_${question.num}`;
  const ref = doc(db, 'users', uid, 'weakness', key);
  const snap = await getDoc(ref);
 
  if (snap.exists()) {
    await updateDoc(ref, {
      [isCorrect ? 'correct' : 'wrong']: increment(1),
      lastSeen: serverTimestamp(),
      question, // keep question data fresh
    });
  } else {
    await setDoc(ref, {
      correct: isCorrect ? 1 : 0,
      wrong: isCorrect ? 0 : 1,
      question,
      firstSeen: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });
  }
}
 
/**
 * Fetches all weakness data for a user (questions with wrong > 0),
 * sorted by error rate descending.
 */
export async function getUserWeaknessData(uid) {
  const ref = collection(db, 'users', uid, 'weakness');
  const snap = await getDocs(ref);
  return snap.docs
    .map((d) => d.data())
    .filter((d) => d.wrong > 0)
    .sort((a, b) => {
      const rateA = a.wrong / (a.correct + a.wrong);
      const rateB = b.wrong / (b.correct + b.wrong);
      return rateB - rateA;
    });
}
 
/**
 * Clears all weakness data for a user.
 */
export async function clearUserWeaknessData(uid) {
  const ref = collection(db, 'users', uid, 'weakness');
  const snap = await getDocs(ref);
  const deletes = snap.docs.map((d) =>
    // Firestore doesn't have batch delete in SDK v9 easily, so we setDoc to reset
    setDoc(d.ref, { correct: 0, wrong: 0, question: d.data().question, cleared: true })
  );
  await Promise.all(deletes);
}
 
// ─── SESSION HISTORY ──────────────────────────────────────────
 
/**
 * Saves a completed session to users/{uid}/sessions
 * and increments aggregate counters on the user doc.
 */
export async function saveSession(uid, { mode, correct, wrong, total, scorePct }) {
  // Add session document
  await addDoc(collection(db, 'users', uid, 'sessions'), {
    mode,
    correct,
    wrong,
    total,
    scorePct,
    createdAt: serverTimestamp(),
  });
 
  // Increment user aggregate stats
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    totalSessions: increment(1),
    totalCorrect: increment(correct),
    totalWrong: increment(wrong),
    totalQuestions: increment(total),
  });
}
 
/**
 * Returns the last N sessions for a user.
 */
export async function getUserSessions(uid, limitCount = 20) {
  const ref = collection(db, 'users', uid, 'sessions');
  const q = query(ref, orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
 
// ─── LEADERBOARD ─────────────────────────────────────────────
 
/**
 * Submit a leaderboard entry. One doc per user+mode combination
 * (overwrites if the new score is better).
 */
export async function submitLeaderboardEntry({ uid, name, mode, scorePct, correct, wrong, total }) {
  // Use a deterministic ID so each user has at most one entry per mode
  const entryId = uid ? `${uid}_${mode}` : `anon_${Date.now()}`;
  const ref = doc(db, 'leaderboard', entryId);
  const existing = await getDoc(ref);
 
  if (!existing.exists() || existing.data().scorePct < scorePct) {
    await setDoc(ref, {
      uid: uid || null,
      name,
      mode,
      scorePct,
      correct,
      wrong,
      total,
      updatedAt: serverTimestamp(),
    });
  }
}
 
/**
 * Fetch top leaderboard entries, optionally filtered by mode.
 */
export async function fetchTopLeaderboardEntries({ mode = 'all', limit: lim = 25 } = {}) {
  let q;
  const ref = collection(db, 'leaderboard');
  if (mode === 'all') {
    q = query(ref, orderBy('scorePct', 'desc'), limit(lim));
  } else {
    q = query(ref, where('mode', '==', mode), orderBy('scorePct', 'desc'), limit(lim));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
 
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

