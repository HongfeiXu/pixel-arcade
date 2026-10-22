import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.tsx'
import GamePage from './pages/GamePage.tsx'
import SokobanPage from './pages/SokobanPage.tsx'
import UpdatePrompt from './components/UpdatePrompt.tsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/sokoban" element={<SokobanPage />} />
        <Route path="/game/:id" element={<GamePage />} />
      </Routes>
      <UpdatePrompt />
    </>
  )
}
