import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logOut } from '../firebase/firebase';
import '../styles/navbar.css';

export default function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const isHome = pathname === '/';


  // Close menu when a link is clicked or route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className={`navbar ${isHome ? 'navbar--home' : ''}`}>
      <Link to="/" className="navbar__brand">
        <span className="navbar__flake" aria-hidden="true">🛟</span>
        <span className="navbar__title">Mt. Holly OEC Study Guide</span>
        <span className="navbar__edition">6th Ed.</span>
      </Link>

      {/* Hamburger Toggle */}
      <button 
        className={`navbar__toggle ${isOpen ? 'navbar__toggle--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <nav className={`navbar__links ${isOpen ? 'navbar__links--open' : ''}`}>
        <Link to="/" className={`navbar__link ${pathname === '/' ? 'navbar__link--active' : ''}`}>Home</Link>
        <Link to="/setup/quiz" className={`navbar__link ${pathname.includes('quiz') || pathname.includes('setup') ? 'navbar__link--active' : ''}`}>Quiz</Link>
        <Link to="/setup/practice" className={`navbar__link ${pathname.includes('practice') ? 'navbar__link--active' : ''}`}>Practice</Link>
        <Link to="/setup/flashcards" className={`navbar__link ${pathname.includes('flash') ? 'navbar__link--active' : ''}`}>Flashcards</Link>
        <Link to="/setup/speed" className={`navbar__link ${pathname.includes('speed') ? 'navbar__link--active' : ''}`}>Speed</Link>
        <Link to="/setup/weakness" className={`navbar__link ${pathname.includes('weakness') ? 'navbar__link--active' : ''}`}>Weakness</Link>
        <Link to="/leaderboard" className={`navbar__link ${pathname.includes('leaderboard') ? 'navbar__link--active' : ''}`}>Leaderboard</Link>

        {user ? (
          <>
            <Link to="/profile" className={`navbar__link ${pathname.includes('profile') ? 'navbar__link--active' : ''}`}>Profile</Link>
            <button
              type="button"
              className="navbar__link navbar__logout"
              onClick={async () => {
                try {
                  await logOut();
                } finally {
                  navigate('/');
                  setIsOpen(false);
                }
              }}
              disabled={authLoading}
            >
              {authLoading ? 'Logging out…' : 'Log out'}
            </button>
          </>
        ) : (
          <Link to="/auth" className={`navbar__link ${pathname.includes('auth') ? 'navbar__link--active' : ''}`}>Sign In</Link>
        )}
      </nav>
    </header>

  );
}
