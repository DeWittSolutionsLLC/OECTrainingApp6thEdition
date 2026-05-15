import { getSectionColor } from '../data/oecData';
import '../styles/questioncard.css';

export default function QuestionCard({
  question,
  chosen,
  confirmed,
  onChoose,
  showExplanation = true,
}) {
  if (!question) return null;
  const color = getSectionColor(question.sectionId);

  return (
    <div className="qc">
      <div className="qc__meta">
        <span className="qc__pill" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
          S{question.sectionId} — {question.sectionName}
        </span>
        <span className="qc__num">Q{question.num}</span>
      </div>

      <p className="qc__text">{question.text}</p>

      <div className="qc__choices">
        {['A', 'B', 'C', 'D'].map(letter => {
          let mod = '';
          if (confirmed) {
            if (letter === question.answer) mod = ' qc__choice--correct';
            else if (letter === chosen) mod = ' qc__choice--wrong';
            else mod = ' qc__choice--dim';
          } else if (chosen === letter) {
            mod = ' qc__choice--selected';
          }

          return (
            <button
              key={letter}
              className={`qc__choice${mod}`}
              onClick={() => !confirmed && onChoose(letter)}
              disabled={confirmed}
            >
              <span className="qc__letter">{letter}</span>
              <span className="qc__answer-text">{question.choices[letter]}</span>
            </button>
          );
        })}
      </div>

      {showExplanation && confirmed && chosen !== question.answer && (
        <div className="qc__explanation">
          <span className="qc__exp-icon">💡</span>
          <span>
            Correct answer: <strong>{question.answer}) {question.choices[question.answer]}</strong>
          </span>
        </div>
      )}
    </div>
  );
}