export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Point {
  x: number
  y: number
}

export interface SnakeSavedState {
  version: 1
  segments: Point[]
  direction: Direction
  food: Point
  score: number
}
