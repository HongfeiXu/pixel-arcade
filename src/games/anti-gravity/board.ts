import type { Board, Cell, Piece } from './types'
import { COLS, ROWS } from './constants'
import { getShape } from './pieces'

/** 创建空棋盘 */
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from<Cell>({ length: COLS }).fill(null)
  )
}

function createEmptyRow(): Cell[] {
  return Array.from<Cell>({ length: COLS }).fill(null)
}

/**
 * 反重力版允许方块在底部隐藏区（boardY >= ROWS），镜像标准版的 boardY < 0。
 */
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
      if (boardX < 0 || boardX >= COLS || boardY < 0) return false
      if (boardY >= ROWS) continue
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

/** 找出所有满行的行号 */
export function findFullRows(board: Board): number[] {
  const rows: number[] = []
  for (let row = 0; row < ROWS; row++) {
    if (board[row].every((cell) => cell !== null)) {
      rows.push(row)
    }
  }
  return rows
}

/** 移除指定行；下方行上移，底部补空行（镜像标准版的顶部补空） */
export function removeRows(board: Board, rows: number[]): void {
  // 从大到小排序，先全部删除再统一补空行，避免 splice 导致索引偏移
  const sorted = [...rows].sort((a, b) => b - a)
  for (const row of sorted) {
    board.splice(row, 1)
  }
  for (let i = 0; i < sorted.length; i++) {
    board.push(createEmptyRow())
  }
}

/** 消除已满的行，返回消除的行数 */
export function clearLines(board: Board): number {
  const rows = findFullRows(board)
  if (rows.length > 0) removeRows(board, rows)
  return rows.length
}

/** 新方块在生成位置已被占据 → Game Over */
export function isGameOver(board: Board, piece: Piece): boolean {
  return !isValidPosition(board, piece, piece.x, piece.y, piece.rotation)
}

/** Ghost Piece 的 Y：向上推到不能再向上为止 */
export function getGhostY(board: Board, piece: Piece): number {
  let ghostY = piece.y
  while (isValidPosition(board, piece, piece.x, ghostY - 1, piece.rotation)) {
    ghostY--
  }
  return ghostY
}
