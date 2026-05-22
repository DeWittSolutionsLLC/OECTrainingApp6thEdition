import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import ProgressBar from '../components/ProgressBar';
import { shuffle, normalizeQuestions } from '../data/oecData';
import { recordAnswerForUser, getUserWeaknessData, clearUserWeaknessData, clearSingleWeaknessEntry, saveQuizProgress, loadQuizProgress, clearQuizProgress } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { saveProgress, loadProgress, clearProgress } from '../utils/quizProgress';
import '../styles/weakness.css';

const LOCAL_KEY = 'oec_weakness_data';
const MASTERY_STREAK = 3;

function getLocalWeaknessData() {
  const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  return Object.values(stored)
    .filter(d => d.wrong > 0)
    .sort((a, b) => {
      const rA = a.wrong / (a.correct + a.wrong);
      const rB = b.wrong / (b.correct + b.wrong);
      return rB - rA;
    });
}

function recordLocalWeakness(question, isCorrect) {
  const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  const key = `${question.sectionId}_${question.num}`;
  if (!stored[key]) stored[key] = { correct: 0, wrong: 0, streak: 0, question };

  if (isCorrect) {
    stored[key].correct++;
    stored[key].streak = (stored[key].streak || 0) + 1;
  } else {
    stored[key].wrong++;
    stored[key].streak = 0;
  }
  stored[key].question = question;

  // Remove from weakness data when mastery streak reached
  if (stored[key].streak >= MASTERY_STREAK) {
    delete stored[key];
  }

  localStorage.setItem(LOCAL_KEY, JSON.stringify(stored));
}

export default function WeaknessMode() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const initDoneRef = useRef(false);

  const [session, setSession] = useState([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [justMastered, setJustMastered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questionStats, setQuestionStats] = useState({});

  useEffect(() => {
    if (authLoading || initDoneRef.current) return;
    initDoneRef.current = true;

    async function loadSession() {
      // Try localStorage first
      let saved = loadProgress('weakness');

      // Try Firestore if no local progress and user is logged in
      if (!saved?.session?.length && user) {
        const cloud = await loadQuizProgress(user.uid, 'weakness').catch(() => null);
        if (cloud?.session?.length) { saved = cloud; saveProgress('weakness', cloud); }
      }

      if (saved?.session?.length) {
        setSession(normalizeQuestions(saved.session));
        setIndex(saved.index ?? 0);
        setCorrect(saved.correct ?? 0);
        setWrong(saved.wrong ?? 0);
        setMasteredCount(saved.masteredCount ?? 0);
        setQuestionStats(saved.questionStats ?? {});
        setLoading(false);
        return;
      }

      let data;
      if (user) {
        data = await getUserWeaknessData(user.uid).catch(() => getLocalWeaknessData());
      } else {
        data = getLocalWeaknessData();
      }

      if (data.length === 0) { navigate('/setup/weakness'); return; }

      const statsMap = {};
      data.forEach(d => {
        const key = `${d.question.sectionId}_${d.question.num}`;
        statsMap[key] = { correct: d.correct, wrong: d.wrong, streak: d.streak || 0 };
      });
      setQuestionStats(statsMap);
      setSession(normalizeQuestions(shuffle(data.map(d => d.question))));
      setLoading(false);
    }
    loadSession();
  }, [user, navigate, authLoading]);

  // localStorage auto-save
  useEffect(() => {
    if (session.length === 0) return;
    saveProgress('weakness', { session, index, correct, wrong, masteredCount, questionStats });
  }, [session, index, correct, wrong, masteredCount, questionStats]);

  // Firestore save on question advance
  useEffect(() => {
    if (session.length === 0 || !user) return;
    saveQuizProgress(user.uid, 'weakness', { session, index, correct, wrong, masteredCount, questionStats }).catch(console.warn);
  }, [session, index, user]);

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

    const key = `${currentQ.sectionId}_${currentQ.num}`;
    const prevStreak = questionStats[key]?.streak || 0;
    const newStreak = isCorrect ? prevStreak + 1 : 0;
    const nowMastered = newStreak >= MASTERY_STREAK;

    setQuestionStats(prev => {
      const s = prev[key] || { correct: 0, wrong: 0, streak: 0 };
      return {
        ...prev,
        [key]: {
          correct: s.correct + (isCorrect ? 1 : 0),
          wrong: s.wrong + (isCorrect ? 0 : 1),
          streak: newStreak,
        },
      };
    });

    recordLocalWeakness(currentQ, isCorrect);
    if (user) {
      recordAnswerForUser(user.uid, currentQ, isCorrect).catch(console.warn);
      if (nowMastered) {
        clearSingleWeaknessEntry(user.uid, key).catch(console.warn);
      }
    }

    setJustMastered(nowMastered);
    if (isCorrect) setCorrect(c => c + 1);
    else setWrong(w => w + 1);
    if (nowMastered) setMasteredCount(n => n + 1);
  }

  function handleNext() {
    setJustMastered(false);
    if (index + 1 >= session.length) {
      clearProgress('weakness');
      if (user) clearQuizProgress(user.uid, 'weakness').catch(console.warn);
      navigate('/results', {
        state: {
          answers: [],
          mode: 'weakness',
          summary: { correct, wrong, mastered: masteredCount, total: session.length },
        },
      });
    } else {
      setIndex(i => i + 1);
      setChosen(null);
      setConfirmed(false);
    }
  }

  async function handleClear() {
    if (user) {
      await clearUserWeaknessData(user.uid).catch(console.warn);
      await clearQuizProgress(user.uid, 'weakness').catch(console.warn);
    }
    localStorage.removeItem(LOCAL_KEY);
    clearProgress('weakness');
    navigate('/');
  }

  if (loading) return <div className="weakness-loading">Loading your drill…</div>;
  if (!currentQ) return null;

  const key = `${currentQ.sectionId}_${currentQ.num}`;
  const stats = questionStats[key] || { correct: 0, wrong: 0, streak: 0 };
  const totalAttempts = stats.correct + stats.wrong;
  const errorRate = totalAttempts > 0 ? Math.round((stats.wrong / totalAttempts) * 100) : 0;
  const streak = stats.streak || 0;

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
            <div className="w-streak-pips">
              {Array.from({ length: MASTERY_STREAK }).map((_, i) => (
                <span key={i} className={`w-streak-pip ${i < streak ? 'w-streak-pip--filled' : ''}`} />
              ))}
            </div>
            <span className="w-stat__l">Streak {streak}/{MASTERY_STREAK}</span>
          </div>
          <div className="w-stat">
            <span className="w-stat__n w-stat__n--ok">{masteredCount}</span>
            <span className="w-stat__l">Mastered</span>
          </div>
        </div>

        {justMastered && confirmed && (
          <div className="weakness-mastered-banner">
            <span className="weakness-mastered-banner__icon">🏆</span>
            <div>
              <p className="weakness-mastered-banner__title">Mastered!</p>
              <p className="weakness-mastered-banner__sub">This question has been removed from your weakness list.</p>
            </div>
          </div>
        )}

        <QuestionCard
          question={currentQ}
          chosen={chosen}
          confirmed={confirmed}
          onChoose={setChosen}
          showExplanation={!justMastered}
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

        <button className="weakness-clear" onClick={handleClear}>
          Clear all weakness data
        </button>
      </div>
    </div>
  );
}
