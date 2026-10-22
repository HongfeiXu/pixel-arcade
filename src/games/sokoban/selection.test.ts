import { afterEach, expect, test, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { backPanel, LEVEL_RANGES, moveSelectionFocus, openLevelPanel, openRange, panelItemCount } from './selection'
import { SelectionOverlay } from '../../pages/SokobanPage'

const actions = Array.from({ length: 5 }, () => () => {})
afterEach(() => vi.unstubAllGlobals())

test.each(Array.from({ length: 24 }, (_, index) => index))('open/reopen level %i in its numeric page with current level focus', index => {
  const panel = openLevelPanel(index)
  expect(panel.page).toBe(Math.floor(index / 12))
  expect(panel.initial).toBe(index % 12)
  const ranges = backPanel(panel)!
  expect(ranges.kind).toBe('ranges')
  expect(ranges.initial).toBe(panel.page)
  expect(openRange(ranges.page, index)).toEqual(panel)
  expect(backPanel(ranges)).toEqual({ kind: 'menu', page: panel.page, initial: 3 })
  expect(backPanel(backPanel(ranges)!)).toBeNull()
  expect(openRange(1 - panel.page, index).initial).toBe(0)
})

test.each([0, 1])('page %i arrows stay in rows, current page bottom/back is reachable', page => {
  const panel = openRange(page, 0)
  expect(panelItemCount(panel)).toBe(13)
  for (let index = 0; index < 12; index++) {
    expect(moveSelectionFocus(panel, index, 'left')).toBe(index % 2 ? index - 1 : index)
    expect(moveSelectionFocus(panel, index, 'right')).toBe(index % 2 ? index : index + 1)
    expect(moveSelectionFocus(panel, index, 'up')).toBe(index < 2 ? index : index - 2)
    expect(moveSelectionFocus(panel, index, 'down')).toBe(index < 10 ? index + 2 : 12)
  }
  expect(moveSelectionFocus(panel, 12, 'up')).toBe(11)
  expect(moveSelectionFocus(panel, 12, 'left')).toBe(12)
  const ranges = backPanel(panel)!
  expect(moveSelectionFocus(ranges, 0, 'down')).toBe(1)
  expect(moveSelectionFocus(ranges, 1, 'down')).toBe(2)
  expect(moveSelectionFocus(ranges, 2, 'up')).toBe(1)
})

test.each([0, 12, 23])('render numeric-only 12-button page for level %i; no old titles, hints or locked levels', level => {
  const html = renderToStaticMarkup(createElement(SelectionOverlay, {
    panel: openLevelPanel(level), level, puzzle: { level, completed: [0, 12], canUndo: true, won: false }, won: false,
    menuActions: actions, chooseLevel: () => {}, setPanel: () => {}, back: () => {},
  }))
  expect((html.match(/data-tv-focus-index=/g) ?? []).length).toBe(13)
  expect(html).toContain(LEVEL_RANGES[Math.floor(level / 12)])
  expect(html).toContain('aria-current="step"')
  expect(html).toContain('David W. Skinner')
  expect(html).not.toMatch(/轻轻一推|小小搬运员|礼物|hint|disabled=|初次搬家|绕路与合作/)
  expect(html).toContain(`第 ${Math.floor(level / 12) * 12 + 1} 关`)
  expect(html).toContain(`第 ${(Math.floor(level / 12) + 1) * 12} 关`)
})
