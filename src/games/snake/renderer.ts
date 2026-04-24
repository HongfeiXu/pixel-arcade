import type { Point } from './types'
import { COLS, ROWS, COLOR_BG, COLOR_BOARD_BG, COLOR_GRID, COLOR_HEAD, COLOR_BODY } from './constants'

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

    // 蛇身
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i]
      const isHead = i === 0
      this.drawCell(seg, isHead ? COLOR_HEAD : COLOR_BODY)
    }

    // TODO Task 3: 画食物
    // TODO Task 6: 闪白叠加

    void food
    void flash

    ctx.restore()
  }

  private drawCell(p: Point, color: string): void {
    const cs = this.cellSize
    const ctx = this.ctx
    // 1px 内缩制造像素描边
    ctx.fillStyle = color
    ctx.fillRect(p.x * cs + 1, p.y * cs + 1, cs - 2, cs - 2)
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
