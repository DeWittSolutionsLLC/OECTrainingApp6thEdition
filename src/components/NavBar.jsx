import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/navbar.css';

export default function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const isHome = pathname === '/';

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className={`navbar ${isHome ? 'navbar--home' : ''}`}>
      <Link to="/" className="navbar__brand">
        <svg className="navbar__flake" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="14" cy="14" r="14" fill="#e63946"/>
          <rect x="6" y="12" width="16" height="4" rx="1.5" fill="white"/>
          <rect x="12" y="6" width="4" height="16" rx="1.5" fill="white"/>
        </svg>
        <span className="navbar__title">Mt. Holly OEC</span>
        <span className="navbar__edition">6th Ed.</span>
      </Link>

      <div className="navbar__mobile-actions">
        {/* Toggle moved here for better mobile spacing */}
        <button 
          className={`navbar__toggle ${isOpen ? 'navbar__toggle--open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      <nav className={`navbar__links ${isOpen ? 'navbar__links--open' : ''}`}>
        <div className="navbar__nav-group">
          <Link to="/" onClick={() => setIsOpen(false)} className={`navbar__link ${pathname === '/' ? 'navbar__link--active' : ''}`}>Home</Link>
          <Link to="/setup/quiz" onClick={() => setIsOpen(false)} className={`navbar__link ${pathname.includes('quiz') || pathname.includes('setup') ? 'navbar__link--active' : ''}`}>Quiz</Link>
          <Link to="/setup/practice" onClick={() => setIsOpen(false)} className={`navbar__link ${pathname.includes('practice') ? 'navbar__link--active' : ''}`}>Practice</Link>
          <Link to="/setup/flashcards" onClick={() => setIsOpen(false)} className={`navbar__link ${pathname.includes('flash') ? 'navbar__link--active' : ''}`}>Flashcards</Link>
          <Link to="/setup/speed" onClick={() => setIsOpen(false)} className={`navbar__link ${pathname.includes('speed') ? 'navbar__link--active' : ''}`}>Speed</Link>
          <Link to="/setup/weakness" onClick={() => setIsOpen(false)} className={`navbar__link ${pathname.includes('weakness') ? 'navbar__link--active' : ''}`}>Weakness</Link>
          <Link to="/feedback" onClick={() => setIsOpen(false)} className={`navbar__link ${pathname === '/feedback' ? 'navbar__link--active' : ''}`}>Feedback</Link>
          {user && (
            <Link to="/progress" onClick={() => setIsOpen(false)} className={`navbar__link ${pathname === '/progress' ? 'navbar__link--active' : ''}`}>Progress</Link>
          )}
        </div>

        <div className="navbar__auth">
          {user ? (
            <button className="navbar__profile-btn" onClick={() => navigate('/profile')}>
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="" className="navbar__avatar" />
              ) : (
                <span className="navbar__avatar-initial">
                  {(profile?.displayName || user.email || 'A')[0].toUpperCase()}
                </span>
              )}
              <span className="navbar__profile-name">{profile?.displayName || 'Profile'}</span>
            </button>
          ) : (
            <button className="navbar__signin-btn" onClick={() => navigate('/auth')}>
              Sign In
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}