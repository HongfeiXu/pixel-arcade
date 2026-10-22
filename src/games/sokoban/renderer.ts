import type { GameConfig } from '../types'
import type { Board } from './levels'

export function renderBoard(canvas: HTMLCanvasElement, config: GameConfig, board: Board) {
  const size = Math.max(1, Math.floor(Math.min(config.width / board.width, config.height / board.height)))
  const w = size * board.width, h = size * board.height, dpr = config.devicePixelRatio || 1
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false
  // 每块地砖按 16×16 像素绘制，缩放到动态格子尺寸。
  for (let y = 0; y < board.height; y++) for (let x = 0; x < board.width; x++) {
    const pos = y * board.width + x
    ctx.save(); ctx.translate(x * size, y * size); ctx.scale(size / 16, size / 16)
    const rect = (color: string, a: number, b: number, c: number, d: number) => { ctx.fillStyle = color; ctx.fillRect(a,b,c,d) }
    rect('#c9bf9e',0,0,16,16); rect('#e7ddbb',1,1,14,14); rect('#d4c9a8',3,12,2,1)
    if (board.walls.has(pos)) {
      rect('#303a58',0,0,16,16); rect('#6e819b',1,1,14,6); rect('#52657f',1,9,6,6); rect('#52657f',9,9,6,6)
      rect('#92a0b4',2,1,12,1)
    } else {
      if (board.targets.has(pos)) {
        ctx.strokeStyle = '#61422e'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(8,3); ctx.lineTo(13,8); ctx.lineTo(8,13); ctx.lineTo(3,8); ctx.closePath(); ctx.stroke()
        rect('#61422e',7,7,2,2)
      }
      if (board.boxes.includes(pos)) {
        const done = board.targets.has(pos)
        rect('#513721',1,1,14,14); rect(done ? '#7dbd75' : '#d3954e',2,2,12,12)
        rect(done ? '#b4e49e' : '#f3c77a',3,3,10,1)
        ctx.strokeStyle = '#513721'; ctx.lineWidth = 1.5
        ctx.beginPath()
        if (done) { ctx.moveTo(4,8); ctx.lineTo(7,11); ctx.lineTo(12,5) }
        else { ctx.moveTo(4,5); ctx.lineTo(12,12); ctx.moveTo(12,5); ctx.lineTo(4,12) }
        ctx.stroke()
      }
      if (board.player === pos) {
        rect('#283653',4,12,3,3); rect('#283653',9,12,3,3)
        rect('#237da4',4,8,8,5); rect('#ffd2a0',5,3,7,6); rect('#e14e4e',4,2,9,3)
        rect('#283653',6,5,1,2); rect('#283653',10,5,1,2); rect('#fff1cf',7,8,3,1)
      }
    }
    ctx.restore()
  }
}
