import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import ProgressBar from '../components/ProgressBar';
import { getWeaknessData, clearWeaknessData } from '../hooks/useSession';
import { shuffle } from '../data/oecData';
import '../styles/weakness.css';

function recordWeakness(question, chosen, isCorrect) {
  const stored = JSON.parse(localStorage.getItem('oec_weakness_data') || '{}');
  const key = `${question.sectionId}_${question.num}`;
  if (!stored[key]) stored[key] = { correct: 0, wrong: 0, question };
  if (isCorrect) stored[key].correct++;
  else stored[key].wrong++;
  stored[key].question = question;
  localStorage.setItem('oec_weakness_data', JSON.stringify(stored));
}

export default function WeaknessMode() {
  const navigate = useNavigate();
  const [session, setSession] = useState([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [mastered, setMastered] = useState([]);

  useEffect(() => {
    const data = getWeaknessData();
    if (data.length === 0) { navigate('/setup/weakness'); return; }
    const questions = shuffle(data.map(d => d.question));
    setSession(questions);
  }, [navigate]);

  useEffect(() => {
    function onKey(e) {
      const map = { a: 'A', b: 'B', c: 'C', d: 'D' };
      const letter = map[e.key.toLowerCase()];
      if (letter && !confirmed) setChosen(letter);
      if (e.key === 'Enter' && !confirmed && chosen) handleConfirm();
      if ((e.key === 'Enter' || e.key === 'ArrowRight') && confirmed) handleNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const currentQ = session[index];

  function handleConfirm() {
    if (!chosen || confirmed) return;
    const isCorrect = chosen === currentQ.answer;
    setConfirmed(true);
    recordWeakness(currentQ, chosen, isCorrect);
    if (isCorrect) {
      setCorrect(c => c + 1);
      setMastered(m => [...m, currentQ]);
    } else {
      setWrong(w => w + 1);
    }
  }

  function handleNext() {
    if (index + 1 >= session.length) {
      navigate('/results', {
        state: {
          answers: [],
          mode: 'weakness',
          summary: { correct, wrong, mastered: mastered.length, total: session.length },
        },
      });
    } else {
      setIndex(i => i + 1);
      setChosen(null);
      setConfirmed(false);
    }
  }

  if (!currentQ) return null;

  const stored = JSON.parse(localStorage.getItem('oec_weakness_data') || '{}');
  const key = `${currentQ.sectionId}_${currentQ.num}`;
  const stats = stored[key] || { correct: 0, wrong: 0 };
  const totalAttempts = stats.correct + stats.wrong;
  const errorRate = totalAttempts > 0 ? Math.round((stats.wrong / totalAttempts) * 100) : 0;

  return (
    <div className="weakness-page">
      <div className="weakness-inner">
        <div className="weakness-header">
          <button className="weakness-exit" onClick={() => navigate('/')}>✕ Exit</button>
          <div className="weakness-info">
            <span className="weakness-fire">🔥</span>
            <span className="weakness-label">Weakness Drill</span>
          </div>
          <ProgressBar current={index} total={session.length} correct={correct} wrong={wrong} />
        </div>

        <div className="weakness-stats">
          <div className="w-stat">
            <span className="w-stat__n w-stat__n--err">{errorRate}%</span>
            <span className="w-stat__l">Error Rate</span>
          </div>
          <div className="w-stat">
            <span className="w-stat__n">{stats.wrong}</span>
            <span className="w-stat__l">Times Wrong</span>
          </div>
          <div className="w-stat">
            <span className="w-stat__n w-stat__n--ok">{mastered.length}</span>
            <span className="w-stat__l">Mastered Today</span>
          </div>
        </div>

        <QuestionCard
          question={currentQ}
          chosen={chosen}
          confirmed={confirmed}
          onChoose={setChosen}
          showExplanation={true}
        />

        <div className="weakness-actions">
          {!confirmed ? (
            <button
              className="weakness-btn weakness-btn--confirm"
              disabled={!chosen}
              onClick={handleConfirm}
            >
              Check Answer
            </button>
          ) : (
            <button className="weakness-btn weakness-btn--next" onClick={handleNext}>
              {index + 1 >= session.length ? 'Finish Drill' : 'Next →'}
            </button>
          )}
        </div>

        <button className="weakness-clear" onClick={() => { clearWeaknessData(); navigate('/'); }}>
          Clear all weakness data
        </button>
      </div>
    </div>
  );
}