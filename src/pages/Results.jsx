// pages/Results.jsx  (updated — replaces your existing Results.jsx)
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSectionColor } from '../data/oecData';
import { saveSession } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import '../styles/results.css';

const DEFAULT_DISPLAY_NAME = 'Anonymous';

function getDisplayName(profile, user) {
  return profile?.displayName || user?.displayName || localStorage.getItem('oec_display_name') || DEFAULT_DISPLAY_NAME;
}

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [filter, setFilter] = useState('all');

  if (!state) { navigate('/'); return null; }

  const { answers = [], mode, summary } = state;
  const correct = summary?.correct ?? answers.filter((a) => a.isCorrect).length;
  const wrong   = summary?.wrong   ?? answers.filter((a) => !a.isCorrect).length;
  const total   = summary?.total   ?? answers.length;
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;
  const grade   = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
  const gradeColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';

  const submittedRef = useRef(false);

  useEffect(() => {
    if (!mode || submittedRef.current) return;
    submittedRef.current = true;

    const name = getDisplayName(profile, user);

    if (!user) return;
    (async () => {
      try {
        await saveSession(user.uid, { mode, correct, wrong, total, scorePct: pct });
        await refreshProfile();
      } catch (e) {
        console.warn('Session save failed:', e);
      }
    })();
  }, [mode, pct, correct, wrong, total, user, profile]);

  const modeLabels = { quiz: 'Quiz', practice: 'Practice', speed: 'Speed Round', weakness: 'Weakness Drill' };
  const modeLabel  = modeLabels[mode] || 'Study';

  const filtered =
    filter === 'wrong'   ? answers.filter((a) => !a.isCorrect) :
    filter === 'correct' ? answers.filter((a) =>  a.isCorrect) :
    answers;

  const bySec = {};
  answers.filter((a) => !a.isCorrect).forEach((a) => {
    const s = a.question.sectionName;
    bySec[s] = (bySec[s] || 0) + 1;
  });
  const weakSections = Object.entries(bySec).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="results-page">
      <div className="results-inner">
        {/* Score Hero */}
        <div className="results-hero">
          <div className="results-hero__bg" aria-hidden />
          <p className="results-hero__mode">{modeLabel} Complete</p>
          {pct > 0 && (
            <div className="results-grade" style={{ borderColor: gradeColor, color: gradeColor }}>
              {grade}
            </div>
          )}
          <div className="results-stats">
            <div className="results-stat">
              <span className="results-stat__n results-stat__n--correct">{correct}</span>
              <span className="results-stat__l">Correct</span>
            </div>
            <div className="results-stat">
              <span className="results-stat__n results-stat__n--wrong">{wrong}</span>
              <span className="results-stat__l">Wrong</span>
            </div>
            <div className="results-stat">
              <span className="results-stat__n" style={{ color: gradeColor }}>{pct}%</span>
              <span className="results-stat__l">Score</span>
            </div>
            {summary?.skipped > 0 && (
              <div className="results-stat">
                <span className="results-stat__n results-stat__n--skip">{summary.skipped}</span>
                <span className="results-stat__l">Skipped</span>
              </div>
            )}
          </div>

          {user && (
            <p className="results-saved-note">✓ Session saved to your profile</p>
          )}

          {weakSections.length > 0 && (
            <div className="results-weak-sections">
              <p className="results-weak-sections__label">Most missed sections:</p>
              <div className="results-weak-sections__list">
                {weakSections.map(([name, count]) => (
                  <span key={name} className="results-weak-tag">{name} ({count})</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button className="results-btn results-btn--home" onClick={() => navigate('/')}>Home</button>
          {user && (
            <button className="results-btn results-btn--profile" onClick={() => navigate('/profile')}>My Profile</button>
          )}
          {mode && <button className="results-btn results-btn--retry" onClick={() => navigate(`/setup/${mode}`)}>Try Again</button>}
          {wrong > 0 && <button className="results-btn results-btn--drill" onClick={() => navigate('/weakness')}>Drill Weak Spots</button>}
        </div>

        {/* Review List */}
        {answers.length > 0 && (
          <div className="results-review">
            <div className="results-review__controls">
              <h2 className="results-review__title">Question Review</h2>
              <div className="results-filter">
                <button className={`rf-btn ${filter === 'all'     ? 'rf-btn--active' : ''}`} onClick={() => setFilter('all')}>All ({answers.length})</button>
                <button className={`rf-btn ${filter === 'correct' ? 'rf-btn--active' : ''}`} onClick={() => setFilter('correct')}>Correct ({correct})</button>
                <button className={`rf-btn ${filter === 'wrong'   ? 'rf-btn--active' : ''}`} onClick={() => setFilter('wrong')}>Wrong ({wrong})</button>
              </div>
            </div>

            <div className="results-review__list">
              {filtered.map((a, i) => {
                const color = getSectionColor(a.question.sectionId);
                return (
                  <div key={i} className={`rr-item ${a.isCorrect ? 'rr-item--correct' : 'rr-item--wrong'}`}>
                    <div className="rr-item__meta">
                      <span className="rr-item__sec" style={{ color }}>S{a.question.sectionId} {a.question.sectionName}</span>
                      <span className={`rr-item__badge ${a.isCorrect ? 'rr-item__badge--ok' : 'rr-item__badge--err'}`}>
                        {a.isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                    <p className="rr-item__q">{a.question.text}</p>
                    <div className="rr-item__opts">
                      {['A','B','C','D'].map((l) => (
                        <div key={l} className={`rr-opt ${l === a.question.answer ? 'rr-opt--correct' : l === a.chosen && !a.isCorrect ? 'rr-opt--chosen' : ''}`}>
                          <span className="rr-opt__ltr">{l}</span>
                          <span className="rr-opt__txt">{a.question.choices[l]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}