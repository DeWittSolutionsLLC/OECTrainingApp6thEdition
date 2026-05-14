// pages/ProfilePage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserSessions, getUserWeaknessData, clearUserWeaknessData } from '../firebase/firebase';
import { logOut } from '../firebase/firebase';
import '../styles/profile.css';

const MODE_LABELS = { quiz: 'Quiz', practice: 'Practice', speed: 'Speed Round', weakness: 'Weakness Drill' };
const MODE_COLORS = { quiz: '#3b82f6', practice: '#22c55e', speed: '#ef4444', weakness: '#8b5cf6' };

export default function ProfilePage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [weakness, setWeakness] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [clearConfirm, setClearConfirm] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth'); return; }

    (async () => {
      const [s, w] = await Promise.all([
        getUserSessions(user.uid, 15),
        getUserWeaknessData(user.uid),
      ]);
      setSessions(s);
      setWeakness(w);
      setLoadingSessions(false);
    })();
  }, [user, loading, navigate]);

  async function handleSignOut() {
    await logOut();
    navigate('/');
  }

  async function handleClearWeakness() {
    if (!clearConfirm) { setClearConfirm(true); return; }
    await clearUserWeaknessData(user.uid);
    setWeakness([]);
    setClearConfirm(false);
  }

  if (loading || !profile) {
    return <div className="profile-loading">Loading…</div>;
  }

  const overallPct = profile.totalQuestions > 0
    ? Math.round((profile.totalCorrect / profile.totalQuestions) * 100)
    : 0;

  // Per-mode breakdown from sessions
  const byMode = {};
  sessions.forEach((s) => {
    if (!byMode[s.mode]) byMode[s.mode] = { sessions: 0, correct: 0, total: 0 };
    byMode[s.mode].sessions++;
    byMode[s.mode].correct += s.correct;
    byMode[s.mode].total += s.total;
  });

  return (
    <div className="profile-page">
      <div className="profile-inner">

        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.photoURL
              ? <img src={profile.photoURL} alt={profile.displayName} className="profile-avatar__img" />
              : <span className="profile-avatar__initials">{(profile.displayName || 'A')[0].toUpperCase()}</span>
            }
          </div>
          <div className="profile-identity">
            <h1 className="profile-name">{profile.displayName}</h1>
            <p className="profile-email">{profile.email}</p>
          </div>
          <button className="profile-signout" onClick={handleSignOut}>Sign Out</button>
        </div>

        {/* Aggregate stats */}
        <div className="profile-stats">
          <div className="p-stat">
            <span className="p-stat__n">{profile.totalSessions}</span>
            <span className="p-stat__l">Sessions</span>
          </div>
          <div className="p-stat">
            <span className="p-stat__n p-stat__n--correct">{profile.totalCorrect}</span>
            <span className="p-stat__l">Correct</span>
          </div>
          <div className="p-stat">
            <span className="p-stat__n p-stat__n--wrong">{profile.totalWrong}</span>
            <span className="p-stat__l">Wrong</span>
          </div>
          <div className="p-stat">
            <span className="p-stat__n p-stat__n--pct">{overallPct}%</span>
            <span className="p-stat__l">Overall</span>
          </div>
        </div>

        {/* Mode breakdown */}
        {Object.keys(byMode).length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section__title">By Mode</h2>
            <div className="profile-modes">
              {Object.entries(byMode).map(([mode, data]) => {
                const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                return (
                  <div key={mode} className="p-mode" style={{ '--mode-color': MODE_COLORS[mode] || '#64748b' }}>
                    <div className="p-mode__label">{MODE_LABELS[mode] || mode}</div>
                    <div className="p-mode__pct">{pct}%</div>
                    <div className="p-mode__sub">{data.sessions} session{data.sessions !== 1 ? 's' : ''}</div>
                    <div className="p-mode__bar">
                      <div className="p-mode__fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weakness list */}
        <div className="profile-section">
          <div className="profile-section__head">
            <h2 className="profile-section__title">🔥 Weak Questions ({weakness.length})</h2>
            {weakness.length > 0 && (
              <button
                className={`profile-clear ${clearConfirm ? 'profile-clear--confirm' : ''}`}
                onClick={handleClearWeakness}
              >
                {clearConfirm ? 'Sure? Click again' : 'Clear All'}
              </button>
            )}
          </div>

          {weakness.length === 0 ? (
            <p className="profile-empty">No weak spots yet — keep practicing!</p>
          ) : (
            <div className="profile-weakness-list">
              {weakness.slice(0, 20).map((w, i) => {
                const total = w.correct + w.wrong;
                const errRate = Math.round((w.wrong / total) * 100);
                return (
                  <div key={i} className="p-weak">
                    <div className="p-weak__meta">
                      <span className="p-weak__sec">§{w.question.sectionId} {w.question.sectionName}</span>
                      <span className="p-weak__rate" style={{ color: errRate > 66 ? '#ef4444' : errRate > 33 ? '#f59e0b' : '#22c55e' }}>
                        {errRate}% error
                      </span>
                    </div>
                    <p className="p-weak__q">{w.question.text}</p>
                    <div className="p-weak__counts">
                      <span className="p-weak__correct">✓ {w.correct}</span>
                      <span className="p-weak__wrong">✗ {w.wrong}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div className="profile-section">
          <h2 className="profile-section__title">Recent Sessions</h2>
          {loadingSessions ? (
            <p className="profile-empty">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="profile-empty">No sessions yet. Go study!</p>
          ) : (
            <div className="profile-sessions">
              {sessions.map((s) => (
                <div key={s.id} className="p-session" style={{ '--mode-color': MODE_COLORS[s.mode] || '#64748b' }}>
                  <div className="p-session__mode">{MODE_LABELS[s.mode] || s.mode}</div>
                  <div className="p-session__score">{s.scorePct}%</div>
                  <div className="p-session__detail">{s.correct}/{s.total} correct</div>
                  <div className="p-session__date">
                    {s.createdAt?.toDate?.()
                      ? new Date(s.createdAt.toDate()).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button className="profile-btn" onClick={() => navigate('/')}>← Back to Home</button>
          {weakness.length > 0 && (
            <button className="profile-btn profile-btn--drill" onClick={() => navigate('/weakness')}>
              🔥 Drill Weak Spots
            </button>
          )}
        </div>
      </div>
    </div>
  );
}