import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getQuestionsBySection, getSectionColor, shuffle } from '../data/oecData';
import '../styles/flashcard.css';

export default function FlashcardMode() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [deck, setDeck] = useState([]);
  const [reviewDeck, setReviewDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [phase, setPhase] = useState('main'); // 'main' | 'review' | 'done'

  useEffect(() => {
    if (!state) { navigate('/setup/flashcards'); return; }
    let pool = getQuestionsBySection(state.selectedSections);
    if (state.order === 'random') pool = shuffle(pool);
    setDeck(pool);
  }, [state, navigate]);

  const currentDeck = phase === 'review' ? reviewDeck : deck;
  const currentQ = currentDeck[index];

  function handleFlip() { setFlipped(f => !f); }

  function handleKnown() {
    setKnown(k => k + 1);
    advance(reviewDeck.length);
  }

  function handleReview() {
    const nextReview = phase === 'main' ? [...reviewDeck, currentQ] : reviewDeck;
    if (phase === 'main') setReviewDeck(nextReview);
    advance(nextReview.length);
  }

  function advance(futureReviewLength) {
    setFlipped(false);
    if (index + 1 >= currentDeck.length) {
      if (phase === 'main' && futureReviewLength > 0) {
        setPhase('review');
        setIndex(0);
      } else {
        setPhase('done');
      }
    } else {
      setIndex(i => i + 1);
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === ' ' || e.key === 'Enter') handleFlip();
      if (e.key === 'ArrowRight' && flipped) handleKnown();
      if (e.key === 'ArrowLeft' && flipped) handleReview();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (phase === 'done') {
    const total = deck.length;
    const pct = total > 0 ? Math.round((known / total) * 100) : 0;
    return (
      <div className="fc-page">
        <div className="fc-done">
          <div className="fc-done__icon">🎉</div>
          <h2 className="fc-done__title">Deck Complete!</h2>
          <div className="fc-done__stats">
            <div className="fc-done__stat"><span style={{color:'#22c55e'}}>{known}</span><span>Known</span></div>
            <div className="fc-done__stat"><span style={{color:'#ef4444'}}>{total - known}</span><span>For Review</span></div>
            <div className="fc-done__stat"><span style={{color:'#3b82f6'}}>{pct}%</span><span>Mastery</span></div>
          </div>
          <div className="fc-done__actions">
            <button className="fc-btn fc-btn--secondary" onClick={() => navigate('/')}>Home</button>
            <button className="fc-btn fc-btn--primary" onClick={() => navigate('/setup/flashcards')}>New Deck</button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;
  const color = getSectionColor(currentQ.sectionId);
  const total = currentDeck.length;

  return (
    <div className="fc-page">
      <div className="fc-inner">
        <div className="fc-header">
          <button className="fc-exit" onClick={() => navigate('/')}>✕ Exit</button>
          <div className="fc-meta">
            {phase === 'review' && <span className="fc-review-badge">Review Round</span>}
            <span className="fc-pos">{index + 1} / {total}</span>
          </div>
          <div className="fc-counts">
            <span className="fc-known">{known} known</span>
            <span className="fc-sep">·</span>
            <span className="fc-review-count">{reviewDeck.length} to review</span>
          </div>
        </div>

        <div className="fc-progress">
          <div className="fc-progress__bar" style={{ width: `${((index) / total) * 100}%` }} />
        </div>

        <div className={`fc-card ${flipped ? 'fc-card--flipped' : ''}`} onClick={handleFlip}>
          <div className="fc-card__front">
            <span className="fc-card__pill" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
              §{currentQ.sectionId} — {currentQ.sectionName}
            </span>
            <p className="fc-card__question">{currentQ.text}</p>
            <span className="fc-card__hint">Tap or press Space to flip</span>
          </div>
          <div className="fc-card__back">
            <span className="fc-card__answer-label">Answer</span>
            <p className="fc-card__answer">
              <strong>{currentQ.answer})</strong> {currentQ.choices[currentQ.answer]}
            </p>
          </div>
        </div>

        {flipped && (
          <div className="fc-actions">
            <button className="fc-action fc-action--review" onClick={handleReview}>
              <span className="fc-action__icon">←</span>
              <span>Needs Review</span>
            </button>
            <button className="fc-action fc-action--known" onClick={handleKnown}>
              <span>Got It</span>
              <span className="fc-action__icon">→</span>
            </button>
          </div>
        )}

        <p className="fc-hint">Space/Enter = flip · ← Review · → Got it</p>
      </div>
    </div>
  );
}