import { useParams, useNavigate } from 'react-router-dom'
import { gameRegistry } from '../games/registry.ts'
import styles from './GamePage.module.css'

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const entry = gameRegistry.find((e) => e.meta.id === id)

  if (!entry) {
    return (
      <div className={styles.container}>
        <p className={styles.placeholder}>游戏不存在</p>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          返回大厅
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/')}>
          ←
        </button>
        <span className={styles.gameName}>{entry.meta.name}</span>
        <div className={styles.topBarRight}>
          <button className={styles.iconBtn}>⏸</button>
          <button className={styles.iconBtn}>🔇</button>
        </div>
      </header>

      <main className={styles.canvasArea}>
        <p className={styles.placeholder}>游戏区域（待实现）</p>
      </main>

      <footer className={styles.controlArea}>
        <p className={styles.placeholder}>虚拟手柄（待实现）</p>
      </footer>
    </div>
  )
}
