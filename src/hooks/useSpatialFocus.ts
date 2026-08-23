import { useCallback, useEffect, useRef, useState } from 'react'
import {
  normalizeTvRemoteKey,
  shouldHandleTvRemoteKey,
  shouldSuppressSyntheticSelectClick,
  SYNTHETIC_SELECT_CLICK_WINDOW_MS,
} from '../input/tvRemote'
import type { FocusDirection } from './spatialFocus'

const REPEAT_THROTTLE_MS = 200

interface UseSpatialFocusOptions {
  containerRef: React.RefObject<HTMLElement | null>
  enabled: boolean
  itemCount: number
  initialIndex?: number
  move: (currentIndex: number, direction: FocusDirection) => number
  onSelect: (index: number) => void
  onBack?: () => void
  onFocusChange?: (index: number) => void
}

export function useSpatialFocus({
  containerRef,
  enabled,
  itemCount,
  initialIndex = 0,
  move,
  onSelect,
  onBack,
  onFocusChange,
}: UseSpatialFocusOptions) {
  const [focusedIndex, setFocusedIndex] = useState(initialIndex)
  const focusedIndexRef = useRef(initialIndex)
  const lastRepeatAtRef = useRef(0)
  const moveRef = useRef(move)
  const onSelectRef = useRef(onSelect)
  const onBackRef = useRef(onBack)
  const onFocusChangeRef = useRef(onFocusChange)

  moveRef.current = move
  onSelectRef.current = onSelect
  onBackRef.current = onBack
  onFocusChangeRef.current = onFocusChange

  const focusIndex = useCallback((index: number) => {
    const safeIndex = Math.min(Math.max(index, 0), Math.max(itemCount - 1, 0))
    const container = containerRef.current
    if (!container) return

    container.querySelectorAll<HTMLElement>('[data-tv-focus-index]').forEach((element) => {
      delete element.dataset.focused
    })
    const element = container.querySelector<HTMLElement>(`[data-tv-focus-index="${safeIndex}"]`)
    if (!element) return

    element.dataset.focused = 'true'
    element.focus({ preventScroll: true })
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    focusedIndexRef.current = safeIndex
    setFocusedIndex(safeIndex)
    onFocusChangeRef.current?.(safeIndex)
  }, [containerRef, itemCount])

  useEffect(() => {
    if (!enabled || itemCount <= 0) return
    focusIndex(initialIndex)

    return () => {
      containerRef.current?.querySelectorAll<HTMLElement>('[data-tv-focus-index]').forEach((element) => {
        delete element.dataset.focused
      })
    }
  }, [enabled, focusIndex, initialIndex, itemCount, containerRef])

  useEffect(() => {
    if (!enabled || itemCount <= 0) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const action = normalizeTvRemoteKey(event)
      if (!action || !shouldHandleTvRemoteKey(event, action)) return

      if (action === 'back') {
        if (!onBackRef.current) return
        event.preventDefault()
        event.stopImmediatePropagation()
        onBackRef.current()
        return
      }

      event.preventDefault()
      event.stopImmediatePropagation()

      if (action === 'select') {
        const element = containerRef.current?.querySelector<HTMLElement>(
          `[data-tv-focus-index="${focusedIndexRef.current}"]`,
        )
        if (!element) return
        const selectedAt = Date.now()
        const suppressSyntheticClick = (clickEvent: MouseEvent) => {
          const target = clickEvent.target
          if (
            target instanceof Node
            && element.contains(target)
            && shouldSuppressSyntheticSelectClick(clickEvent.detail, Date.now() - selectedAt)
          ) {
            clickEvent.preventDefault()
            clickEvent.stopImmediatePropagation()
            cleanup()
          }
        }
        const cleanup = () => {
          clearTimeout(cleanupTimer)
          element.removeEventListener('click', suppressSyntheticClick, true)
        }
        const cleanupTimer = setTimeout(cleanup, SYNTHETIC_SELECT_CLICK_WINDOW_MS + 1)
        element.addEventListener('click', suppressSyntheticClick, true)
        onSelectRef.current(focusedIndexRef.current)
        return
      }

      if (event.repeat) {
        const now = Date.now()
        if (now - lastRepeatAtRef.current < REPEAT_THROTTLE_MS) return
        lastRepeatAtRef.current = now
      } else {
        lastRepeatAtRef.current = 0
      }

      const next = moveRef.current(focusedIndexRef.current, action)
      if (next !== focusedIndexRef.current) focusIndex(next)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [containerRef, enabled, focusIndex, itemCount])

  return { focusedIndex, focusIndex }
}
