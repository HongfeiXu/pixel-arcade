import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { gameRegistry } from '../games/registry'
import styles from './Home.module.css'

const STORAGE_PREFIX = 'pixelarcade_'

export default function Home() {
  const navigate = useNavigate()
  const [scores, setScores] = useState<Record<string, number>>({})
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [shakingCard, setShakingCard] = useState<string | null>(null)

  // 读取最高分和设置
  useEffect(() => {
    try {
      const scoresJson = localStorage.getItem(STORAGE_PREFIX + 'scores')
      if (scoresJson) setScores(JSON.parse(scoresJson))
    } catch { /* ignore */ }

    try {
      const settings = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'settings') || '{}')
      setSoundEnabled(settings.soundEnabled ?? true)
    } catch { /* ignore */ }
  }, [])

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem(
      STORAGE_PREFIX + 'settings',
      JSON.stringify({ soundEnabled: next }),
    )
  }

  const handleCardClick = (id: string, status: string) => {
    if (status === 'active') {
      navigate(`/game/${id}`)
    } else {
      // 抖动动画
      setShakingCard(id)
      setTimeout(() => setShakingCard(null), 300)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>像素游戏厅</h1>
      </header>

      <main className={styles.grid}>
        {gameRegistry.map((entry) => (
          <button
            key={entry.meta.id}
            className={[
              styles.card,
              entry.meta.status === 'coming_soon' ? styles.locked : '',
              shakingCard === entry.meta.id ? styles.shake : '',
            ].filter(Boolean).join(' ')}
            onClick={() => handleCardClick(entry.meta.id, entry.meta.status)}
          >
            <div className={styles.cardCover}>
              {entry.meta.status === 'coming_soon' && (
                <span className={styles.lockIcon}>🔒</span>
              )}
            </div>
            <div className={styles.cardName}>{entry.meta.name}</div>
            <div className={styles.cardScore}>
              ⭐ {scores[entry.meta.id] != null ? scores[entry.meta.id] : '—'}
            </div>
          </button>
        ))}
      </main>

      <footer className={styles.footer}>
        <button className={styles.soundToggle} onClick={toggleSound}>
          {soundEnabled ? '🔊' : '🔇'} 音效
        </button>
      </footer>
    </div>
  )
}
