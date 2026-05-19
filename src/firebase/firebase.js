// firebase/firebase.js
// Replace the config object with your own Firebase project credentials

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
  deleteDoc,
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

// ─── YOUR CONFIG ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};
// ──────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── AUTH HELPERS ─────────────────────────────────────────────

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

export async function getOrCreateUserProfile(firebaseUser) {
  const ref = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const data = {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || 'Anonymous',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || '',
    createdAt: serverTimestamp(),
    totalSessions: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalQuestions: 0,
  };
  await setDoc(ref, data);
  const fresh = await getDoc(ref);
  return fresh.data();
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
    .map((d) => ({ streak: 0, ...d.data() }))
    .filter((d) => d.wrong > 0)
    .sort((a, b) => {
      const rateA = a.wrong / (a.correct + a.wrong);
      const rateB = b.wrong / (b.correct + b.wrong);
      return rateB - rateA;
    });
}

/**
 * Removes a single weakness entry when the user has mastered it.
 * Called from WeaknessMode when streak reaches the mastery threshold.
 */
export async function clearSingleWeaknessEntry(uid, key) {
  const ref = doc(db, 'users', uid, 'weakness', key);
  await deleteDoc(ref).catch(console.warn);
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

// ─── QUIZ PROGRESS ────────────────────────────────────────────

export async function saveQuizProgress(uid, mode, data) {
  const ref = doc(db, 'users', uid, 'quizProgress', mode);
  await setDoc(ref, { ...data, savedAt: serverTimestamp() });
}

export async function loadQuizProgress(uid, mode) {
  const ref = doc(db, 'users', uid, 'quizProgress', mode);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function clearQuizProgress(uid, mode) {
  const ref = doc(db, 'users', uid, 'quizProgress', mode);
  await deleteDoc(ref).catch(console.warn);
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