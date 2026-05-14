// pages/AuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../firebase/firebase';
import '../styles/auth.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signup') {
        if (!displayName.trim()) { setError('Display name is required'); setLoading(false); return; }
        await signUpWithEmail(email, password, displayName.trim());
      } else {
        await signInWithEmail(email, password);
      }
      navigate('/');
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  }

  function friendlyError(code) {
    const map = {
      'auth/email-already-in-use': 'That email is already registered. Sign in instead.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/user-not-found': 'No account found with that email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Invalid email or password.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="auth-snowflake" style={{ '--i': i }}>❄</span>
        ))}
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo__icon">⛷️</span>
          <span className="auth-logo__text">OEC Study</span>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'signin' ? 'auth-tab--active' : ''}`}
            onClick={() => { setTab('signin'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${tab === 'signup' ? 'auth-tab--active' : ''}`}
            onClick={() => { setTab('signup'); setError(''); }}
          >
            Create Account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="auth-field">
              <label className="auth-label">Display Name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Your name on the leaderboard"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-btn auth-btn--primary" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : tab === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button className="auth-btn auth-btn--google" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"/>
          </svg>
          Continue with Google
        </button>

        <button
          className="auth-skip"
          onClick={() => navigate('/')}
          disabled={loading}
        >
          Continue as guest →
        </button>
      </div>
    </div>
  );
}