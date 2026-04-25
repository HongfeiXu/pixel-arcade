export function isNewRecord(finalScore: number, roundStartHighScore: number): boolean {
  return finalScore > 0 && finalScore > roundStartHighScore
}
