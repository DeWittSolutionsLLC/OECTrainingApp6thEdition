import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Home          from './pages/Home';
import QuizMode      from './pages/QuizMode';
import PracticeMode  from './pages/PracticeMode';
import FlashcardMode from './pages/FlashcardMode';
import SpeedMode     from './pages/SpeedMode';
import WeaknessMode  from './pages/WeaknessMode';
import QuizSetup     from './pages/QuizSetup';
import Results       from './pages/Results';
import AuthPage      from './pages/AuthPage';
import ProfilePage   from './pages/ProfilePage';
import NavBar        from './components/NavBar';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NavBar/>
        
        <Routes>

          <Route path="/"            element={<Home />} />
          <Route path="/auth"        element={<AuthPage />} />
          <Route path="/profile"     element={<ProfilePage />} />
          <Route path="/setup/:mode" element={<QuizSetup />} />
          <Route path="/quiz"        element={<QuizMode />} />
          <Route path="/practice"    element={<PracticeMode />} />
          <Route path="/flashcards"  element={<FlashcardMode />} />
          <Route path="/speed"       element={<SpeedMode />} />
          <Route path="/weakness"    element={<WeaknessMode />} />
          <Route path="/results"     element={<Results />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}