import { useEffect, useMemo, useState } from 'react';
import { fetchTopLeaderboardEntries } from '../firebase/firebase';
import '../styles/leaderboard.css';

const MODES = [
  { id: 'all', label: 'All Modes' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'practice', label: 'Practice' },
  { id: 'speed', label: 'Speed Round' },
  { id: 'weakness', label: 'Weakness Drill' },
];

const modeLabel = (m) => {
  const found = MODES.find((x) => x.id === m);
  return found ? found.label : m;
};

export default function Leaderboard() {
  const [mode, setMode] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const topLimit = 25;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTopLeaderboardEntries({ mode, limit: topLimit });
      setRows(data);
    } catch (e) {
      setError(e?.message || 'Failed to load leaderboard');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [mode]);


  const best = useMemo(() => {
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => (b.scorePct ?? 0) - (a.scorePct ?? 0));
    return sorted[0] || null;
  }, [rows]);

  return (
    <div className="lb-page">
      <div className="lb-inner">
        <div className="lb-header">
          <h1 className="lb-title">Leaderboard</h1>
          <div className="lb-subtitle">Top scores saved to Firestore</div>
        </div>

        <div className="lb-controls">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`lb-chip ${mode === m.id ? 'lb-chip--active' : ''}`}
              onClick={() => setMode(m.id)}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>

        {best && (
          <div className="lb-best">
            <div className="lb-best__label">Current Top Score</div>
            <div className="lb-best__value">
              {best.name} · {best.scorePct}%
            </div>
          </div>
        )}

        {loading && <div className="lb-status">Loading…</div>}
        {!loading && error && <div className="lb-error">{error}</div>}

        {!loading && !error && (
          <div className="lb-table" role="table" aria-label="Leaderboard table">
            <div className="lb-thead" role="rowgroup">
              <div className="lb-tr lb-tr--head" role="row">
                <div className="lb-th" role="columnheader">
                  Rank
                </div>
                <div className="lb-th" role="columnheader">
                  Name
                </div>
                <div className="lb-th" role="columnheader">
                  Mode
                </div>
                <div className="lb-th" role="columnheader">
                  Score
                </div>
                <div className="lb-th" role="columnheader">
                  Correct / Wrong
                </div>
              </div>
            </div>

            <div className="lb-tbody" role="rowgroup">
              {rows.length === 0 ? (
                <div className="lb-empty">No entries yet.</div>
              ) : (
                rows.map((r, idx) => (
                  <div key={r.id} className="lb-tr" role="row">
                    <div className="lb-td lb-td--rank" role="cell">
                      #{idx + 1}
                    </div>
                    <div className="lb-td" role="cell">
                      {r.name}
                    </div>
                    <div className="lb-td" role="cell">
                      {modeLabel(r.mode)}
                    </div>
                    <div className="lb-td" role="cell">
                      <span className="lb-score">{r.scorePct}%</span>
                    </div>
                    <div className="lb-td" role="cell">
                      {r.correct} / {r.wrong}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

