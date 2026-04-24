import type { Point } from './types'
import { COLS, ROWS, COLOR_BG, COLOR_BOARD_BG, COLOR_GRID } from './constants'

export class SnakeRenderer {
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

  render(
    segments: Point[],
    food: Point | null,
    flash: { pos: Point; on: boolean } | null,
    shake: { x: number; y: number } | null,
  ): void {
    const ctx = this.ctx
    const canvasW = ctx.canvas.width / this.dpr
    const canvasH = ctx.canvas.height / this.dpr

    ctx.clearRect(0, 0, canvasW, canvasH)
    ctx.fillStyle = COLOR_BG
    ctx.fillRect(0, 0, canvasW, canvasH)

    ctx.save()
    if (shake) ctx.translate(shake.x, shake.y)

    // 棋盘背景
    ctx.fillStyle = COLOR_BOARD_BG
    ctx.fillRect(0, 0, COLS * this.cellSize, ROWS * this.cellSize)

    // 辅助网格
    this.drawGrid()

    // TODO Task 2: 画蛇
    // TODO Task 3: 画食物
    // TODO Task 6: 闪白叠加

    // 防止 unused 警告（Task 2/3/6 会用到）
    void segments
    void food
    void flash

    ctx.restore()
  }

  private drawGrid(): void {
    const ctx = this.ctx
    const cs = this.cellSize
    ctx.strokeStyle = COLOR_GRID
    ctx.lineWidth = 1
    for (let c = 0; c <= COLS; c++) {
      const x = c * cs
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ROWS * cs)
      ctx.stroke()
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = r * cs
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(COLS * cs, y)
      ctx.stroke()
    }
  }
}
