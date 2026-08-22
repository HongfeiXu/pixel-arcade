const LINE_CLEAR_SCORES = [0, 1, 3, 5, 8] as const

export function getLineClearScore(lines: number): number {
  return LINE_CLEAR_SCORES[lines] ?? 0
}
