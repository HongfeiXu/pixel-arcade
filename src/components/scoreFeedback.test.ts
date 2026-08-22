import { describe, expect, it } from 'vitest'
import { getScoreFeedbackTier } from './scoreFeedback'

describe('getScoreFeedbackTier', () => {
  it.each([
    [1, 'light'],
    [3, 'strong'],
    [5, 'strong'],
    [8, 'burst'],
  ] as const)('maps +%i to %s feedback', (points, tier) => {
    expect(getScoreFeedbackTier(points)).toBe(tier)
  })
})
