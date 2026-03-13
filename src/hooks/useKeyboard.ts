import { useEffect, useRef, useCallback } from 'react'
import type { GameAction } from '../games/types'

// DAS 重复间隔，与 GamePad RepeatButton 一致
const DAS_INTERVAL = 150

interface KeyMapping {
  action: GameAction
  repeat: boolean
}

const DEFAULT_KEY_MAP: Record<string, KeyMapping> = {
  ArrowLeft:  { action: 'left',  repeat: true },
  ArrowRight: { action: 'right', repeat: true },
  ArrowDown:  { action: 'down',  repeat: false },
  ArrowUp:    { action: 'up',    repeat: false },
  KeyA:       { action: 'left',  repeat: true },
  KeyD:       { action: 'right', repeat: true },
  KeyS:       { action: 'down',  repeat: false },
  KeyW:       { action: 'up',    repeat: false },
  KeyJ:       { action: 'a',     repeat: false },
  KeyZ:       { action: 'a',     repeat: false },
  KeyK:       { action: 'b',     repeat: false },
  KeyX:       { action: 'b',     repeat: false },
  Space:      { action: 'a',     repeat: false },
}

const PAUSE_KEYS = new Set(['KeyP', 'Escape'])

interface UseKeyboardOptions {
  onAction: (action: GameAction) => void
  onPauseToggle: () => void
  enabled: boolean
  keyMap?: Record<string, KeyMapping>
}

export function useKeyboard({
  onAction,
  onPauseToggle,
  enabled,
  keyMap = DEFAULT_KEY_MAP,
}: UseKeyboardOptions): void {
  const onActionRef = useRef(onAction)
  const onPauseToggleRef = useRef(onPauseToggle)
  const enabledRef = useRef(enabled)

  onActionRef.current = onAction
  onPauseToggleRef.current = onPauseToggle
  enabledRef.current = enabled

  const dasTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const clearAllDas = useCallback(() => {
    for (const timer of dasTimers.current.values()) {
      clearInterval(timer)
    }
    dasTimers.current.clear()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 暂停键不受 enabled 控制
      if (PAUSE_KEYS.has(e.code)) {
        e.preventDefault()
        if (!e.repeat) {
          onPauseToggleRef.current()
        }
        return
      }

      if (!enabledRef.current) return

      const mapping = keyMap[e.code]
      if (!mapping) return

      e.preventDefault()
      if (e.repeat) return

      onActionRef.current(mapping.action)

      if (mapping.repeat && !dasTimers.current.has(e.code)) {
        const timer = setInterval(() => {
          if (enabledRef.current) {
            onActionRef.current(mapping.action)
          }
        }, DAS_INTERVAL)
        dasTimers.current.set(e.code, timer)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const timer = dasTimers.current.get(e.code)
      if (timer !== undefined) {
        clearInterval(timer)
        dasTimers.current.delete(e.code)
      }
    }

    const handleBlur = () => {
      clearAllDas()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      clearAllDas()
    }
  }, [keyMap, clearAllDas])

  // enabled 变 false 时立即清理 DAS
  useEffect(() => {
    if (!enabled) {
      clearAllDas()
    }
  }, [enabled, clearAllDas])
}
