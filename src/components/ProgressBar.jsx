import '../styles/progressbar.css';

export default function ProgressBar({ current, total, correct, wrong }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="pbar">
      <div className="pbar__track">
        <div className="pbar__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pbar__info">
        <span className="pbar__pos">{current} / {total}</span>
        {correct !== undefined && (
          <div className="pbar__score">
            <span className="pbar__correct">{correct}✓</span>
            <span className="pbar__wrong">{wrong}✗</span>
          </div>
        )}
      </div>
    </div>
  );
}