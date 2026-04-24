import type { GameInstance, GameConfig, GameAction, GameState, SfxEvent } from '../types'
import type { Direction, Point, SnakeSavedState } from './types'
import { calcCellSize, COLS, ROWS, TICK_INTERVAL, TICK_INTERVAL_FAST, ACCEL_GAP_MAX, HOLD_ACCEL_DELAY, MAX_INPUT_QUEUE, FLASH_DURATION, SHAKE_DURATION, SHAKE_INTENSITY } from './constants'
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
  // 方向输入队列：每 tick 消费 1 个，支持快速连按两次形成 L/U 形转向
  // 去重与反向过滤以"队尾（或 direction）"为基准，避免 DAS 连发灌满
  private inputQueue: Direction[] = []
  private food: Point | null = null
  private renderer = new SnakeRenderer()

  // --- 时间驱动 ---
  private rafId = 0
  private lastTime = 0
  private accumulatedTime = 0

  // --- 加速心跳 ---
  // lastInputTime：上次方向输入时间戳；holdStartTime：当前按下序列起始时间戳
  // 单次 tap：两者相等，holdDuration=0 不触发 fastMode
  // 连按住：DAS 心跳每 150ms 刷 lastInputTime，holdStartTime 不变 → holdDuration 累积
  private lastInputTime = -Infinity
  private holdStartTime = -Infinity

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
    this.inputQueue = []
    this.food = spawnFood(this.segments)
    this.accumulatedTime = 0
    this.lastInputTime = -Infinity
    this.holdStartTime = -Infinity
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

    // XYAB 等价于 D-pad 四方向：y=上 a=下 x=左 b=右（和 tetris 系列对齐）
    let newDir: Direction | null = null
    switch (action) {
      case 'up':
      case 'y':
        newDir = 'up'; break
      case 'down':
      case 'a':
        newDir = 'down'; break
      case 'left':
      case 'x':
        newDir = 'left'; break
      case 'right':
      case 'b':
        newDir = 'right'; break
      default:
        return
    }

    // 以"队列末尾方向"（若空则 direction）作为判定基准，
    // 这样连按两次转向能正确排队（例如向上时按 右→下 形成 L 形）
    const opposite: Record<Direction, Direction> = {
      up: 'down', down: 'up', left: 'right', right: 'left',
    }
    const tail = this.inputQueue.length > 0
      ? this.inputQueue[this.inputQueue.length - 1]
      : this.direction
    // 和队尾一致：去重（DAS 连发同向会被吃掉，避免灌满）
    // 和队尾反向：掉头保护
    const shouldEnqueue =
      newDir !== tail
      && newDir !== opposite[tail]
      && this.inputQueue.length < MAX_INPUT_QUEUE
    if (shouldEnqueue) {
      this.inputQueue.push(newDir)
    }

    // 加速窗口追踪：距上次输入过久则视为新按下，重置 holdStartTime
    const now = performance.now()
    if (now - this.lastInputTime > ACCEL_GAP_MAX) {
      this.holdStartTime = now
    }
    this.lastInputTime = now
  }

  saveState(): string {
    const snapshot: SnakeSavedState = {
      version: 1,
      segments: this.segments.map(s => ({ x: s.x, y: s.y })),
      direction: this.direction,
      food: this.food!,  // 运行态下 food 必非空
      score: this.score,
    }
    return JSON.stringify(snapshot)
  }

  loadState(data: string): void {
    const s: SnakeSavedState = JSON.parse(data)
    if (s.version !== 1) return  // 不兼容旧版则丢弃
    this.segments = s.segments.map(p => ({ x: p.x, y: p.y }))
    this.direction = s.direction
    this.inputQueue = []
    this.food = s.food
    this.score = s.score
    this.accumulatedTime = 0
    this.lastInputTime = -Infinity
    this.holdStartTime = -Infinity
    this.flashPos = null
    this.flashTimer = 0
    this.shakeTimer = 0
    this.setState('playing')
    this.lastTime = performance.now()
    this.renderFrame()
    this.loop(this.lastTime)
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

  private update(delta: number, now: number): void {
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - delta)
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - delta)

    const stillHolding = now - this.lastInputTime < ACCEL_GAP_MAX
    const heldLongEnough = now - this.holdStartTime >= HOLD_ACCEL_DELAY
    const fastMode = stillHolding && heldLongEnough
    const interval = fastMode ? TICK_INTERVAL_FAST : TICK_INTERVAL

    this.accumulatedTime += delta
    while (this.accumulatedTime >= interval) {
      this.accumulatedTime -= interval
      this.tick()
      if (this.state !== 'playing') break
    }
  }

  private tick(): void {
    // 从队列取下一个方向（若有），否则保持当前
    const next = this.inputQueue.shift()
    if (next !== undefined) this.direction = next
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
      this.flashPos = { x: newHead.x, y: newHead.y }
      this.flashTimer = FLASH_DURATION
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
