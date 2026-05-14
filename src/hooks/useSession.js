// hooks/useSession.js
import { useState, useCallback } from 'react';
import { getQuestionsBySection, shuffle } from '../data/oecData';
import { recordAnswerForUser, getUserWeaknessData, clearUserWeaknessData } from '../firebase/firebase';

const STORAGE_KEY = 'oec_weakness_data';

// ─── React hook ───────────────────────────────────────────────

export function useSession(uid = null) {
  const [session, setSession] = useState([]);
  const [answers, setAnswers] = useState([]);

  const buildSession = useCallback((sectionIds, mode) => {
    let pool = getQuestionsBySection(sectionIds);
    if (mode === 'random') pool = shuffle(pool);
    setSession(pool);
    setAnswers([]);
    return pool;
  }, []);

  const recordAnswer = useCallback(
    async (question, chosen) => {
      const isCorrect = chosen === question.answer;
      const entry = { question, chosen, isCorrect, timestamp: Date.now() };
      setAnswers((prev) => [...prev, entry]);

      if (uid) {
        // Authenticated: write to Firestore
        await recordAnswerForUser(uid, question, isCorrect).catch(console.warn);
      } else {
        // Guest: write to localStorage
        _recordLocalWeakness(question, chosen, isCorrect);
      }

      return isCorrect;
    },
    [uid]
  );

  return { session, answers, buildSession, recordAnswer };
}

// ─── Weakness data helpers ────────────────────────────────────

/**
 * Returns weakness data.
 * If uid provided, fetches from Firestore (async).
 * Otherwise, returns from localStorage synchronously.
 */
export async function getWeaknessData(uid = null) {
  if (uid) {
    return getUserWeaknessData(uid);
  }
  return _getLocalWeaknessData();
}

/**
 * Clears weakness data.
 */
export async function clearWeaknessData(uid = null) {
  if (uid) {
    return clearUserWeaknessData(uid);
  }
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Local (guest) helpers ────────────────────────────────────

export function getWeaknessDataSync() {
  return _getLocalWeaknessData();
}

function _getLocalWeaknessData() {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return Object.values(stored)
    .filter((d) => d.wrong > 0)
    .sort((a, b) => {
      const rateA = a.wrong / (a.correct + a.wrong);
      const rateB = b.wrong / (b.correct + b.wrong);
      return rateB - rateA;
    });
}

function _recordLocalWeakness(question, chosen, isCorrect) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const key = `${question.sectionId}_${question.num}`;
  if (!stored[key]) stored[key] = { correct: 0, wrong: 0, question };
  if (isCorrect) stored[key].correct++;
  else stored[key].wrong++;
  stored[key].question = question;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

// Keep a sync version for components that haven't migrated to async yet
export { _getLocalWeaknessData as getWeaknessDataLocal };