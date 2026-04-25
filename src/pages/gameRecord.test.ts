import { describe, expect, test } from 'vitest'
import { isNewRecord } from './gameRecord'

describe('game record helpers', () => {
  test('低于开局最高分时不是新纪录', () => {
    expect(isNewRecord(4, 31)).toBe(false)
  })
})
