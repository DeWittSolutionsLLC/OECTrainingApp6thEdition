import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getQuestionsBySection, getSectionColor, shuffle } from '../data/oecData';
import '../styles/speed.css';

const TIME_LIMIT = 10;

function recordWeakness(question, chosen, isCorrect) {
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

  const [session, setSession] = useState([]);
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [chosen, setChosen] = useState(null);
  const [locked, setLocked] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong'
  const timerRef = useRef(null);

  useEffect(() => {
    if (!state) { navigate('/setup/speed'); return; }
    let pool = getQuestionsBySection(state.selectedSections);
    pool = shuffle(pool);
    const limit = state.count && state.count < pool.length ? state.count : Math.min(pool.length, 20);
    setSession(pool.slice(0, limit));
  }, [state, navigate]);

  const currentQ = session[index];

  const advance = useCallback((chosenLetter) => {
    if (!currentQ || locked) return;
    setLocked(true);
    clearInterval(timerRef.current);

    const isCorrect = chosenLetter === currentQ.answer;
    recordWeakness(currentQ, chosenLetter, isCorrect);
    setFlash(isCorrect ? 'correct' : 'wrong');
    setAnswers(prev => [...prev, { question: currentQ, chosen: chosenLetter, isCorrect }]);

    setTimeout(() => {
      setFlash(null);
      if (index + 1 >= session.length) {
        navigate('/results', { state: { answers: [...answers, { question: currentQ, chosen: chosenLetter, isCorrect }], mode: 'speed' } });
      } else {
        setIndex(i => i + 1);
        setChosen(null);
        setLocked(false);
        setTimeLeft(TIME_LIMIT);
      }
    }, 600);
  }, [currentQ, locked, index, session.length, answers, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!currentQ || locked) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          advance(null); // time expired
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQ, locked, advance]);

  // Reset timer on new question
  useEffect(() => { setTimeLeft(TIME_LIMIT); }, [index]);

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
  const timerPct = (timeLeft / TIME_LIMIT) * 100;
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
            §{currentQ.sectionId} — {currentQ.sectionName}
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