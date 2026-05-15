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
    subtitle: 'Adjustable timer per question',
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

          {/* Twinkling background stars */}
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={`star-${i}`}
              className="home__star"
              style={{
                left: `${(i * 97 + 11) % 100}%`,
                top:  `${(i * 61 + 7)  % 65}%`,
                '--sd': `${((i * 0.8) % 3).toFixed(1)}s`,
                '--ss': `${0.8 + (i % 4) * 0.15}`,
              }}
            />
          ))}

          {/* Falling snow — mix of flake and sparkle characters */}
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className="home__snowflake" style={{ '--i': i }}>
              {i % 7 === 0 ? '✦' : i % 11 === 0 ? '·' : '❄'}
            </span>
          ))}

          {/* Mountain + pine tree silhouette */}
          <svg className="home__mountains" viewBox="0 0 1440 220" preserveAspectRatio="none">
            {/* Back mountain range */}
            <polygon points="0,220 180,75 360,220"    fill="#07101f" />
            <polygon points="220,220 500,10 780,220"  fill="#081221" />
            <polygon points="560,220 840,45 1120,220" fill="#07101f" />
            <polygon points="850,220 1110,25 1370,220" fill="#081221" />
            <polygon points="1100,220 1290,80 1440,220" fill="#07101f" />

            {/* Snow caps */}
            <polygon points="430,55 500,10 570,55"   fill="rgba(255,255,255,0.06)" />
            <polygon points="770,40 840,0  910,40"   fill="rgba(255,255,255,0.06)" />
            <polygon points="1040,70 1110,25 1180,70" fill="rgba(255,255,255,0.06)" />

            {/* Pine tree layer */}
            {[40,90,140,200,280,360,440,530,650,760,870,960,1060,1150,1240,1340,1400].map((x, i) => {
              const h  = 28 + (i % 3) * 10;
              const hw = 9  + (i % 3) * 3;
              return (
                <g key={i} fill="#050d1a">
                  <polygon points={`${x-hw},220 ${x},${220-h} ${x+hw},220`} />
                  <polygon points={`${x-hw*0.7},${220-h*0.55} ${x},${220-h*1.25} ${x+hw*0.7},${220-h*0.55}`} />
                </g>
              );
            })}
          </svg>

        </div>
        <div className="home__hero-content">
          <h1 className="home__title">OEC Study Guide</h1>
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