import { moveLinearFocus } from '../../hooks/spatialFocus'
import type { Direction } from './types'
import { moveLevelFocus } from './input'

export const LEVEL_PAGE_SIZE = 12
export const LEVEL_RANGES = ['1–12', '13–24'] as const
export interface SelectionPanel { kind: 'menu' | 'ranges' | 'levels'; page: number; initial: number }
export function openLevelPanel(level: number): SelectionPanel {
  return { kind: 'levels', page: Math.floor(level / LEVEL_PAGE_SIZE), initial: level % LEVEL_PAGE_SIZE }
}
export function openRange(page: number, level: number): SelectionPanel {
  return { kind: 'levels', page, initial: Math.floor(level / LEVEL_PAGE_SIZE) === page ? level % LEVEL_PAGE_SIZE : 0 }
}
export function backPanel(panel: SelectionPanel): SelectionPanel | null {
  if (panel.kind === 'levels') return { kind: 'ranges', page: panel.page, initial: panel.page }
  if (panel.kind === 'ranges') return { kind: 'menu', page: panel.page, initial: 3 }
  return null
}
export function panelItemCount(panel: SelectionPanel): number {
  return panel.kind === 'levels' ? LEVEL_PAGE_SIZE + 1 : panel.kind === 'ranges' ? LEVEL_RANGES.length + 1 : 5
}
export function moveSelectionFocus(panel: SelectionPanel, index: number, direction: Direction): number {
  return panel.kind === 'levels' ? moveLevelFocus(index, direction, LEVEL_PAGE_SIZE) : moveLinearFocus(index, direction, panelItemCount(panel))
}
