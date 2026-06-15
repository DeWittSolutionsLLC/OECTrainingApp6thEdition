import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitFeedback, getUserFeedback } from '../firebase/firebase';
import '../styles/feedback.css';

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
];

export default function FeedbackPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth'); return; }

    (async () => {
      setLoadingFeedbacks(true);
      try {
        const list = await getUserFeedback(user.uid, 200);
        setFeedbacks(list);
      } catch (e) {
        console.warn('Failed to load feedbacks', e);
      } finally {
        setLoadingFeedbacks(false);
      }
    })();
  }, [user, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await submitFeedback(user.uid, { category, message: message.trim(), anonymous });
      setMessage('');
      setAnonymous(false);
      setToast('Feedback sent — thanks!');
      setTimeout(() => setToast(''), 3500);
      // reload list
      const list = await getUserFeedback(user.uid, 200);
      setFeedbacks(list);
    } catch (err) {
      console.error('Submit failed', err);
      alert('Failed to submit feedback — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="feedback-loading">Loading…</div>;

  return (
    <div className="feedback-page">
      <div className="feedback-inner">
        {toast && <div className="f-toast" role="status">{toast}</div>}
        <h1 className="feedback-title">Send Feedback</h1>
        <p className="feedback-sub">We appreciate your input. Choose a category and write your message below.</p>

        <form className="feedback-form" onSubmit={handleSubmit}>
          <label className="f-label">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>

          <label className="f-label">
            Message
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Describe the issue or idea..." />
          </label>

          <label className="f-anon">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Submit anonymously
          </label>

          <div className="f-actions">
            <button type="submit" className="f-submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send Feedback'}</button>
            <button type="button" className="f-cancel" onClick={() => navigate('/profile')}>Cancel</button>
          </div>
        </form>

        <div className="feedback-past">
          <h2>Your Previous Feedback</h2>
          {loadingFeedbacks ? (
            <p>Loading…</p>
          ) : feedbacks.length === 0 ? (
            <p className="feedback-empty">No feedback submitted yet.</p>
          ) : (
            <div className="feedback-list">
              {feedbacks.map(f => (
                <div key={f.id} className="feedback-row">
                  <div className="feedback-row__meta">
                    <span className="feedback-row__cat">{(CATEGORIES.find(c => c.value === f.category)?.label) || f.category}</span>
                    <span className="feedback-row__date">{f.createdAt?.toDate ? new Date(f.createdAt.toDate()).toLocaleString() : '—'}</span>
                    <span className="feedback-row__anon">{f.anonymous ? 'Anonymous' : 'You'}</span>
                  </div>
                  <div className="feedback-row__msg">{f.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
