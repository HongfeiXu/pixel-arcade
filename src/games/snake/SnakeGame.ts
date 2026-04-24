import type { GameInstance, GameConfig, GameAction, GameState, SfxEvent } from '../types'
import type { Direction, Point } from './types'
import { calcCellSize, COLS, ROWS, TICK_INTERVAL, SHAKE_DURATION, SHAKE_INTENSITY } from './constants'
import { spawnFood } from './food'
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
    this.food = spawnFood(this.segments)
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

  onInput(action: GameAction): void {
    if (this.state !== 'playing') return

    switch (action) {
      case 'up':
        if (this.direction !== 'down') this.pendingDirection = 'up'
        break
      case 'down':
        if (this.direction !== 'up') this.pendingDirection = 'down'
        break
      case 'left':
        if (this.direction !== 'right') this.pendingDirection = 'left'
        break
      case 'right':
        if (this.direction !== 'left') this.pendingDirection = 'right'
        break
      // a/b/x/y Task 5 填充
    }
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
    const delta = Math.min(now - this.lastTime, 200)
    this.lastTime = now

    if (this.state === 'playing') {
      this.update(delta, now)
    } else if (this.state === 'over' && this.shakeTimer > 0) {
      // 仅衰减震屏计时，不推 tick
      this.shakeTimer = Math.max(0, this.shakeTimer - delta)
    } else {
      return
    }

    this.renderFrame()

    if (this.state === 'playing' || (this.state === 'over' && this.shakeTimer > 0)) {
      this.rafId = requestAnimationFrame(this.loop)
    }
  }

  private update(delta: number, _now: number): void {
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - delta)

    this.accumulatedTime += delta
    const interval = TICK_INTERVAL  // Task 5 改成 fastMode 三元
    void this.lastAccelTime
    while (this.accumulatedTime >= interval) {
      this.accumulatedTime -= interval
      this.tick()
      if (this.state !== 'playing') break
    }
  }

  private tick(): void {
    this.direction = this.pendingDirection
    const head = this.segments[0]
    const d = this.direction
    const dx = d === 'left' ? -1 : d === 'right' ? 1 : 0
    const dy = d === 'up' ? -1 : d === 'down' ? 1 : 0
    const newHead: Point = {
      x: (head.x + dx + COLS) % COLS,
      y: (head.y + dy + ROWS) % ROWS,
    }
    const willEat = this.food !== null && newHead.x === this.food.x && newHead.y === this.food.y

    // 判定 body：若本 tick 会吃到食物，蛇不弹尾；否则尾部让开
    const body = willEat
      ? this.segments
      : this.segments.slice(0, -1)
    for (const s of body) {
      if (s.x === newHead.x && s.y === newHead.y) {
        this.onSfx?.('gameOver')
        this.shakeTimer = SHAKE_DURATION
        this.setState('over')
        cancelAnimationFrame(this.rafId)
        this.onGameOver?.(this.score)
        return
      }
    }

    this.segments.unshift(newHead)
    if (willEat) {
      this.score++
      this.onScoreChange?.(this.score)
      this.onSfx?.('lineClear')
      this.food = spawnFood(this.segments)
    } else {
      this.segments.pop()
    }
  }

  private renderFrame(): void {
    let shake: { x: number; y: number } | null = null
    if (this.shakeTimer > 0) {
      const intensity = (this.shakeTimer / SHAKE_DURATION) * SHAKE_INTENSITY
      shake = {
        x: (Math.random() - 0.5) * 2 * intensity,
        y: (Math.random() - 0.5) * 2 * intensity,
      }
    }
    const flash = this.flashPos && this.flashTimer > 0
      ? { pos: this.flashPos, on: true }
      : null
    this.renderer.render(this.segments, this.food, flash, shake)
  }
}
