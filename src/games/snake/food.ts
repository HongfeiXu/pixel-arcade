import type { Point } from './types'
import { COLS, ROWS } from './constants'

/**
 * 从所有非蛇身格子中均匀随机选一个生成食物。
 * 若棋盘被蛇填满则返回 null（实际不会发生，15×15=225 格）。
 */
export function spawnFood(segments: Point[]): Point | null {
  const occupied = new Set<number>()
  for (const s of segments) occupied.add(s.y * COLS + s.x)
  const candidates: Point[] = []
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!occupied.has(y * COLS + x)) candidates.push({ x, y })
    }
  }
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}
