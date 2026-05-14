import { Link, useLocation } from 'react-router-dom';
import '../styles/navbar.css';

export default function NavBar() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <header className={`navbar ${isHome ? 'navbar--home' : ''}`}>
      <Link to="/" className="navbar__brand">
        <span className="navbar__flake">❄</span>
        <span className="navbar__title">OEC Study</span>
        <span className="navbar__edition">6th Ed.</span>
      </Link>
      <nav className="navbar__links">
        <Link to="/" className={`navbar__link ${pathname === '/' ? 'navbar__link--active' : ''}`}>Home</Link>
        <Link to="/setup/quiz" className={`navbar__link ${pathname.includes('quiz') || pathname.includes('setup') ? 'navbar__link--active' : ''}`}>Quiz</Link>
        <Link to="/setup/practice" className={`navbar__link ${pathname.includes('practice') ? 'navbar__link--active' : ''}`}>Practice</Link>
        <Link to="/setup/flashcards" className={`navbar__link ${pathname.includes('flash') ? 'navbar__link--active' : ''}`}>Flashcards</Link>
        <Link to="/setup/speed" className={`navbar__link ${pathname.includes('speed') ? 'navbar__link--active' : ''}`}>Speed</Link>
        <Link to="/setup/weakness" className={`navbar__link ${pathname.includes('weakness') ? 'navbar__link--active' : ''}`}>Weakness</Link>
      </nav>
    </header>
  );
}