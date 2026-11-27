import type { RewardKind } from '../games/types'
import styles from './PixelReward.module.css'

export default function PixelReward({ kind }: { kind: RewardKind }) {
  return <span aria-hidden="true" data-pixel-reward={kind} className={`${styles.reward} ${styles[kind]}`} />
}
