import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import QuizSetup from './pages/QuizSetup';
import QuizMode from './pages/QuizMode';
import PracticeMode from './pages/PracticeMode';
import FlashcardMode from './pages/FlashcardMode';
import SpeedMode from './pages/SpeedMode';
import WeaknessMode from './pages/WeaknessMode';
import Results from './pages/Results';
import NavBar from './components/NavBar';

export default function App() {
  return (
    <div className="app-root">
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Mode setup screens */}
          <Route path="/setup/:mode" element={<QuizSetup />} />

          {/* Actual mode runners */}
          <Route path="/quiz" element={<QuizMode />} />
          <Route path="/practice" element={<PracticeMode />} />
          <Route path="/flashcards" element={<FlashcardMode />} />
          <Route path="/speed" element={<SpeedMode />} />
          <Route path="/weakness" element={<WeaknessMode />} />

          <Route path="/results" element={<Results />} />
        </Routes>
      </main>
    </div>
  );
}
