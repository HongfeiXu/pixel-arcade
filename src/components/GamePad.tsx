import { useRef, useCallback } from 'react'
import type { GameAction } from '../games/types'
import styles from './GamePad.module.css'

interface GamePadProps {
  onAction: (action: GameAction) => void
  disabled?: boolean
}

export default function GamePad({ onAction, disabled }: GamePadProps) {
  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      <div className={styles.row}>
        <RepeatButton
          className={styles.btn}
          action="left"
          onAction={onAction}
          disabled={disabled}
          label="←"
        />
        <button
          className={styles.btn}
          onPointerDown={() => !disabled && onAction('rotate')}
        >
          旋转
        </button>
        <RepeatButton
          className={styles.btn}
          action="right"
          onAction={onAction}
          disabled={disabled}
          label="→"
        />
      </div>
      <div className={styles.row}>
        <button
          className={styles.btn}
          onPointerDown={() => !disabled && onAction('down')}
        >
          ↓ 软降
        </button>
      </div>
      <div className={styles.row}>
        <button
          className={styles.btnWide}
          onPointerDown={() => !disabled && onAction('drop')}
        >
          ⬇ 到底
        </button>
      </div>
    </div>
  )
}

/** 支持长按连续触发的按钮（左/右方向键） */
function RepeatButton({
  className,
  action,
  onAction,
  disabled,
  label,
}: {
  className: string
  action: GameAction
  onAction: (action: GameAction) => void
  disabled?: boolean
  label: string
}) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopRepeat = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRepeat = useCallback(() => {
    if (disabled) return
    onAction(action) // 立即触发一次
    timerRef.current = setInterval(() => {
      onAction(action)
    }, 150) // 150ms 间隔连续触发
  }, [action, onAction, disabled])

  return (
    <button
      className={className}
      onPointerDown={startRepeat}
      onPointerUp={stopRepeat}
      onPointerLeave={stopRepeat}
      onPointerCancel={stopRepeat}
    >
      {label}
    </button>
  )
}
