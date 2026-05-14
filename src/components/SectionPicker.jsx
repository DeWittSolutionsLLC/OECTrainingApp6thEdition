import OEC_DATA, { getSectionColor } from '../data/oecData';
import '../styles/sectionpicker.css';

export default function SectionPicker({ selected, onChange }) {
  // null means "all selected", [] means "none selected"
  const allSelected = selected === null;

  function toggle(id) {
    if (allSelected) {
      // Deselect this one (keep all others)
      onChange(OEC_DATA.map(s => s.id).filter(x => x !== id));
    } else {
      const next = selected.includes(id)
        ? selected.filter(x => x !== id)
        : [...selected, id];
      // If all are now selected, collapse back to null
      onChange(next.length === OEC_DATA.length ? null : next);
    }
  }

  const totalQ = allSelected
    ? 822
    : OEC_DATA.filter(s => selected.includes(s.id)).reduce((n, s) => n + s.questionCount, 0);

  return (
    <div className="sp">
      <div className="sp__header">
        <span className="sp__label">Sections</span>
        <div className="sp__actions">
          <button className="sp__link" onClick={() => onChange(null)}>All</button>
          <span className="sp__dot">·</span>
          <button className="sp__link" onClick={() => onChange([])}>None</button>
        </div>
      </div>
      <div className="sp__grid">
        {OEC_DATA.map((sec) => {
          const on = allSelected || (selected && selected.includes(sec.id));
          const color = getSectionColor(sec.id);
          return (
            <button
              key={sec.id}
              className={`sp__chip ${on ? 'sp__chip--on' : 'sp__chip--off'}`}
              style={{ '--chip-color': color }}
              onClick={() => toggle(sec.id)}
            >
              <span className="sp__chip-num">{sec.id}</span>
              <span className="sp__chip-name">{sec.name}</span>
              <span className="sp__chip-count">{sec.questionCount}</span>
            </button>
          );
        })}
      </div>
      <p className="sp__total">{totalQ} question{totalQ !== 1 ? 's' : ''} selected</p>
    </div>
  );
}