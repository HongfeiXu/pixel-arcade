import { describe, expect, test } from 'vitest'
import { getTvModeOverride } from './useTvMode'

describe('TV mode URL override', () => {
  test('forces TV mode only for tv=1', () => {
    expect(getTvModeOverride('?tv=1')).toBe(true)
    expect(getTvModeOverride('?foo=bar&tv=1')).toBe(true)
  })

  test('forces phone mode only for tv=0', () => {
    expect(getTvModeOverride('?tv=0')).toBe(false)
  })

  test('falls back to media detection for missing or unknown values', () => {
    expect(getTvModeOverride('')).toBeNull()
    expect(getTvModeOverride('?tv=true')).toBeNull()
  })
})
