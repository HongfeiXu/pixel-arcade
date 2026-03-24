import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './UpdatePrompt.module.css'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className={styles.banner}>
      <span>🆕 发现新版本</span>
      <button className={styles.btn} onClick={() => updateServiceWorker(true)}>
        立即更新
      </button>
      <button className={styles.close} onClick={() => setNeedRefresh(false)}>
        ✕
      </button>
    </div>
  )
}
