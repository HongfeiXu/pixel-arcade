import { describe, expect, test } from 'vitest'
import {
  normalizeTvRemoteKey,
  shouldHandleTvRemoteKey,
  shouldSuppressSyntheticSelectClick,
} from './tvRemote'

describe('TV remote key normalization', () => {
  test.each([
    [{ key: 'ArrowLeft' }, 'left'],
    [{ key: 'ArrowRight' }, 'right'],
    [{ key: 'ArrowUp' }, 'up'],
    [{ key: 'ArrowDown' }, 'down'],
    [{ key: 'Enter' }, 'select'],
    [{ key: 'Escape' }, 'back'],
    [{ key: 'BrowserBack' }, 'back'],
    [{ key: 'GoBack' }, 'back'],
  ] as const)('maps standard key $key', (event, expected) => {
    expect(normalizeTvRemoteKey(event)).toBe(expected)
  })

  test.each([
    [{ code: 'NumpadEnter' }, 'select'],
    [{ code: 'BrowserBack' }, 'back'],
    [{ keyCode: 23 }, 'select'],
    [{ keyCode: 4 }, 'back'],
    [{ keyCode: 461 }, 'back'],
    [{ keyCode: 37 }, 'left'],
  ] as const)('falls back to code and legacy keyCode', (event, expected) => {
    expect(normalizeTvRemoteKey(event)).toBe(expected)
  })

  test('prefers key over conflicting fallback values', () => {
    expect(normalizeTvRemoteKey({ key: 'ArrowUp', code: 'Enter', keyCode: 4 })).toBe('up')
  })

  test('does not consume unknown keys', () => {
    expect(normalizeTvRemoteKey({ key: 'MediaPlayPause', keyCode: 179 })).toBeNull()
  })

  test('ignores repeated select and back but permits repeated directions', () => {
    expect(shouldHandleTvRemoteKey({ repeat: true }, 'select')).toBe(false)
    expect(shouldHandleTvRemoteKey({ repeat: true }, 'back')).toBe(false)
    expect(shouldHandleTvRemoteKey({ repeat: true }, 'down')).toBe(true)
  })

  test('suppresses only a synthetic click in the Select deduplication window', () => {
    expect(shouldSuppressSyntheticSelectClick(0, 0)).toBe(true)
    expect(shouldSuppressSyntheticSelectClick(0, 750)).toBe(true)
    expect(shouldSuppressSyntheticSelectClick(1, 10)).toBe(false)
    expect(shouldSuppressSyntheticSelectClick(0, 751)).toBe(false)
  })
})
