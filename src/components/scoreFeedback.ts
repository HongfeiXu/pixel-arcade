export type ScoreFeedbackTier = 'light' | 'strong' | 'burst'

export function getScoreFeedbackTier(points: number): ScoreFeedbackTier {
  if (points >= 8) return 'burst'
  if (points >= 3) return 'strong'
  return 'light'
}
