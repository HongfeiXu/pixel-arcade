import type { GameInstance, GameConfig, GameAction, GameState, SfxEvent } from '../types'
import type { Direction, Point } from './types'
import { calcCellSize } from './constants'
import { SnakeRenderer } from './renderer'

export class SnakeGame implements GameInstance {
  // --- 回调 ---
  onScoreChange?: (score: number) => void
  onGameOver?: (finalScore: number) => void
  onStateChange?: (state: GameState) => void
  onSfx?: (event: SfxEvent) => void

  // --- 状态 ---
  private state: GameState = 'idle'
  private score = 0
  private segments: Point[] = []
  private direction: Direction = 'right'
  private pendingDirection: Direction = 'right'
  private food: Point | null = null
  private renderer = new SnakeRenderer()

  // --- 时间驱动 ---
  private rafId = 0
  private lastTime = 0
  private accumulatedTime = 0

  // --- 加速心跳 ---
  private lastAccelTime = -Infinity

  // --- 视觉反馈 ---
  private flashPos: Point | null = null
  private flashTimer = 0
  private shakeTimer = 0

  init(canvas: HTMLCanvasElement, config: GameConfig): void {
    const cellSize = calcCellSize(config.width, config.height)
    this.renderer.init(canvas, cellSize, config.devicePixelRatio)
    this.renderFrame()
  }

  start(): void {
    this.score = 0
    this.segments = [
      { x: 8, y: 7 },
      { x: 7, y: 7 },
      { x: 6, y: 7 },
    ]
    this.direction = 'right'
    this.pendingDirection = 'right'
    this.food = null  // Task 3 填入
    this.accumulatedTime = 0
    this.lastAccelTime = -Infinity
    this.flashPos = null
    this.flashTimer = 0
    this.shakeTimer = 0
    this.setState('playing')
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  pause(): void {
    if (this.state !== 'playing') return
    this.setState('paused')
    cancelAnimationFrame(this.rafId)
  }

  resume(): void {
    if (this.state !== 'paused') return
    this.setState('playing')
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId)
  }

  getState(): GameState { return this.state }
  getScore(): number { return this.score }

  onInput(_action: GameAction): void {
    // Task 2 / Task 5 填充
  }

  saveState(): string {
    // Task 7 填充
    return '{}'
  }

  loadState(_data: string): void {
    // Task 7 填充
  }

  // --- 内部 ---

  private setState(s: GameState): void {
    this.state = s
    this.onStateChange?.(s)
  }

  private loop = (now: number): void => {
    if (this.state !== 'playing') return
    const delta = Math.min(now - this.lastTime, 200)
    this.lastTime = now
    this.update(delta, now)
    this.renderFrame()
    this.rafId = requestAnimationFrame(this.loop)
  }

  private update(_delta: number, _now: number): void {
    // Task 2 填充：推进 tick
    void this.direction
    void this.pendingDirection
    void this.accumulatedTime
    void this.lastAccelTime
  }

  private renderFrame(): void {
    const shake = this.shakeTimer > 0
      ? { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }
      : null
    const flash = this.flashPos && this.flashTimer > 0
      ? { pos: this.flashPos, on: true }
      : null
    this.renderer.render(this.segments, this.food, flash, shake)
  }
}
