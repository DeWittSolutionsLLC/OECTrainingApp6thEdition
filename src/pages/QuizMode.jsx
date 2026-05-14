import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import ProgressBar from '../components/ProgressBar';
import { getQuestionsBySection, shuffle } from '../data/oecData';
import { recordAnswerForUser } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import '../styles/quiz.css';

function recordLocalWeakness(question, isCorrect) {
  const stored = JSON.parse(localStorage.getItem('oec_weakness_data') || '{}');
  const key = `${question.sectionId}_${question.num}`;
  if (!stored[key]) stored[key] = { correct: 0, wrong: 0, question };
  if (isCorrect) stored[key].correct++;
  else stored[key].wrong++;
  stored[key].question = question;
  localStorage.setItem('oec_weakness_data', JSON.stringify(stored));
}

export default function QuizMode() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    if (!state) { navigate('/setup/quiz'); return; }
    let pool = getQuestionsBySection(state.selectedSections);
    if (state.order === 'random') pool = shuffle(pool);
    const limit = state.count && state.count < pool.length ? state.count : pool.length;
    setSession(pool.slice(0, limit));
  }, [state, navigate]);

  useEffect(() => {
    function onKey(e) {
      const map = { a: 'A', b: 'B', c: 'C', d: 'D' };
      const letter = map[e.key.toLowerCase()];
      if (letter && !confirmed) { setChosen(letter); return; }
      if (e.key === 'Enter') {
        if (!confirmed && chosen) handleConfirm();
        else if (confirmed) handleNext();
      }
      if ((e.key === 'ArrowRight' || e.key === ' ') && confirmed) handleNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const currentQ = session[index];
  const correct = answers.filter(a => a.isCorrect).length;
  const wrong = answers.filter(a => !a.isCorrect).length;

  function handleConfirm() {
    if (!chosen || confirmed) return;
    const isCorrect = chosen === currentQ.answer;
    setConfirmed(true);

    // Always write to localStorage (powers guest weakness drill)
    recordLocalWeakness(currentQ, isCorrect);
    // Also write to Firestore if logged in
    if (user) {
      recordAnswerForUser(user.uid, currentQ, isCorrect).catch(console.warn);
    }

    setAnswers(prev => [...prev, { question: currentQ, chosen, isCorrect }]);
  }

  function handleNext() {
    if (index + 1 >= session.length) {
      navigate('/results', { state: { answers: [...answers], mode: 'quiz' } });
    } else {
      setIndex(i => i + 1);
      setChosen(null);
      setConfirmed(false);
    }
  }

  return (
    <div className="quiz-page">
      <div className="quiz-page__inner">
        <div className="quiz-page__header">
          <button className="quiz-page__exit" onClick={() => navigate('/')}>✕ Exit</button>
          <ProgressBar current={index} total={session.length} correct={correct} wrong={wrong} />
        </div>

        {currentQ && (
          <>
            <QuestionCard
              question={currentQ}
              chosen={chosen}
              confirmed={confirmed}
              onChoose={setChosen}
              showExplanation={false}
            />
            <div className="quiz-page__actions">
              {!confirmed ? (
                <button
                  className="quiz-page__btn quiz-page__btn--confirm"
                  disabled={!chosen}
                  onClick={handleConfirm}
                >
                  Confirm Answer
                </button>
              ) : (
                <button className="quiz-page__btn quiz-page__btn--next" onClick={handleNext}>
                  {index + 1 >= session.length ? 'See Results' : 'Next →'}
                </button>
              )}
            </div>
            <p className="quiz-page__hint">Keyboard: A B C D · Enter to confirm · → for next</p>
          </>
        )}
      </div>
    </div>
  );
}