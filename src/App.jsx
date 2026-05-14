// App.jsx  — wire-up reference (merge with your existing router)
// This shows just the additions needed; keep all your existing routes.

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Existing pages
import Home         from './pages/Home';
import QuizMode     from './pages/QuizMode';
import PracticeMode from './pages/PracticeMode';
import FlashcardMode from './pages/FlashcardMode';
import SpeedMode    from './pages/SpeedMode';
import WeaknessMode from './pages/WeaknessMode';
import QuizSetup    from './pages/QuizSetup';
import Results      from './pages/Results';
import Leaderboard  from './pages/Leaderboard';

// New pages
import AuthPage     from './pages/AuthPage';
import ProfilePage  from './pages/ProfilePage';

export default function App() {
  return (
    // Wrap everything in AuthProvider so useAuth() works anywhere
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={<Home />} />
          <Route path="/auth"            element={<AuthPage />} />
          <Route path="/profile"         element={<ProfilePage />} />
          <Route path="/setup/:mode"     element={<QuizSetup />} />
          <Route path="/quiz"            element={<QuizMode />} />
          <Route path="/practice"        element={<PracticeMode />} />
          <Route path="/flashcards"      element={<FlashcardMode />} />
          <Route path="/speed"           element={<SpeedMode />} />
          <Route path="/weakness"        element={<WeaknessMode />} />
          <Route path="/results"         element={<Results />} />
          <Route path="/leaderboard"     element={<Leaderboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}