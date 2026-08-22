import { getScoreFeedbackTier } from './scoreFeedback'
import styles from './ScorePopup.module.css'

interface ScorePopupProps {
  points: number
}

const TIER_CLASSES = {
  light: styles.light,
  strong: styles.strong,
  burst: styles.burst,
}

export default function ScorePopup({ points }: ScorePopupProps) {
  const tier = getScoreFeedbackTier(points)

  return (
    <span
      className={`${styles.popup} ${TIER_CLASSES[tier]}`}
      data-score-popup
      data-tier={tier}
      aria-hidden="true"
    >
      +{points}
    </span>
  )
}
