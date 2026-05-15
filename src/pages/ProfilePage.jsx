import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserSessions, getUserWeaknessData, clearUserWeaknessData, logOut } from '../firebase/firebase';
import '../styles/profile.css';

const MODE_LABELS = { quiz: 'Quiz', practice: 'Practice', speed: 'Speed Round', weakness: 'Weakness Drill' };
const MODE_COLORS = { quiz: '#3b82f6', practice: '#22c55e', speed: '#ef4444', weakness: '#8b5cf6' };

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [weakness, setWeakness] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [clearConfirm, setClearConfirm] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth'); return; }

    (async () => {
      try {
        const [s, w] = await Promise.all([
          getUserSessions(user.uid, 500),
          getUserWeaknessData(user.uid),
        ]);
        setSessions(s);
        setWeakness(w);
      } catch (e) {
        console.warn('Failed to load profile data:', e);
      } finally {
        setLoadingSessions(false);
      }
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

  // Only block render during Firebase auth init (very brief, <300ms typically)
  if (loading) return <div className="profile-loading">Loading…</div>;

  // Use Auth user fields immediately — no Firestore wait needed for the header
  const displayName = profile?.displayName || user?.displayName || '';
  const email = profile?.email || user?.email || '';
  const photoURL = profile?.photoURL || user?.photoURL || null;

  // Derive stats from the sessions subcollection — authoritative even if user-doc
  // aggregates are stale/zero (they may not have been written in older app versions).
  const statSessions  = sessions.length;
  const statCorrect   = sessions.reduce((n, s) => n + (s.correct || 0), 0);
  const statWrong     = sessions.reduce((n, s) => n + (s.wrong   || 0), 0);
  const statTotal     = sessions.reduce((n, s) => n + (s.total   || 0), 0);
  const overallPct    = statTotal > 0 ? Math.round((statCorrect / statTotal) * 100) : 0;

  const byMode = {};
  sessions.forEach((s) => {
    if (!byMode[s.mode]) byMode[s.mode] = { sessions: 0, correct: 0, total: 0 };
    byMode[s.mode].sessions++;
    byMode[s.mode].correct += s.correct || 0;
    byMode[s.mode].total   += s.total   || 0;
  });

  return (
    <div className="profile-page">
      <div className="profile-inner">

        {/* Header renders immediately from Firebase Auth — no Firestore wait */}
        <div className="profile-header">
          <div className="profile-avatar">
            {photoURL
              ? <img src={photoURL} alt={displayName} className="profile-avatar__img" />
              : <span className="profile-avatar__initials">{(displayName || 'A')[0].toUpperCase()}</span>
            }
          </div>
          <div className="profile-identity">
            <h1 className="profile-name">{displayName}</h1>
            <p className="profile-email">{email}</p>
          </div>
          <button className="profile-signout" onClick={handleSignOut}>Sign Out</button>
        </div>

        {/* Stats — derived from sessions subcollection, skeleton while loading */}
        {loadingSessions ? (
          <div className="profile-stats">
            {[0, 1, 2, 3].map(i => <div key={i} className="p-stat p-stat--skel" />)}
          </div>
        ) : (
          <div className="profile-stats">
            <div className="p-stat">
              <span className="p-stat__n">{statSessions}</span>
              <span className="p-stat__l">Sessions</span>
            </div>
            <div className="p-stat">
              <span className="p-stat__n p-stat__n--correct">{statCorrect}</span>
              <span className="p-stat__l">Correct</span>
            </div>
            <div className="p-stat">
              <span className="p-stat__n p-stat__n--wrong">{statWrong}</span>
              <span className="p-stat__l">Wrong</span>
            </div>
            <div className="p-stat">
              <span className="p-stat__n p-stat__n--pct">{overallPct}%</span>
              <span className="p-stat__l">Overall</span>
            </div>
          </div>
        )}

        {/* Mode breakdown — only shown once sessions are loaded */}
        {!loadingSessions && Object.keys(byMode).length > 0 && (
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
            <h2 className="profile-section__title">
              🔥 Weak Questions ({loadingSessions ? '…' : weakness.length})
            </h2>
            {weakness.length > 0 && (
              <button
                className={`profile-clear ${clearConfirm ? 'profile-clear--confirm' : ''}`}
                onClick={handleClearWeakness}
              >
                {clearConfirm ? 'Sure? Click again' : 'Clear All'}
              </button>
            )}
          </div>

          {loadingSessions ? (
            <div className="profile-skel-list">
              {[0, 1, 2].map(i => <div key={i} className="p-skel-row" />)}
            </div>
          ) : weakness.length === 0 ? (
            <p className="profile-empty">No weak spots yet — keep practicing!</p>
          ) : (
            <div className="profile-weakness-list">
              {weakness.slice(0, 20).map((w, i) => {
                const total = w.correct + w.wrong;
                const errRate = Math.round((w.wrong / total) * 100);
                return (
                  <div key={i} className="p-weak">
                    <div className="p-weak__meta">
                      <span className="p-weak__sec">S{w.question.sectionId} {w.question.sectionName}</span>
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
            <div className="profile-skel-list">
              {[0, 1, 2, 3].map(i => <div key={i} className="p-skel-row p-skel-row--short" />)}
            </div>
          ) : sessions.length === 0 ? (
            <p className="profile-empty">No sessions yet. Go study!</p>
          ) : (
            <div className="profile-sessions">
              {sessions.slice(0, 15).map((s) => (
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
