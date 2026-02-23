import type { Board, Piece } from './types'
import {
  COLS, ROWS,
  PIECE_COLORS, COLOR_BOARD_BG, COLOR_GRID,
} from './constants'
import { getShape } from './pieces'
import { getGhostY } from './board'

export class TetrisRenderer {
  private ctx!: CanvasRenderingContext2D
  private dpr = 1
  private cellSize = 0

  init(canvas: HTMLCanvasElement, cellSize: number, dpr: number): void {
    this.dpr = dpr
    this.cellSize = cellSize

    const width = COLS * cellSize
    const height = ROWS * cellSize

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    this.ctx = canvas.getContext('2d')!
    this.ctx.scale(dpr, dpr)
    this.ctx.imageSmoothingEnabled = false
  }

  render(board: Board, currentPiece: Piece | null): void {
    const ctx = this.ctx
    const cs = this.cellSize
    const canvasW = ctx.canvas.width / this.dpr
    const canvasH = ctx.canvas.height / this.dpr

    // 清空整个 Canvas
    ctx.clearRect(0, 0, canvasW, canvasH)

    // 棋盘背景
    ctx.fillStyle = COLOR_BOARD_BG
    ctx.fillRect(0, 0, COLS * cs, ROWS * cs)

    // 网格线
    this.drawGrid()

    // 已锁定方块
    this.drawBoard(board)

    // Ghost Piece
    if (currentPiece) {
      this.drawGhost(board, currentPiece)
    }

    // 当前方块
    if (currentPiece) {
      this.drawPiece(currentPiece, 1)
    }
  }

  private drawGrid(): void {
    const ctx = this.ctx
    const cs = this.cellSize
    ctx.strokeStyle = COLOR_GRID
    ctx.lineWidth = 1

    for (let col = 0; col <= COLS; col++) {
      const x = col * cs
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ROWS * cs)
      ctx.stroke()
    }

    for (let row = 0; row <= ROWS; row++) {
      const y = row * cs
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(COLS * cs, y)
      ctx.stroke()
    }
  }

  private drawBoard(board: Board): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = board[row][col]
        if (cell) {
          this.drawCell(col, row, PIECE_COLORS[cell])
        }
      }
    }
  }

  private drawPiece(piece: Piece, alpha: number): void {
    const shape = getShape(piece.type, piece.rotation)
    const colors = PIECE_COLORS[piece.type]
    const ctx = this.ctx
    ctx.globalAlpha = alpha

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue
        const boardY = piece.y + row
        if (boardY < 0) continue
        this.drawCell(piece.x + col, boardY, colors)
      }
    }

    ctx.globalAlpha = 1
  }

  private drawGhost(board: Board, piece: Piece): void {
    const ghostY = getGhostY(board, piece)
    if (ghostY === piece.y) return

    const ghostPiece: Piece = { ...piece, y: ghostY }
    const shape = getShape(ghostPiece.type, ghostPiece.rotation)
    const colors = PIECE_COLORS[ghostPiece.type]
    const ctx = this.ctx
    ctx.globalAlpha = 0.3

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue
        const boardY = ghostPiece.y + row
        if (boardY < 0) continue
        this.drawCell(ghostPiece.x + col, boardY, colors)
      }
    }

    ctx.globalAlpha = 1
  }

  /** 绘制单个格子（3 层像素立体感） */
  private drawCell(
    col: number,
    row: number,
    colors: { main: string; light: string; dark: string },
  ): void {
    const ctx = this.ctx
    const cs = this.cellSize
    const x = col * cs
    const y = row * cs
    const border = Math.max(2, Math.round(cs / 12))

    // 主色填充
    ctx.fillStyle = colors.main
    ctx.fillRect(x, y, cs, cs)

    // 亮色（顶部 + 左侧高光）
    ctx.fillStyle = colors.light
    ctx.fillRect(x, y, cs, border)       // 顶部
    ctx.fillRect(x, y, border, cs)       // 左侧

    // 暗色（底部 + 右侧阴影）
    ctx.fillStyle = colors.dark
    ctx.fillRect(x, y + cs - border, cs, border)   // 底部
    ctx.fillRect(x + cs - border, y, border, cs)    // 右侧
  }
}
