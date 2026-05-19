import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getQuestionsBySection, getSectionColor, shuffle, buildSmartSession } from '../data/oecData';
import { recordAnswerForUser } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { saveProgress, loadProgress, clearProgress } from '../utils/quizProgress';
import '../styles/speed.css';


function recordLocalWeakness(question, chosen, isCorrect) {
  const stored = JSON.parse(localStorage.getItem('oec_weakness_data') || '{}');
  const key = `${question.sectionId}_${question.num}`;
  if (!stored[key]) stored[key] = { correct: 0, wrong: 0, question };
  if (isCorrect) stored[key].correct++;
  else stored[key].wrong++;
  stored[key].question = question;
  localStorage.setItem('oec_weakness_data', JSON.stringify(stored));
}

export default function SpeedMode() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [timeLimit, setTimeLimit] = useState(state?.timer ?? 10);

  const [session, setSession] = useState([]);
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(state?.timer ?? 10);
  const [chosen, setChosen] = useState(null);
  const [locked, setLocked] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [flash, setFlash] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!state) {
      const saved = loadProgress('speed');
      if (saved?.session?.length) {
        setSession(saved.session);
        setIndex(saved.index ?? 0);
        setAnswers(saved.answers ?? []);
        const tl = saved.timeLimit ?? 10;
        setTimeLimit(tl);
        setTimeLeft(tl);
        return;
      }
      navigate('/setup/speed');
      return;
    }
    clearProgress('speed');
    const pool = getQuestionsBySection(state.selectedSections);
    const limit = state.count && state.count < pool.length ? state.count : pool.length;
    setSession(buildSmartSession(pool, limit));
  }, [state, navigate]);

  useEffect(() => {
    if (session.length === 0) return;
    saveProgress('speed', { session, index, answers, timeLimit });
  }, [session, index, answers, timeLimit]);

  const currentQ = session[index];

  const advance = useCallback((chosenLetter) => {
    if (!currentQ || locked) return;
    setLocked(true);
    clearInterval(timerRef.current);

    const isCorrect = chosenLetter === currentQ.answer;

    // Always write locally
    recordLocalWeakness(currentQ, chosenLetter, isCorrect);
    // Also write to Firestore if logged in
    if (user) {
      recordAnswerForUser(user.uid, currentQ, isCorrect).catch(console.warn);
    }

    setFlash(isCorrect ? 'correct' : 'wrong');
    setAnswers(prev => [...prev, { question: currentQ, chosen: chosenLetter, isCorrect }]);

    setTimeout(() => {
      setFlash(null);
      if (index + 1 >= session.length) {
        clearProgress('speed');
        navigate('/results', {
          state: {
            answers: [...answers, { question: currentQ, chosen: chosenLetter, isCorrect }],
            mode: 'speed',
          },
        });
      } else {
        setIndex(i => i + 1);
        setChosen(null);
        setLocked(false);
        setTimeLeft(timeLimit);
      }
    }, 600);
  }, [currentQ, locked, index, session.length, answers, navigate, user, timeLimit]);

  // Countdown timer
  useEffect(() => {
    if (!currentQ || locked) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          advance(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQ, locked, advance]);

  // Reset timer on new question
  useEffect(() => { setTimeLeft(timeLimit); }, [index, timeLimit]);

  // Keyboard
  useEffect(() => {
    function onKey(e) {
      if (locked) return;
      const map = { a: 'A', b: 'B', c: 'C', d: 'D' };
      const letter = map[e.key.toLowerCase()];
      if (letter) { setChosen(letter); advance(letter); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, advance]);

  if (!currentQ) return null;

  const color = getSectionColor(currentQ.sectionId);
  const timerPct = (timeLeft / timeLimit) * 100;
  const timerColor = timeLeft > 6 ? '#22c55e' : timeLeft > 3 ? '#f59e0b' : '#ef4444';
  const correct = answers.filter(a => a.isCorrect).length;
  const wrong = answers.filter(a => !a.isCorrect).length;

  return (
    <div className={`speed-page ${flash ? `speed-page--${flash}` : ''}`}>
      <div className="speed-inner">
        <div className="speed-header">
          <button className="speed-exit" onClick={() => navigate('/')}>✕</button>
          <div className="speed-score">
            <span className="speed-correct">{correct}✓</span>
            <span className="speed-wrong">{wrong}✗</span>
            <span className="speed-pos">{index + 1}/{session.length}</span>
          </div>
        </div>

        <div className="speed-timer-wrap">
          <div className="speed-timer-track">
            <div className="speed-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
          </div>
          <span className="speed-timer-num" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>

        <div className="speed-card">
          <span className="speed-pill" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
            S{currentQ.sectionId} — {currentQ.sectionName}
          </span>
          <p className="speed-question">{currentQ.text}</p>
        </div>

        <div className="speed-choices">
          {['A','B','C','D'].map(letter => (
            <button
              key={letter}
              className={`speed-choice ${chosen === letter ? 'speed-choice--selected' : ''} ${locked && letter === currentQ.answer ? 'speed-choice--correct' : ''} ${locked && chosen === letter && chosen !== currentQ.answer ? 'speed-choice--wrong' : ''}`}
              onClick={() => !locked && (setChosen(letter), advance(letter))}
              disabled={locked}
            >
              <span className="speed-choice__ltr">{letter}</span>
              <span className="speed-choice__txt">{currentQ.choices[letter]}</span>
            </button>
          ))}
        </div>

        <p className="speed-hint">Press A B C D quickly!</p>
      </div>
    </div>
  );
}