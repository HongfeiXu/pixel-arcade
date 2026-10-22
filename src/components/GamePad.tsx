import { useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { GameAction } from '../games/types'
import ArrowIcon from './ArrowIcon'
import styles from './GamePad.module.css'

interface GamePadProps {
  onAction: (action: GameAction) => void
  disabled?: boolean
  /** 为 true 时上/下/Y/A 也支持按住连续触发（默认 false：仅 tap） */
  directionRepeat?: boolean
  /** 回合制游戏：所有按钮每次按下只触发一次。 */
  singleStep?: boolean
  actionLabels?: Partial<Record<GameAction, string>>
}

export default function GamePad({ onAction, disabled, directionRepeat, singleStep, actionLabels }: GamePadProps) {
  const UpDownBtn = directionRepeat && !singleStep ? RepeatButton : DpadButton
  const SideBtn = singleStep ? DpadButton : RepeatButton
  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      {/* 左侧 D-pad */}
      <div className={styles.dpad}>
        <UpDownBtn
          className={`${styles.dpadBtn} ${styles.dpadUp}`}
          action="up"
          onAction={onAction}
          disabled={disabled}
          label={<ArrowIcon direction="up" />}
        />
        <SideBtn
          className={`${styles.dpadBtn} ${styles.dpadLeft}`}
          action="left"
          onAction={onAction}
          disabled={disabled}
          label={<ArrowIcon direction="left" />}
        />
        <SideBtn
          className={`${styles.dpadBtn} ${styles.dpadRight}`}
          action="right"
          onAction={onAction}
          disabled={disabled}
          label={<ArrowIcon direction="right" />}
        />
        <UpDownBtn
          className={`${styles.dpadBtn} ${styles.dpadDown}`}
          action="down"
          onAction={onAction}
          disabled={disabled}
          label={<ArrowIcon direction="down" />}
        />
      </div>

      {/* 右侧 ABXY */}
      <div className={styles.abxy}>
        <UpDownBtn className={`${styles.abxyBtn} ${styles.btnY}`} action="y" onAction={onAction} disabled={disabled} label={actionLabels?.y ?? "Y"} />
        <SideBtn className={`${styles.abxyBtn} ${styles.btnX}`} action="x" onAction={onAction} disabled={disabled} label={actionLabels?.x ?? "X"} />
        <SideBtn className={`${styles.abxyBtn} ${styles.btnB}`} action="b" onAction={onAction} disabled={disabled} label={actionLabels?.b ?? "B"} />
        <UpDownBtn className={`${styles.abxyBtn} ${styles.btnA}`} action="a" onAction={onAction} disabled={disabled} label={actionLabels?.a ?? "A"} />
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
  label: ReactNode
}) {
  return (
    <button
      className={className}
      disabled={disabled}
      aria-label={({ up: '向上', down: '向下', left: '向左', right: '向右' } as Partial<Record<GameAction, string>>)[action] ?? (typeof label === 'string' ? label : action)}
      onPointerDown={() => !disabled && onAction(action)}
      onClick={event => { if (event.detail === 0 && !disabled) onAction(action) }}
    >
      {label}
    </button>
  )
}

/** 支持长按连续触发的按钮 */
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
  label: ReactNode
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
