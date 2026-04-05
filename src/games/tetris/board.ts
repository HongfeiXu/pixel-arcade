import type { Board, Cell, Piece } from './types'
import { COLS, ROWS } from './constants'
import { getShape } from './pieces'

/** 创建空棋盘 */
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from<Cell>({ length: COLS }).fill(null)
  )
}

/** 检查方块在指定位置是否合法（无碰撞、不越界） */
export function isValidPosition(
  board: Board,
  piece: Piece,
  x: number,
  y: number,
  rotation: number,
): boolean {
  const shape = getShape(piece.type, rotation)
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue
      const boardX = x + col
      const boardY = y + row
      // 越界
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return false
      // 允许方块在顶部以上（y < 0）
      if (boardY < 0) continue
      // 碰撞
      if (board[boardY][boardX] !== null) return false
    }
  }
  return true
}

/** 将方块锁定到棋盘 */
export function lockPiece(board: Board, piece: Piece): void {
  const shape = getShape(piece.type, piece.rotation)
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue
      const boardY = piece.y + row
      const boardX = piece.x + col
      if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
        board[boardY][boardX] = piece.type
      }
    }
  }
}

/** 找出所有满行的行号（从下到上） */
export function findFullRows(board: Board): number[] {
  const rows: number[] = []
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row].every((cell) => cell !== null)) {
      rows.push(row)
    }
  }
  return rows
}

/** 移除指定行，顶部补空行 */
export function removeRows(board: Board, rows: number[]): void {
  // 从大到小排序，保证 splice 索引正确
  const sorted = [...rows].sort((a, b) => b - a)
  for (const row of sorted) {
    board.splice(row, 1)
    board.unshift(Array.from<Cell>({ length: COLS }).fill(null))
  }
}

/** 消除已满的行，返回消除的行数 */
export function clearLines(board: Board): number {
  const rows = findFullRows(board)
  if (rows.length > 0) removeRows(board, rows)
  return rows.length
}

/** 判断游戏是否结束：新方块在生成位置已被占据 */
export function isGameOver(board: Board, piece: Piece): boolean {
  return !isValidPosition(board, piece, piece.x, piece.y, piece.rotation)
}

/** 计算 Ghost Piece 的 Y 坐标（方块能下落到的最低位置） */
export function getGhostY(board: Board, piece: Piece): number {
  let ghostY = piece.y
  while (isValidPosition(board, piece, piece.x, ghostY + 1, piece.rotation)) {
    ghostY++
  }
  return ghostY
}
