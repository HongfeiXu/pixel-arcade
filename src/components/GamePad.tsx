import type { GameAction } from '../games/types'
import styles from './GamePad.module.css'

interface GamePadProps {
  onAction: (action: GameAction) => void
}

export default function GamePad({ onAction }: GamePadProps) {
  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <button className={styles.btn} onPointerDown={() => onAction('left')}>
          ←
        </button>
        <button className={styles.btn} onPointerDown={() => onAction('rotate')}>
          旋转
        </button>
        <button className={styles.btn} onPointerDown={() => onAction('right')}>
          →
        </button>
      </div>
      <div className={styles.row}>
        <button className={styles.btn} onPointerDown={() => onAction('down')}>
          ↓ 软降
        </button>
      </div>
      <div className={styles.row}>
        <button className={styles.btnWide} onPointerDown={() => onAction('drop')}>
          ⬇ 到底
        </button>
      </div>
    </div>
  )
}
