import { describe, expect, test } from 'vitest'
import { getTvBackCommand, getTvCountdownCommand } from './gamePagePhase'

describe('TV GamePage Back routing', () => {
  test('uses the confirmed two-step playing to paused to lobby flow', () => {
    expect(getTvBackCommand('playing')).toBe('pause')
    expect(getTvBackCommand('paused')).toBe('lobby')
  })

  test('returns to the lobby from non-playing decision phases', () => {
    expect(getTvBackCommand('restore')).toBe('lobby')
    expect(getTvBackCommand('countdown')).toBe('lobby')
    expect(getTvBackCommand('over')).toBe('lobby')
  })

  test('cancels the touch-only exit confirmation back into play', () => {
    expect(getTvBackCommand('confirm-exit')).toBe('resume')
  })
})

describe('TV countdown input routing', () => {
  test.each(['left', 'right', 'up', 'down', 'select'] as const)(
    'consumes %s without dispatching a business action',
    (action) => expect(getTvCountdownCommand(action)).toBe('consume'),
  )

  test('routes only the first Back to the lobby while still consuming repeats', () => {
    expect(getTvCountdownCommand('back')).toBe('lobby')
    expect(getTvCountdownCommand('back', true)).toBe('consume')
  })
})
