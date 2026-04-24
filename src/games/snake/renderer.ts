import type { Point } from './types'
import { COLS, ROWS, COLOR_BG, COLOR_BOARD_BG, COLOR_GRID, COLOR_HEAD, COLOR_BODY, COLOR_FOOD, COLOR_FLASH } from './constants'

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

    if (food) {
      this.drawCell(food, COLOR_FOOD)
    }

    if (flash && flash.on) {
      this.drawCell(flash.pos, COLOR_FLASH)
    }

    if (segments.length > 0) {
      const head = segments[0]
      // 眼睛：在头方格正中画 1×1 深色点（根据方向偏移）
      const cs = this.cellSize
      const cx = head.x * cs + cs / 2
      const cy = head.y * cs + cs / 2
      this.ctx.fillStyle = '#1A1A2E'
      this.ctx.fillRect(Math.floor(cx - 1), Math.floor(cy - 1), 2, 2)
    }

    ctx.restore()
  }

  private drawCell(p: Point, color: string): void {
    const cs = this.cellSize
    const ctx = this.ctx
    // 外圈深色描边（提升像素感）
    ctx.fillStyle = color
    ctx.fillRect(p.x * cs + 1, p.y * cs + 1, cs - 2, cs - 2)
    // 内亮高光（左上 1/3 区域）
    ctx.fillStyle = this.lighten(color)
    ctx.fillRect(p.x * cs + 2, p.y * cs + 2, Math.floor((cs - 4) / 3), Math.floor((cs - 4) / 3))
  }

  private lighten(hex: string): string {
    // 简单取高亮：RGB 每通道 +40 上限 255
    const n = parseInt(hex.slice(1), 16)
    const r = Math.min(255, ((n >> 16) & 0xff) + 40)
    const g = Math.min(255, ((n >> 8) & 0xff) + 40)
    const b = Math.min(255, (n & 0xff) + 40)
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
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
