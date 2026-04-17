import type { GameInstance, GameConfig, GameAction, GameState, SfxEvent } from '../types'
import type { Piece, Board, PieceType } from './types'
import {
  COLS, calcCellSize,
  DROP_INTERVAL, SOFT_DROP_INTERVAL, LOCK_DELAY, MAX_LOCK_MOVES,
  SPAWN_X, SPAWN_Y,
} from './constants'
import { ALL_PIECE_TYPES, getShape } from './pieces'
import { createBoard, isValidPosition, lockPiece, findFullRows, removeRows, isGameOver } from './board'
import { PieceBag } from './bag'
import { AntiGravityRenderer } from './renderer'

export interface AntiGravityOptions {
  pieceTypes?: PieceType[]
}

export class AntiGravityGame implements GameInstance {
  // --- GameInstance 回调 ---
  onScoreChange?: (score: number) => void
  onGameOver?: (finalScore: number) => void
  onStateChange?: (state: GameState) => void
  onSfx?: (event: SfxEvent) => void

  // --- 配置 ---
  private pieceTypes: PieceType[]

  // --- 内部状态 ---
  private state: GameState = 'idle'
  private score = 0
  private board: Board = createBoard()
  private currentPiece: Piece | null = null
  private bag!: PieceBag
  private renderer = new AntiGravityRenderer()

  constructor(options?: AntiGravityOptions) {
    this.pieceTypes = options?.pieceTypes ?? ALL_PIECE_TYPES
  }

  // --- 时间驱动 ---
  private rafId = 0
  private lastTime = 0
  private dropTimer = 0
  private lockTimer = 0
  private isLocking = false
  private lockMoves = 0
  // softDropping 的语义：速升（持续向上加速），命名保留以保持接口稳定
  private softDropping = false

  // --- 消行动画 ---
  private animating = false
  private animRows: number[] = []
  private animTimer = 0
  private static readonly ANIM_PHASES = [60, 60, 60, 60, 80]
  private static readonly ANIM_TOTAL = 320

  // --- 震屏 ---
  private shakeTimer = 0
  private shakeIntensity = 0

  // ========== GameInstance 接口 ==========

  init(canvas: HTMLCanvasElement, config: GameConfig): void {
    const dpr = config.devicePixelRatio
    const cellSize = calcCellSize(config.width, config.height)

    this.renderer.init(canvas, cellSize, dpr)
    this.renderFrame()
  }

  start(): void {
    this.board = createBoard()
    this.score = 0
    this.bag = new PieceBag(this.pieceTypes)
    this.dropTimer = 0
    this.lockTimer = 0
    this.isLocking = false
    this.lockMoves = 0
    this.softDropping = false
    this.currentPiece = this.spawnPiece()
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

  getState(): GameState {
    return this.state
  }

  getScore(): number {
    return this.score
  }

  getNextPieceType(): string | null {
    return this.bag?.peek() ?? null
  }

  onInput(action: GameAction): void {
    if (this.state !== 'playing' || !this.currentPiece || this.animating) return

    // XYAB 与 D-pad 方向一一对应：X/左、B/右、Y/上（速升）、A/下（旋转）
    switch (action) {
      case 'left':
      case 'x':
        if (this.movePiece(-1, 0)) this.onSfx?.('move')
        break
      case 'right':
      case 'b':
        if (this.movePiece(1, 0)) this.onSfx?.('move')
        break
      case 'up':
      case 'y':
        // 速升（softDrop 事件语义复用，"加速朝重力方向运动"）
        if (!this.softDropping) this.onSfx?.('softDrop')
        this.softDropping = true
        this.dropTimer = SOFT_DROP_INTERVAL
        break
      case 'down':
      case 'a':
        if (this.rotatePiece()) this.onSfx?.('rotate')
        break
    }
  }

  saveState(): string {
    return JSON.stringify({
      board: this.board,
      currentPiece: this.currentPiece,
      score: this.score,
      bag: this.bag.serialize(),
      dropTimer: this.dropTimer,
      lockTimer: this.lockTimer,
      isLocking: this.isLocking,
      lockMoves: this.lockMoves,
    })
  }

  loadState(data: string): void {
    const s = JSON.parse(data)
    this.board = s.board
    this.currentPiece = s.currentPiece
    this.score = s.score
    this.bag = new PieceBag(this.pieceTypes)
    this.bag.deserialize(s.bag)
    this.dropTimer = s.dropTimer
    this.lockTimer = s.lockTimer
    this.isLocking = s.isLocking
    this.lockMoves = s.lockMoves ?? 0
    this.softDropping = false
    this.setState('playing')
    this.lastTime = performance.now()
    this.renderFrame()
    this.loop(this.lastTime)
  }

  // ========== 游戏循环 ==========

  private loop = (now: number): void => {
    if (this.state !== 'playing') return

    const delta = Math.min(now - this.lastTime, 200)
    this.lastTime = now

    this.update(delta)
    this.renderFrame()

    this.rafId = requestAnimationFrame(this.loop)
  }

  private update(delta: number): void {
    if (this.animating) {
      this.updateAnimation(delta)
      return
    }

    if (!this.currentPiece) return

    const dropInterval = this.softDropping ? SOFT_DROP_INTERVAL : DROP_INTERVAL

    if (this.isLocking) {
      this.lockTimer += delta
      if (this.lockTimer >= LOCK_DELAY) {
        this.lock()
      }
    } else {
      this.dropTimer += delta
      if (this.dropTimer >= dropInterval) {
        this.dropTimer -= dropInterval
        this.dropOne()
      }
    }
  }

  private updateAnimation(delta: number): void {
    this.animTimer += delta

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - delta)
    }

    if (this.animTimer >= AntiGravityGame.ANIM_TOTAL) {
      this.animating = false
      this.score += this.animRows.length
      this.onScoreChange?.(this.score)
      removeRows(this.board, this.animRows)
      this.animRows = []
      this.shakeTimer = 0
      this.shakeIntensity = 0
      this.afterClear()
    }
  }

  private isAnimFlashOn(): boolean {
    let elapsed = 0
    for (let i = 0; i < AntiGravityGame.ANIM_PHASES.length; i++) {
      elapsed += AntiGravityGame.ANIM_PHASES[i]
      if (this.animTimer < elapsed) return i % 2 === 0
    }
    return false
  }

  // ========== 方块操作（方向反转）==========

  private spawnPiece(): Piece {
    const type = this.bag.next()
    return { type, rotation: 0, x: SPAWN_X, y: SPAWN_Y }
  }

  private movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false
    const newX = this.currentPiece.x + dx
    const newY = this.currentPiece.y + dy

    if (isValidPosition(this.board, this.currentPiece, newX, newY, this.currentPiece.rotation)) {
      this.currentPiece.x = newX
      this.currentPiece.y = newY

      if (this.isLocking) {
        // Move Reset：反向版检测 y - 1 是否有效（即是否脱离"顶部"）
        if (isValidPosition(this.board, this.currentPiece, this.currentPiece.x, this.currentPiece.y - 1, this.currentPiece.rotation)) {
          this.isLocking = false
          this.lockTimer = 0
          this.lockMoves = 0
        } else {
          this.lockMoves++
          if (this.lockMoves >= MAX_LOCK_MOVES) {
            this.lock()
            return true
          }
          this.lockTimer = 0
        }
      }
      return true
    }
    return false
  }

  private rotatePiece(): boolean {
    if (!this.currentPiece || this.currentPiece.type === 'O') return false

    const newRotation = (this.currentPiece.rotation + 1) % 4
    const piece = this.currentPiece

    const kicks = this.getWallKicks(piece, newRotation)

    for (const [dx, dy] of kicks) {
      if (isValidPosition(this.board, piece, piece.x + dx, piece.y + dy, newRotation)) {
        piece.x += dx
        piece.y += dy
        piece.rotation = newRotation

        if (this.isLocking) {
          if (isValidPosition(this.board, piece, piece.x, piece.y - 1, piece.rotation)) {
            this.isLocking = false
            this.lockTimer = 0
            this.lockMoves = 0
          } else {
            this.lockMoves++
            if (this.lockMoves >= MAX_LOCK_MOVES) {
              this.lock()
              return true
            }
            this.lockTimer = 0
          }
        }
        return true
      }
    }
    return false
  }

  /** Wall kick 测试位（反向版：第三测试位 [0, +1]） */
  private getWallKicks(piece: Piece, _newRotation: number): [number, number][] {
    const kicks: [number, number][] = [[0, 0]]

    const isI = piece.type === 'I'
    const maxOffset = isI ? 2 : 1

    const shape = getShape(piece.type, piece.rotation)
    let minCol = shape[0].length
    let maxCol = 0
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          minCol = Math.min(minCol, c)
          maxCol = Math.max(maxCol, c)
        }
      }
    }
    const leftEdge = piece.x + minCol
    const rightEdge = piece.x + maxCol

    if (leftEdge <= 0) {
      for (let i = 1; i <= maxOffset; i++) kicks.push([i, 0])
    } else if (rightEdge >= COLS - 1) {
      for (let i = 1; i <= maxOffset; i++) kicks.push([-i, 0])
    } else {
      kicks.push([-1, 0])
      kicks.push([1, 0])
    }

    // 反向版：第三测试位向下偏移 1 格（标准版是向上）
    kicks.push([0, 1])

    return kicks
  }

  private dropOne(): void {
    if (!this.currentPiece) return

    // 反向版：y-- 取代 y++
    if (isValidPosition(this.board, this.currentPiece, this.currentPiece.x, this.currentPiece.y - 1, this.currentPiece.rotation)) {
      this.currentPiece.y--
    } else {
      this.isLocking = true
      this.lockTimer = 0
      this.lockMoves = 0
    }
  }

  private lock(): void {
    if (!this.currentPiece) return

    lockPiece(this.board, this.currentPiece)

    const fullRows = findFullRows(this.board)

    this.isLocking = false
    this.lockTimer = 0
    this.lockMoves = 0
    this.dropTimer = 0
    this.softDropping = false

    if (fullRows.length > 0) {
      this.animating = true
      this.animRows = fullRows
      this.animTimer = 0
      this.currentPiece = null
      this.onSfx?.(fullRows.length >= 4 ? 'tetris' : 'lineClear')
      if (fullRows.length >= 2) {
        this.shakeIntensity = fullRows.length
        this.shakeTimer = 150 + fullRows.length * 50
      }
    } else {
      this.afterClear()
    }
  }

  private afterClear(): void {
    const newPiece = this.spawnPiece()
    if (isGameOver(this.board, newPiece)) {
      this.currentPiece = null
      this.setState('over')
      cancelAnimationFrame(this.rafId)
      this.renderFrame()
      this.onSfx?.('gameOver')
      this.onGameOver?.(this.score)
    } else {
      this.currentPiece = newPiece
    }
  }

  // ========== 辅助 ==========

  private setState(newState: GameState): void {
    this.state = newState
    this.onStateChange?.(newState)
  }

  private renderFrame(): void {
    let shake: { x: number; y: number } | undefined
    if (this.shakeTimer > 0 && this.shakeIntensity > 0) {
      const t = this.shakeTimer / (150 + this.shakeIntensity * 50)
      const intensity = this.shakeIntensity * t
      shake = {
        x: (Math.random() * 2 - 1) * intensity,
        y: (Math.random() * 2 - 1) * intensity,
      }
    }

    this.renderer.render(
      this.board,
      this.currentPiece,
      this.animating ? this.animRows : undefined,
      this.animating ? this.isAnimFlashOn() : undefined,
      shake,
    )
  }
}
