import { useState, useCallback } from 'react';
import { getQuestionsBySection, shuffle } from '../data/oecData';

const STORAGE_KEY = 'oec_weakness_data';

export function useSession() {
  const [session, setSession] = useState([]);
  const [answers, setAnswers] = useState([]);

  const buildSession = useCallback((sectionIds, mode) => {
    let pool = getQuestionsBySection(sectionIds);
    if (mode === 'random') pool = shuffle(pool);
    setSession(pool);
    setAnswers([]);
    return pool;
  }, []);

  const recordAnswer = useCallback((question, chosen) => {
    const isCorrect = chosen === question.answer;
    const entry = { question, chosen, isCorrect, timestamp: Date.now() };
    setAnswers(prev => [...prev, entry]);

    // Update weakness tracking in localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const key = `${question.sectionId}_${question.num}`;
    if (!stored[key]) stored[key] = { correct: 0, wrong: 0, question };
    if (isCorrect) stored[key].correct++;
    else stored[key].wrong++;
    stored[key].question = question;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    return isCorrect;
  }, []);

  return { session, answers, buildSession, recordAnswer };
}

export function getWeaknessData() {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return Object.values(stored)
    .filter(d => d.wrong > 0)
    .sort((a, b) => {
      const rateA = a.wrong / (a.correct + a.wrong);
      const rateB = b.wrong / (b.correct + b.wrong);
      return rateB - rateA;
    });
}

export function clearWeaknessData() {
  localStorage.removeItem(STORAGE_KEY);
}