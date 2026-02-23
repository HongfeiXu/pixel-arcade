export type PieceType = 'I' | 'O' | 'T' | 'L' | 'J'

export interface Piece {
  type: PieceType
  rotation: number  // 0-3
  x: number         // 棋盘列坐标（左上角）
  y: number         // 棋盘行坐标（左上角）
}

/** 棋盘格子：null 为空，PieceType 表示已锁定的方块颜色 */
export type Cell = PieceType | null

/** 棋盘：行优先二维数组，board[row][col] */
export type Board = Cell[][]
