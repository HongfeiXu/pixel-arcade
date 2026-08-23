import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import GameIcon from '../components/GameIcon'
import { gameRegistry } from '../games/registry'
import { getInitialHomeFocus, moveGridFocus } from '../hooks/spatialFocus'
import { useSpatialFocus } from '../hooks/useSpatialFocus'
import { useTvMode } from '../hooks/useTvMode'
import styles from './Home.module.css'

const STORAGE_PREFIX = 'pixelarcade_'
let homeFocusToRestore: number | null = null

export default function Home() {
  const navigate = useNavigate()
  const isTvMode = useTvMode()
  const containerRef = useRef<HTMLDivElement>(null)
  const initialFocusRef = useRef(getInitialHomeFocus(
    gameRegistry.map((entry) => entry.meta.status),
    homeFocusToRestore,
  ))
  const lastCardFocusRef = useRef(Math.min(initialFocusRef.current, gameRegistry.length - 1))
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

  const handleCardClick = (id: string, status: string, index: number) => {
    if (status === 'active') {
      homeFocusToRestore = index
      navigate(`/game/${id}`)
    } else {
      // 抖动动画
      setShakingCard(id)
      setTimeout(() => setShakingCard(null), 300)
    }
  }

  useEffect(() => {
    homeFocusToRestore = null
  }, [])

  const activateFocus = (index: number) => {
    const entry = gameRegistry[index]
    if (entry) {
      handleCardClick(entry.meta.id, entry.meta.status, index)
    } else if (index === gameRegistry.length) {
      toggleSound()
    }
  }
  const moveFocus = useCallback((currentIndex: number, direction: 'left' | 'right' | 'up' | 'down') => (
    moveGridFocus(
      currentIndex,
      direction,
      gameRegistry.length,
      lastCardFocusRef.current,
    )
  ), [])

  useSpatialFocus({
    containerRef,
    enabled: isTvMode,
    itemCount: gameRegistry.length + 1,
    initialIndex: initialFocusRef.current,
    move: moveFocus,
    onSelect: activateFocus,
    onFocusChange: (index) => {
      if (index < gameRegistry.length) lastCardFocusRef.current = index
    },
  })

  return (
    <div ref={containerRef} className={`${styles.container} ${isTvMode ? styles.tvMode : ''}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>像素游戏厅</h1>
      </header>

      <main className={styles.grid}>
        {gameRegistry.map((entry, index) => (
          <button
            key={entry.meta.id}
            className={[
              styles.card,
              entry.meta.status === 'coming_soon' ? styles.locked : '',
              shakingCard === entry.meta.id ? styles.shake : '',
            ].filter(Boolean).join(' ')}
            onClick={() => handleCardClick(entry.meta.id, entry.meta.status, index)}
            data-tv-focus-index={index}
            aria-disabled={entry.meta.status === 'coming_soon'}
          >
            <div className={styles.cardCover}>
              <GameIcon icon={entry.meta.icon} label={entry.meta.name} />
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
        <button
          className={styles.soundToggle}
          onClick={toggleSound}
          data-tv-focus-index={gameRegistry.length}
        >
          {soundEnabled ? '🔊' : '🔇'} 音效
        </button>
      </footer>
    </div>
  )
}
