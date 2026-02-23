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

/** 消除已满的行，返回消除的行数 */
export function clearLines(board: Board): number {
  let cleared = 0
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row].every((cell) => cell !== null)) {
      // 移除该行，顶部补空行
      board.splice(row, 1)
      board.unshift(Array.from<Cell>({ length: COLS }).fill(null))
      cleared++
      row++ // 重新检查当前位置（因为上方行下移了）
    }
  }
  return cleared
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
