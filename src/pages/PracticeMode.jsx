import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import ProgressBar from '../components/ProgressBar';
import { getQuestionsBySection, shuffle } from '../data/oecData';
import { recordAnswerForUser, saveQuizProgress, loadQuizProgress, clearQuizProgress } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { saveProgress, loadProgress, clearProgress } from '../utils/quizProgress';
import '../styles/practice.css';

function recordLocalWeakness(question, isCorrect) {
  const stored = JSON.parse(localStorage.getItem('oec_weakness_data') || '{}');
  const key = `${question.sectionId}_${question.num}`;
  if (!stored[key]) stored[key] = { correct: 0, wrong: 0, question };
  if (isCorrect) stored[key].correct++;
  else stored[key].wrong++;
  stored[key].question = question;
  localStorage.setItem('oec_weakness_data', JSON.stringify(stored));
}

export default function PracticeMode() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const initDoneRef = useRef(false);

  const [session, setSession] = useState([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    if (loading || initDoneRef.current) return;
    initDoneRef.current = true;

    async function init() {
      const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';

      if (isReload || !state) {
        let saved = loadProgress('practice');
        if (!saved?.session?.length && user) {
          const cloud = await loadQuizProgress(user.uid, 'practice').catch(() => null);
          if (cloud?.session?.length) { saved = cloud; saveProgress('practice', cloud); }
        }
        if (saved?.session?.length) {
          setSession(saved.session);
          setIndex(saved.index ?? 0);
          setAnswers(saved.answers ?? []);
          setCorrect(saved.correct ?? 0);
          setWrong(saved.wrong ?? 0);
          setSkipped(saved.skipped ?? 0);
          if (saved.confirmedChosen) { setChosen(saved.confirmedChosen); setConfirmed(true); }
          return;
        }
        if (!state) { navigate('/setup/practice'); return; }
      }

      clearProgress('practice');
      if (user) clearQuizProgress(user.uid, 'practice').catch(console.warn);
      let pool = getQuestionsBySection(state.selectedSections);
      if (state.order === 'random') pool = shuffle(pool);
      setSession(pool);
    }

    init();
  }, [state, navigate, user, loading]);

  // localStorage auto-save on every change
  useEffect(() => {
    if (session.length === 0) return;
    saveProgress('practice', { session, index, answers, correct, wrong, skipped, confirmedChosen: confirmed ? chosen : null });
  }, [session, index, answers, correct, wrong, skipped, confirmed, chosen]);

  // Firestore save on meaningful checkpoints
  useEffect(() => {
    if (session.length === 0 || !user) return;
    saveQuizProgress(user.uid, 'practice', { session, index, answers, correct, wrong, skipped, confirmedChosen: confirmed ? chosen : null }).catch(console.warn);
  }, [session, index, confirmed, user]);

  useEffect(() => {
    function onKey(e) {
      const map = { a: 'A', b: 'B', c: 'C', d: 'D' };
      const letter = map[e.key.toLowerCase()];
      if (letter && !confirmed) setChosen(letter);
      if (e.key === 'Enter' && !confirmed && chosen) handleConfirm();
      if ((e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') && confirmed) handleNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const currentQ = session[index];

  function handleConfirm() {
    if (!chosen || confirmed) return;
    const isCorrect = chosen === currentQ.answer;
    setConfirmed(true);

    recordLocalWeakness(currentQ, isCorrect);
    if (user) {
      recordAnswerForUser(user.uid, currentQ, isCorrect).catch(console.warn);
    }

    setAnswers(prev => [...prev, { question: currentQ, chosen, isCorrect }]);
    if (isCorrect) setCorrect(c => c + 1);
    else setWrong(w => w + 1);
  }

  function handleNext() {
    if (index + 1 >= session.length) {
      clearProgress('practice');
      if (user) clearQuizProgress(user.uid, 'practice').catch(console.warn);
      navigate('/results', {
        state: {
          answers: [...answers],
          mode: 'practice',
          summary: { correct, wrong, skipped, total: session.length },
        },
      });
    } else {
      setIndex(i => i + 1);
      setChosen(null);
      setConfirmed(false);
    }
  }

  function handleSkip() {
    if (confirmed) return;
    setSkipped(s => s + 1);
    handleNext();
  }

  if (!currentQ) return null;

  return (
    <div className="practice-page">
      <div className="practice-page__inner">
        <div className="practice-page__header">
          <button className="practice-page__exit" onClick={() => navigate('/')}>✕ Exit</button>
          <ProgressBar current={index} total={session.length} correct={correct} wrong={wrong} />
        </div>

        <div className="practice-page__streak">
          <div className="pstreak pstreak--correct">
            <span className="pstreak__n">{correct}</span>
            <span className="pstreak__l">Correct</span>
          </div>
          <div className="pstreak pstreak--wrong">
            <span className="pstreak__n">{wrong}</span>
            <span className="pstreak__l">Wrong</span>
          </div>
          <div className="pstreak pstreak--skipped">
            <span className="pstreak__n">{skipped}</span>
            <span className="pstreak__l">Skipped</span>
          </div>
        </div>

        <QuestionCard
          question={currentQ}
          chosen={chosen}
          confirmed={confirmed}
          onChoose={setChosen}
          showExplanation={true}
        />

        <div className="practice-page__actions">
          {!confirmed ? (
            <>
              <button className="practice-page__btn practice-page__btn--skip" onClick={handleSkip}>Skip</button>
              <button
                className="practice-page__btn practice-page__btn--confirm"
                disabled={!chosen}
                onClick={handleConfirm}
              >
                Check Answer
              </button>
            </>
          ) : (
            <button className="practice-page__btn practice-page__btn--next" onClick={handleNext}>
              {index + 1 >= session.length ? 'Finish' : 'Next Question →'}
            </button>
          )}
        </div>

        <p className="practice-page__hint">A B C D · Enter · → Arrow</p>
      </div>
    </div>
  );
}