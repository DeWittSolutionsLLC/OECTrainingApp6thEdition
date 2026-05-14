import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SectionPicker from '../components/SectionPicker';
import { getWeaknessData } from '../hooks/useSession';
import '../styles/setup.css';

const MODE_META = {
  quiz: {
    icon: '📋',
    title: 'Quiz Mode',
    color: '#3b82f6',
    showOrder: true,
    showCount: true,
    desc: 'Answer all selected questions. Your score is revealed at the end with a full review.',
  },
  practice: {
    icon: '🎯',
    title: 'Practice Mode',
    color: '#22c55e',
    showOrder: true,
    showCount: false,
    desc: 'Immediate feedback after each answer. Great for learning new material.',
  },
  flashcards: {
    icon: '🃏',
    title: 'Flashcard Mode',
    color: '#f59e0b',
    showOrder: true,
    showCount: false,
    desc: 'Flip cards to reveal answers. Mark each as Known or Review.',
  },
  speed: {
    icon: '⚡',
    title: 'Speed Round',
    color: '#ef4444',
    showOrder: true,
    showCount: true,
    desc: 'You have 10 seconds per question. Unanswered = wrong.',
  },
  weakness: {
    icon: '🔥',
    title: 'Weakness Drill',
    color: '#8b5cf6',
    showOrder: false,
    showCount: false,
    desc: 'Drills on questions you\'ve gotten wrong before. No section picker needed.',
  },
};

export default function QuizSetup() {
  const { mode } = useParams();
  const navigate = useNavigate();
  const meta = MODE_META[mode] || MODE_META.quiz;

  const [selectedSections, setSelectedSections] = useState([]);
  const [order, setOrder] = useState('random');
  const [count, setCount] = useState(20);

  const weakData = getWeaknessData();
  const isWeakness = mode === 'weakness';

  function handleStart() {
    const state = { selectedSections, order, count: parseInt(count, 10) };
    navigate(`/${mode}`, { state });
  }

  if (isWeakness && weakData.length === 0) {
    return (
      <div className="setup">
        <div className="setup__card">
          <div className="setup__header" style={{ '--mode-color': meta.color }}>
            <span className="setup__icon">{meta.icon}</span>
            <h1 className="setup__title">{meta.title}</h1>
          </div>
          <div className="setup__empty">
            <p>No weakness data yet! Complete some quizzes or practice sessions first, and questions you get wrong will appear here.</p>
            <button className="setup__btn" onClick={() => navigate('/setup/practice')}>Start Practicing</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup">
      <div className="setup__card">
        <div className="setup__header" style={{ '--mode-color': meta.color }}>
          <span className="setup__icon">{meta.icon}</span>
          <div>
            <h1 className="setup__title">{meta.title}</h1>
            <p className="setup__desc">{meta.desc}</p>
          </div>
        </div>

        {isWeakness && (
          <div className="setup__weakness-info">
            <span className="setup__weakness-count">{weakData.length}</span>
            <span> questions flagged for review</span>
          </div>
        )}

        {!isWeakness && (
          <>
            {meta.showOrder && (
              <div className="setup__field">
                <label className="setup__label">Question Order</label>
                <div className="setup__seg">
                  <button className={`setup__seg-btn ${order === 'random' ? 'setup__seg-btn--active' : ''}`} onClick={() => setOrder('random')}>Random</button>
                  <button className={`setup__seg-btn ${order === 'sequential' ? 'setup__seg-btn--active' : ''}`} onClick={() => setOrder('sequential')}>Sequential</button>
                </div>
              </div>
            )}

            {meta.showCount && (
              <div className="setup__field">
                <label className="setup__label">Number of Questions</label>
                <div className="setup__seg">
                  {[10, 20, 30, 50].map(n => (
                    <button key={n} className={`setup__seg-btn ${count === n ? 'setup__seg-btn--active' : ''}`} onClick={() => setCount(n)}>{n}</button>
                  ))}
                  <button className={`setup__seg-btn ${count === 9999 ? 'setup__seg-btn--active' : ''}`} onClick={() => setCount(9999)}>All</button>
                </div>
              </div>
            )}

            <div className="setup__field">
              <SectionPicker selected={selectedSections} onChange={setSelectedSections} />
            </div>
          </>
        )}

        <button className="setup__btn" style={{ background: meta.color }} onClick={handleStart}>
          Begin {meta.title} →
        </button>
      </div>
    </div>
  );
}