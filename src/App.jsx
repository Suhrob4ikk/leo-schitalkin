import { Navigate, Route, Routes } from 'react-router-dom'
import ConfettiLayer from './components/Confetti.jsx'
import Home from './screens/Home.jsx'
import Lesson from './screens/Lesson.jsx'
import LessonComplete from './screens/LessonComplete.jsx'
import Collection from './screens/Collection.jsx'
import Settings from './screens/Settings.jsx'
import Tutor from './screens/Tutor.jsx'
import Trainer from './screens/Trainer.jsx'
import Cubs from './screens/Cubs.jsx'

export default function App() {
  return (
    <div className="app">
      {/* One canvas for the whole app; any screen can fire a burst into it. */}
      <ConfettiLayer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lesson/:id" element={<Lesson />} />
        <Route path="/done/:id" element={<LessonComplete />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/tutor" element={<Tutor />} />
        <Route path="/trainer" element={<Trainer />} />
        {/* Preview only, not linked from anywhere in the kid-facing flow. */}
        <Route path="/cubs" element={<Cubs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
