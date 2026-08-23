import type { TvRemoteAction } from '../input/tvRemote'

export type FocusDirection = Extract<TvRemoteAction, 'left' | 'right' | 'up' | 'down'>

export function getInitialHomeFocus(statuses: readonly string[], rememberedIndex: number | null): number {
  if (rememberedIndex !== null) {
    return Math.min(Math.max(rememberedIndex, 0), statuses.length)
  }
  const firstActiveIndex = statuses.indexOf('active')
  return firstActiveIndex >= 0 ? firstActiveIndex : 0
}

export function moveGridFocus(
  currentIndex: number,
  direction: FocusDirection,
  cardCount: number,
  lastCardIndex: number,
  columns = 4,
): number {
  if (cardCount <= 0) return 0
  const soundIndex = cardCount

  if (currentIndex === soundIndex) {
    return direction === 'up' ? Math.min(Math.max(lastCardIndex, 0), cardCount - 1) : soundIndex
  }

  const current = Math.min(Math.max(currentIndex, 0), cardCount - 1)
  const rowStart = Math.floor(current / columns) * columns
  const rowEnd = Math.min(rowStart + columns - 1, cardCount - 1)

  if (direction === 'left') return Math.max(rowStart, current - 1)
  if (direction === 'right') return Math.min(rowEnd, current + 1)
  if (direction === 'up') return current >= columns ? current - columns : current

  const nextRowStart = rowStart + columns
  if (nextRowStart >= cardCount) return soundIndex
  return Math.min(current + columns, cardCount - 1)
}

export function moveLinearFocus(
  currentIndex: number,
  direction: FocusDirection,
  itemCount: number,
): number {
  if (itemCount <= 0) return 0
  const current = Math.min(Math.max(currentIndex, 0), itemCount - 1)
  if (direction === 'up') return Math.max(0, current - 1)
  if (direction === 'down') return Math.min(itemCount - 1, current + 1)
  return current
}
