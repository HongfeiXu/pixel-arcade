import { describe, expect, it } from 'vitest'
import { getLineClearScore } from './scoring'

describe('getLineClearScore', () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 3],
    [3, 5],
    [4, 8],
  ])('scores %i cleared lines as %i stars', (lines, expected) => {
    expect(getLineClearScore(lines)).toBe(expected)
  })

  it('does not award impossible clear counts', () => {
    expect(getLineClearScore(5)).toBe(0)
    expect(getLineClearScore(-1)).toBe(0)
  })
})
