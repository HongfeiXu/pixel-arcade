import type { Point } from './types'
import { COLS, ROWS, COLOR_BG, COLOR_BOARD_BG, COLOR_GRID, COLOR_HEAD, COLOR_BODY, COLOR_FOOD, COLOR_FLASH } from './constants'

type SnakePart = 'head' | 'body' | 'tail'

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
      const isTail = i === segments.length - 1
      const part: SnakePart = isHead ? 'head' : isTail ? 'tail' : 'body'
      const nextToTail = isTail ? segments[i - 1] : undefined
      this.drawSnakeCell(seg, part, nextToTail)
    }

    if (food) {
      this.drawCell(food, COLOR_FOOD)
    }

    if (flash && flash.on) {
      this.drawCell(flash.pos, COLOR_FLASH)
    }

    if (segments.length > 0) {
      this.drawEyes(segments)
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

  private drawSnakeCell(p: Point, part: SnakePart, nextToTail?: Point): void {
    if (part === 'tail') {
      this.drawCell(p, this.darken(COLOR_BODY, 34))
      this.drawTailTip(p, nextToTail)
      return
    }

    this.drawCell(p, part === 'head' ? COLOR_HEAD : COLOR_BODY)
  }

  private drawTailTip(tail: Point, nextToTail?: Point): void {
    if (!nextToTail) return

    const cs = this.cellSize
    const tip = Math.max(2, Math.floor(cs / 8))
    const dx = this.wrapDelta(tail.x - nextToTail.x)
    const dy = this.wrapDelta(tail.y - nextToTail.y)
    const x = tail.x * cs + (dx < 0 ? 3 : dx > 0 ? cs - 3 - tip : Math.floor(cs / 2 - tip / 2))
    const y = tail.y * cs + (dy < 0 ? 3 : dy > 0 ? cs - 3 - tip : Math.floor(cs / 2 - tip / 2))

    this.ctx.fillStyle = this.darken(COLOR_BODY, 70)
    this.ctx.fillRect(x, y, tip, tip)
  }

  private drawEyes(segments: Point[]): void {
    const head = segments[0]
    const neck = segments[1]
    const dx = neck ? this.wrapDelta(head.x - neck.x) : 1
    const dy = neck ? this.wrapDelta(head.y - neck.y) : 0
    const horizontal = Math.abs(dx) >= Math.abs(dy)
    const forward = horizontal ? Math.sign(dx || 1) : Math.sign(dy || 1)
    const cs = this.cellSize
    const baseX = head.x * cs
    const baseY = head.y * cs
    const eyeSize = Math.max(2, Math.floor(cs / 8))
    const front = Math.max(4, Math.floor(cs * 0.32))
    const side = Math.max(3, Math.floor(cs * 0.22))
    const center = Math.floor(cs / 2 - eyeSize / 2)

    const eyes = horizontal
      ? [
          { x: baseX + center + forward * front, y: baseY + center - side },
          { x: baseX + center + forward * front, y: baseY + center + side },
        ]
      : [
          { x: baseX + center - side, y: baseY + center + forward * front },
          { x: baseX + center + side, y: baseY + center + forward * front },
        ]

    this.ctx.fillStyle = '#1A1A2E'
    for (const eye of eyes) {
      this.ctx.fillRect(Math.round(eye.x), Math.round(eye.y), eyeSize, eyeSize)
    }
  }

  private lighten(hex: string): string {
    // 简单取高亮：RGB 每通道 +40 上限 255
    const n = parseInt(hex.slice(1), 16)
    const r = Math.min(255, ((n >> 16) & 0xff) + 40)
    const g = Math.min(255, ((n >> 8) & 0xff) + 40)
    const b = Math.min(255, (n & 0xff) + 40)
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  }

  private darken(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16)
    const r = Math.max(0, ((n >> 16) & 0xff) - amount)
    const g = Math.max(0, ((n >> 8) & 0xff) - amount)
    const b = Math.max(0, (n & 0xff) - amount)
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  }

  private wrapDelta(delta: number): number {
    if (delta > 1) return -1
    if (delta < -1) return 1
    return delta
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
