import styles from './ScoreBoard.module.css'

interface ScoreBoardProps {
  score: number
  highScore: number
}

export default function ScoreBoard({ score, highScore }: ScoreBoardProps) {
  return (
    <div className={styles.container}>
      <span className={styles.star}>⭐</span>
      <span className={styles.score}>{score}</span>
      <span className={styles.separator}>/</span>
      <span className={styles.trophy}>🏆</span>
      <span className={styles.highScore}>{highScore > 0 ? highScore : '—'}</span>
    </div>
  )
}
