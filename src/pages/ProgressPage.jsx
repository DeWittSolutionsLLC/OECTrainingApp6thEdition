import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllUserProgress, getUserSessions } from '../firebase/firebase';
import { getAllSections } from '../data/oecData';
import '../styles/progress.css';

const TOTAL_QUESTIONS = 822;
const TOTAL_CHAPTERS = 34;

export default function ProgressPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [allProgress, setAllProgress] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth'); return; }

    Promise.all([
      getAllUserProgress(user.uid),
      getUserSessions(user.uid, 500),
    ])
      .then(([progress, sess]) => {
        setAllProgress(progress);
        setSessions(sess);
      })
      .catch(e => console.warn('Failed to load progress data:', e))
      .finally(() => setDataLoading(false));
  }, [user, loading, navigate]);

  if (loading) return <div className="prog-loading">Loading…</div>;

  // Build lookup map: "sectionId_num" → progress entry
  const progressMap = {};
  allProgress.forEach(p => { progressMap[p.id] = p; });

  // Top-level stats
  const quizSessions = sessions.filter(s => s.mode === 'quiz').length;
  const studySessions = sessions.filter(s => s.mode !== 'quiz').length;

  const questionsSeen = allProgress.filter(p => (p.correct || 0) + (p.wrong || 0) > 0).length;

  const questionsMastered = allProgress.filter(p =>
    (p.correct || 0) >= 3 && (p.wrong || 0) === 0
  ).length;

  const sections = getAllSections();

  const chaptersMastered = sections.filter(section =>
    section.questions.every(q => {
      const p = progressMap[`${q.sectionId}_${q.num}`];
      return p && (p.correct || 0) >= 3 && (p.wrong || 0) === 0;
    })
  ).length;

  // Chapter-level stats
  const chapterStats = sections.map(section => {
    const seen = section.questions.filter(q => {
      const p = progressMap[`${q.sectionId}_${q.num}`];
      return p && (p.correct || 0) + (p.wrong || 0) > 0;
    }).length;

    const correct = section.questions.filter(q => {
      const p = progressMap[`${q.sectionId}_${q.num}`];
      return p && (p.correct || 0) > 0;
    }).length;

    const sectionSessions = sessions.filter(s =>
      Array.isArray(s.sectionIds) && s.sectionIds.includes(section.id)
    );
    const quizCount = sectionSessions.length;
    const avgScore = quizCount > 1
      ? Math.round(sectionSessions.reduce((sum, s) => sum + (s.scorePct || 0), 0) / quizCount)
      : quizCount === 1 ? sectionSessions[0].scorePct : null;
    const bestScore = quizCount > 0
      ? Math.max(...sectionSessions.map(s => s.scorePct || 0))
      : null;

    return { ...section, seen, correct, quizCount, avgScore, bestScore };
  });

  function StatBox({ label, value, sub, accent }) {
    return (
      <div className="prog-stat">
        <span className="prog-stat__label">{label}</span>
        {dataLoading ? (
          <div className="prog-stat__skel" />
        ) : (
          <>
            <span className="prog-stat__value" style={accent ? { color: accent } : {}}>{value}</span>
            {sub && <span className="prog-stat__sub">{sub}</span>}
          </>
        )}
      </div>
    );
  }

  function BarFill({ value, max, color }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
      <div className="prog-bar">
        <div className="prog-bar__fill" style={{ width: `${pct}%`, background: color || '#3b82f6' }} />
      </div>
    );
  }

  return (
    <div className="prog-page">
      <div className="prog-inner">
        <div className="prog-header">
          <h1 className="prog-title">Progress</h1>
          <button className="prog-back" onClick={() => navigate('/')}>← Home</button>
        </div>

        {/* 4 stat boxes */}
        <div className="prog-stats">
          <div className="prog-stat prog-stat--activity">
            <span className="prog-stat__label">Activity</span>
            {dataLoading ? <div className="prog-stat__skel" /> : (
              <>
                <span className="prog-stat__value">{sessions.length}</span>
                <div className="prog-stat__activity-sub">
                  <span className="prog-activity-pill prog-activity-pill--quiz">{quizSessions} quiz{quizSessions !== 1 ? 'zes' : ''}</span>
                  <span className="prog-activity-pill prog-activity-pill--study">{studySessions} study</span>
                </div>
              </>
            )}
          </div>

          <div className="prog-stat">
            <span className="prog-stat__label">Questions Seen</span>
            {dataLoading ? <div className="prog-stat__skel" /> : (
              <>
                <span className="prog-stat__value" style={{ color: '#3b82f6' }}>
                  {questionsSeen}<span className="prog-stat__denom">/{TOTAL_QUESTIONS}</span>
                </span>
                <BarFill value={questionsSeen} max={TOTAL_QUESTIONS} color="#3b82f6" />
              </>
            )}
          </div>

          <div className="prog-stat">
            <span className="prog-stat__label">Questions Mastered</span>
            {dataLoading ? <div className="prog-stat__skel" /> : (
              <>
                <span className="prog-stat__value" style={{ color: '#22c55e' }}>
                  {questionsMastered}<span className="prog-stat__denom">/{TOTAL_QUESTIONS}</span>
                </span>
                <BarFill value={questionsMastered} max={TOTAL_QUESTIONS} color="#22c55e" />
              </>
            )}
          </div>

          <div className="prog-stat">
            <span className="prog-stat__label">Chapters Mastered</span>
            {dataLoading ? <div className="prog-stat__skel" /> : (
              <>
                <span className="prog-stat__value" style={{ color: '#f59e0b' }}>
                  {chaptersMastered}<span className="prog-stat__denom">/{TOTAL_CHAPTERS}</span>
                </span>
                <BarFill value={chaptersMastered} max={TOTAL_CHAPTERS} color="#f59e0b" />
              </>
            )}
          </div>
        </div>

        {/* Chapter performance grid */}
        <div className="prog-section">
          <h2 className="prog-section__title">Chapter Performance</h2>
          <p className="prog-section__hint">
            Mastered = answered correctly 3+ times with no wrong answers
          </p>

          {dataLoading ? (
            <div className="prog-chapter-skel">
              {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="prog-chapter-skel__row" />)}
            </div>
          ) : (
            <div className="prog-chapter-grid">
              <div className="prog-chapter-header">
                <span className="prog-col prog-col--name">Chapter</span>
                <span className="prog-col prog-col--stat">Seen</span>
                <span className="prog-col prog-col--stat">Correct</span>
                <span className="prog-col prog-col--quiz">Quizzes</span>
              </div>
              {chapterStats.map(ch => {
                const seenPct = ch.questionCount > 0 ? Math.round((ch.seen / ch.questionCount) * 100) : 0;
                const correctPct = ch.questionCount > 0 ? Math.round((ch.correct / ch.questionCount) * 100) : 0;
                const hasActivity = ch.seen > 0 || ch.quizCount > 0;
                return (
                  <div key={ch.id} className={`prog-chapter-row ${hasActivity ? 'prog-chapter-row--active' : ''}`}>
                    <div className="prog-col prog-col--name">
                      <span className="prog-ch-num">S{ch.id}</span>
                      <span className="prog-ch-name">{ch.name}</span>
                    </div>

                    <div className="prog-col prog-col--stat">
                      <span className="prog-stat-frac">{ch.seen}/{ch.questionCount}</span>
                      <div className="prog-mini-bar">
                        <div className="prog-mini-bar__fill" style={{ width: `${seenPct}%`, background: '#3b82f6' }} />
                      </div>
                    </div>

                    <div className="prog-col prog-col--stat">
                      <span className="prog-stat-frac">{ch.correct}/{ch.questionCount}</span>
                      <div className="prog-mini-bar">
                        <div className="prog-mini-bar__fill" style={{ width: `${correctPct}%`, background: '#22c55e' }} />
                      </div>
                    </div>

                    <div className="prog-col prog-col--quiz">
                      {ch.quizCount === 0 ? (
                        <span className="prog-quiz-none">—</span>
                      ) : (
                        <div className="prog-quiz-info">
                          <span className="prog-quiz-count">{ch.quizCount} quiz{ch.quizCount !== 1 ? 'zes' : ''}</span>
                          {ch.quizCount > 1 ? (
                            <span className="prog-quiz-scores">
                              Avg {ch.avgScore}% · Best {ch.bestScore}%
                            </span>
                          ) : (
                            <span className="prog-quiz-scores">{ch.bestScore}%</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
