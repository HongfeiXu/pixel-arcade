import { describe, expect, test } from 'vitest'
import { getInitialHomeFocus, moveGridFocus, moveLinearFocus } from './spatialFocus'

describe('TV spatial focus', () => {
  test('moves within a four-column row without wrapping', () => {
    expect(moveGridFocus(1, 'left', 8, 1)).toBe(0)
    expect(moveGridFocus(1, 'right', 8, 1)).toBe(2)
    expect(moveGridFocus(0, 'left', 8, 0)).toBe(0)
    expect(moveGridFocus(3, 'right', 8, 3)).toBe(3)
  })

  test('moves vertically between full rows', () => {
    expect(moveGridFocus(1, 'down', 8, 1)).toBe(5)
    expect(moveGridFocus(5, 'up', 8, 5)).toBe(1)
  })

  test('chooses the nearest card in an incomplete final row', () => {
    expect(moveGridFocus(2, 'down', 6, 2)).toBe(5)
    expect(moveGridFocus(3, 'down', 6, 3)).toBe(5)
  })

  test('moves from the final row to sound and back to the last card', () => {
    expect(moveGridFocus(5, 'down', 6, 5)).toBe(6)
    expect(moveGridFocus(6, 'up', 6, 3)).toBe(3)
  })

  test('keeps all card positions in the path regardless of game status', () => {
    expect(moveGridFocus(0, 'right', 4, 0)).toBe(1)
  })

  test('moves linearly only on the vertical axis and never wraps', () => {
    expect(moveLinearFocus(0, 'up', 2)).toBe(0)
    expect(moveLinearFocus(0, 'down', 2)).toBe(1)
    expect(moveLinearFocus(1, 'down', 2)).toBe(1)
    expect(moveLinearFocus(1, 'left', 2)).toBe(1)
  })

  test('starts at the first active game and only restores an explicit return focus', () => {
    const statuses = ['coming_soon', 'active', 'active']
    expect(getInitialHomeFocus(statuses, null)).toBe(1)
    expect(getInitialHomeFocus(statuses, 2)).toBe(2)
  })
})
