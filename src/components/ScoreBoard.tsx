import styles from './ScoreBoard.module.css'

interface ScoreBoardProps {
  score: number
}

export default function ScoreBoard({ score }: ScoreBoardProps) {
  return (
    <div className={styles.container}>
      <span className={styles.star}>⭐</span>
      <span className={styles.score}>{score}</span>
    </div>
  )
}
