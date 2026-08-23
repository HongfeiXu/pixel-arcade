import { useEffect, useRef, useCallback } from 'react'
import type { GameAction } from '../games/types'
import { normalizeTvRemoteKey } from '../input/tvRemote'

// DAS 重复间隔，与 GamePad RepeatButton 一致
const DAS_INTERVAL = 150

interface KeyMapping {
  action: GameAction
  repeat: boolean
}

export const DEFAULT_KEY_MAP: Record<string, KeyMapping> = {
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

export function getDasKey(
  event: Pick<KeyboardEvent, 'code' | 'keyCode'>,
  action?: GameAction,
): string | null {
  if (event.code && event.code !== 'Unidentified') return `code:${event.code}`
  if (event.keyCode > 0) return `keyCode:${event.keyCode}`
  return action ? `action:${action}` : null
}

interface UseKeyboardOptions {
  onAction: (action: GameAction) => void
  onPauseToggle: () => void
  enabled: boolean
  keyMap?: Record<string, KeyMapping>
  tvMode?: boolean
  pauseEnabled?: boolean
}

export function useKeyboard({
  onAction,
  onPauseToggle,
  enabled,
  keyMap = DEFAULT_KEY_MAP,
  tvMode = false,
  pauseEnabled = true,
}: UseKeyboardOptions): void {
  const onActionRef = useRef(onAction)
  const onPauseToggleRef = useRef(onPauseToggle)
  const enabledRef = useRef(enabled)
  const tvModeRef = useRef(tvMode)
  const pauseEnabledRef = useRef(pauseEnabled)

  onActionRef.current = onAction
  onPauseToggleRef.current = onPauseToggle
  enabledRef.current = enabled
  tvModeRef.current = tvMode
  pauseEnabledRef.current = pauseEnabled

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
      const isPauseKey = e.code === 'KeyP' || (pauseEnabledRef.current && e.code === 'Escape')
      if (isPauseKey && PAUSE_KEYS.has(e.code)) {
        e.preventDefault()
        if (!e.repeat) {
          onPauseToggleRef.current()
        }
        return
      }

      if (!enabledRef.current) return

      let mapping = keyMap[e.code]
      if (tvModeRef.current) {
        const remoteAction = normalizeTvRemoteKey(e)
        if (remoteAction === 'select') {
          mapping = { action: 'a', repeat: false }
        } else if (remoteAction === 'left' || remoteAction === 'right' || remoteAction === 'up' || remoteAction === 'down') {
          const canonicalCode = `Arrow${remoteAction[0].toUpperCase()}${remoteAction.slice(1)}`
          mapping = keyMap[canonicalCode]
        }
      }
      if (!mapping) return

      e.preventDefault()
      if (e.repeat) return

      onActionRef.current(mapping.action)

      const keyId = getDasKey(e, mapping.action)
      if (mapping.repeat && keyId && !dasTimers.current.has(keyId)) {
        const timer = setInterval(() => {
          if (enabledRef.current) {
            onActionRef.current(mapping.action)
          }
        }, DAS_INTERVAL)
        dasTimers.current.set(keyId, timer)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      let action: GameAction | undefined = keyMap[e.code]?.action
      if (tvModeRef.current) {
        const remoteAction = normalizeTvRemoteKey(e)
        if (remoteAction === 'left' || remoteAction === 'right' || remoteAction === 'up' || remoteAction === 'down') {
          action = remoteAction
        }
      }
      const keyId = getDasKey(e, action)
      if (!keyId) return
      const timer = dasTimers.current.get(keyId)
      if (timer !== undefined) {
        clearInterval(timer)
        dasTimers.current.delete(keyId)
      }
    }

    const handleBlur = () => {
      clearAllDas()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', clearAllDas)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', clearAllDas)
      clearAllDas()
    }
  }, [keyMap, clearAllDas])

  // enabled 变 false 时立即清理 DAS
  useEffect(() => {
    if (!enabled) {
      clearAllDas()
    }
  }, [enabled, clearAllDas])

  useEffect(() => {
    clearAllDas()
  }, [tvMode, clearAllDas])
}
