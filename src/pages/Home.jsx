// pages/Home.jsx  (updated — replaces your existing Home.jsx)
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWeaknessDataSync } from '../hooks/useSession';
import '../styles/home.css';

const MODES = [
  {
    id: 'quiz',
    icon: '📋',
    title: 'Quiz Mode',
    subtitle: 'Test with score tracking',
    desc: 'Answer questions one at a time. Choose your sections, get graded at the end. See what you got wrong.',
    color: '#3b82f6',
    path: '/setup/quiz',
  },
  {
    id: 'practice',
    icon: '🎯',
    title: 'Practice Mode',
    subtitle: 'Learn as you go, no pressure',
    desc: 'Instant answer feedback after each question. Skip questions, review explanations freely.',
    color: '#22c55e',
    path: '/setup/practice',
  },
  {
    id: 'flashcards',
    icon: '🃏',
    title: 'Flashcard Mode',
    subtitle: 'Flip cards to test recall',
    desc: 'See the question, mentally answer, flip to reveal. Mark as known or needs review.',
    color: '#f59e0b',
    path: '/setup/flashcards',
  },
  {
    id: 'speed',
    icon: '⚡',
    title: 'Speed Round',
    subtitle: '10 seconds per question',
    desc: 'Race against the clock. Answer before time runs out or the question is marked wrong.',
    color: '#ef4444',
    path: '/setup/speed',
  },
  {
    id: 'weakness',
    icon: '🔥',
    title: 'Weakness Drill',
    subtitle: 'Target your problem areas',
    desc: "Focuses on questions you've historically gotten wrong. Drill until you master them.",
    color: '#8b5cf6',
    path: '/setup/weakness',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // For guests, use sync localStorage check. For users, weakness badge shows from profile.
  const weakCount = user
    ? (profile?.totalWrong ?? 0) // rough proxy; accurate count loaded per-mode
    : getWeaknessDataSync().length;

  return (
    <div className="home">
      

      <div className="home__hero">
        <div className="home__hero-bg" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="home__snowflake" style={{ '--i': i }}>❄</span>
          ))}
        </div>
        <div className="home__hero-content">
          <h1 className="home__title">OEC Study</h1>
          <p className="home__edition">National Ski Patrol · 6th Edition Test Bank</p>
          <div className="home__stats">
            <div className="home__stat">
              <span className="home__stat-n">822</span>
              <span className="home__stat-l">Questions</span>
            </div>
            <div className="home__stat-div" />
            <div className="home__stat">
              <span className="home__stat-n">34</span>
              <span className="home__stat-l">Sections</span>
            </div>
            <div className="home__stat-div" />
            <div className="home__stat">
              <span className="home__stat-n">5</span>
              <span className="home__stat-l">Study Modes</span>
            </div>
          </div>
          {user && profile && (
            <div className="home__user-stats">
              <span>📊 {profile.totalSessions} sessions · {profile.totalCorrect} correct · {
                profile.totalQuestions > 0
                  ? Math.round((profile.totalCorrect / profile.totalQuestions) * 100)
                  : 0
              }% overall</span>
            </div>
          )}
        </div>
      </div>

      <div className="home__modes">
        <h2 className="home__modes-title">Choose a Study Mode</h2>
        <div className="home__grid">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              className="mode-card"
              style={{ '--mode-color': mode.color }}
              onClick={() => navigate(mode.path)}
            >
              <div className="mode-card__top">
                <span className="mode-card__icon">{mode.icon}</span>
              </div>
              <h3 className="mode-card__title">{mode.title}</h3>
              <p className="mode-card__subtitle">{mode.subtitle}</p>
              <p className="mode-card__desc">{mode.desc}</p>
              <span className="mode-card__arrow">→</span>
            </button>
          ))}
        </div>
      </div>

      {!user && (
        <p className="home__guest-note">
          <span>Signed out — progress saved locally only.</span>
          <button onClick={() => navigate('/auth')} className="home__guest-link">Sign in to sync →</button>
        </p>
      )}
    </div>
  );
}