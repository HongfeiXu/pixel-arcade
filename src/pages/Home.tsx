import { useNavigate } from 'react-router-dom'
import { gameRegistry } from '../games/registry.ts'
import styles from './Home.module.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>像素游戏厅</h1>
      </header>

      <main className={styles.grid}>
        {gameRegistry.map((entry) => (
          <button
            key={entry.meta.id}
            className={`${styles.card} ${entry.meta.status === 'coming_soon' ? styles.locked : ''}`}
            onClick={() => {
              if (entry.meta.status === 'active') {
                navigate(`/game/${entry.meta.id}`)
              }
            }}
          >
            <div className={styles.cardCover}>
              {entry.meta.status === 'coming_soon' && (
                <span className={styles.lockIcon}>🔒</span>
              )}
            </div>
            <div className={styles.cardName}>{entry.meta.name}</div>
            <div className={styles.cardScore}>⭐ —</div>
          </button>
        ))}
      </main>

      <footer className={styles.footer}>
        <button className={styles.soundToggle}>🔇 音效</button>
      </footer>
    </div>
  )
}
