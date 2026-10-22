export type Direction = 'up' | 'down' | 'left' | 'right'
export interface PuzzleStatus {
  level: number
  completed: number[]
  won: boolean
  canUndo: boolean
}
export interface PuzzleControls {
  getPuzzleStatus(): PuzzleStatus
  onPuzzleChange?: (status: PuzzleStatus) => void
  selectLevel(level: number): void
  undo(): void
  restartLevel(): void
}
