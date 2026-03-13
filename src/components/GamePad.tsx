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
      {/* 左侧 D-pad */}
      <div className={styles.dpad}>
        <DpadButton
          className={`${styles.dpadBtn} ${styles.dpadUp}`}
          action="up"
          onAction={onAction}
          disabled={disabled}
          label="↑"
        />
        <RepeatButton
          className={`${styles.dpadBtn} ${styles.dpadLeft}`}
          action="left"
          onAction={onAction}
          disabled={disabled}
          label="←"
        />
        <RepeatButton
          className={`${styles.dpadBtn} ${styles.dpadRight}`}
          action="right"
          onAction={onAction}
          disabled={disabled}
          label="→"
        />
        <DpadButton
          className={`${styles.dpadBtn} ${styles.dpadDown}`}
          action="down"
          onAction={onAction}
          disabled={disabled}
          label="↓"
        />
      </div>

      {/* 右侧 ABXY */}
      <div className={styles.abxy}>
        <ActionButton className={`${styles.abxyBtn} ${styles.btnY}`} action="y" onAction={onAction} disabled={disabled} label="Y" />
        <ActionButton className={`${styles.abxyBtn} ${styles.btnX}`} action="x" onAction={onAction} disabled={disabled} label="X" />
        <ActionButton className={`${styles.abxyBtn} ${styles.btnB}`} action="b" onAction={onAction} disabled={disabled} label="B" />
        <ActionButton className={`${styles.abxyBtn} ${styles.btnA}`} action="a" onAction={onAction} disabled={disabled} label="A" />
      </div>
    </div>
  )
}

/** 普通单次触发按钮（D-pad ↑ ↓） */
function DpadButton({
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
  return (
    <button
      className={className}
      onPointerDown={() => !disabled && onAction(action)}
    >
      {label}
    </button>
  )
}

/** ABXY 单次触发按钮 */
function ActionButton({
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
  return (
    <button
      className={className}
      onPointerDown={() => !disabled && onAction(action)}
    >
      {label}
    </button>
  )
}

/** 支持长按连续触发的按钮（D-pad ← →） */
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
    onAction(action)
    timerRef.current = setInterval(() => {
      onAction(action)
    }, 150)
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
