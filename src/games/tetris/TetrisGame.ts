import type { GameInstance, GameConfig, GameAction, GameState } from '../types'
import type { Piece, Board, PieceType } from './types'
import {
  COLS, calcCellSize,
  DROP_INTERVAL, SOFT_DROP_INTERVAL, LOCK_DELAY, MAX_LOCK_MOVES,
  SPAWN_X, SPAWN_Y,
} from './constants'
import { ALL_PIECE_TYPES, getShape } from './pieces'
import { createBoard, isValidPosition, lockPiece, findFullRows, removeRows, isGameOver } from './board'
import { PieceBag } from './bag'
import { TetrisRenderer } from './renderer'

export interface TetrisOptions {
  pieceTypes?: PieceType[]
}

export class TetrisGame implements GameInstance {
  // --- GameInstance 回调 ---
  onScoreChange?: (score: number) => void
  onGameOver?: (finalScore: number) => void
  onStateChange?: (state: GameState) => void

  // --- 配置 ---
  private pieceTypes: PieceType[]

  // --- 内部状态 ---
  private state: GameState = 'idle'
  private score = 0
  private board: Board = createBoard()
  private currentPiece: Piece | null = null
  private bag!: PieceBag
  private renderer = new TetrisRenderer()

  constructor(options?: TetrisOptions) {
    this.pieceTypes = options?.pieceTypes ?? ALL_PIECE_TYPES
  }

  // --- 时间驱动 ---
  private rafId = 0
  private lastTime = 0
  private dropTimer = 0
  private lockTimer = 0
  private isLocking = false
  private lockMoves = 0
  private softDropping = false

  // --- 消行动画 ---
  private animating = false
  private animRows: number[] = []
  private animTimer = 0
  // 闪烁时序：on(60) off(60) on(60) off(60) on(80) = 总 320ms
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

    switch (action) {
      case 'left':
      case 'x':
        this.movePiece(-1, 0)
        break
      case 'right':
      case 'b':
        this.movePiece(1, 0)
        break
      case 'down':
      case 'a':
        this.softDropping = true
        this.dropTimer = SOFT_DROP_INTERVAL // 立即触发一次下落
        break
      case 'up':
      case 'y':
        this.rotatePiece()
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

    const delta = Math.min(now - this.lastTime, 200) // 上限 200ms 兜底
    this.lastTime = now

    this.update(delta)
    this.renderFrame()

    this.rafId = requestAnimationFrame(this.loop)
  }

  private update(delta: number): void {
    // 消行动画期间跳过正常下落逻辑
    if (this.animating) {
      this.updateAnimation(delta)
      return
    }

    if (!this.currentPiece) return

    const dropInterval = this.softDropping ? SOFT_DROP_INTERVAL : DROP_INTERVAL

    if (this.isLocking) {
      // 锁定延迟计时
      this.lockTimer += delta
      if (this.lockTimer >= LOCK_DELAY) {
        this.lock()
      }
    } else {
      // 正常下落计时
      this.dropTimer += delta
      if (this.dropTimer >= dropInterval) {
        this.dropTimer -= dropInterval
        this.dropOne()
      }
    }
  }

  private updateAnimation(delta: number): void {
    this.animTimer += delta

    // 震屏衰减
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - delta)
    }

    // 动画结束
    if (this.animTimer >= TetrisGame.ANIM_TOTAL) {
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

  /** 判断当前动画帧是否处于闪白阶段（奇数段 = 原色，偶数段 = 闪白） */
  private isAnimFlashOn(): boolean {
    let elapsed = 0
    for (let i = 0; i < TetrisGame.ANIM_PHASES.length; i++) {
      elapsed += TetrisGame.ANIM_PHASES[i]
      if (this.animTimer < elapsed) return i % 2 === 0 // 0,2,4 = 闪白
    }
    return false
  }

  // ========== 方块操作 ==========

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

      // Move Reset 规则：锁定期间移动可重置计时器，但有次数上限
      if (this.isLocking) {
        if (isValidPosition(this.board, this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation)) {
          // 脱离底部，取消锁定
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

  private rotatePiece(): void {
    if (!this.currentPiece || this.currentPiece.type === 'O') return

    const newRotation = (this.currentPiece.rotation + 1) % 4
    const piece = this.currentPiece

    // 简化 SRS wall kick：3 个测试位（tetris.md #Wall Kick 规则）
    const kicks = this.getWallKicks(piece, newRotation)

    for (const [dx, dy] of kicks) {
      if (isValidPosition(this.board, piece, piece.x + dx, piece.y + dy, newRotation)) {
        piece.x += dx
        piece.y += dy
        piece.rotation = newRotation

        // Move Reset 规则：旋转也计入操作次数
        if (this.isLocking) {
          if (isValidPosition(this.board, piece, piece.x, piece.y + 1, piece.rotation)) {
            this.isLocking = false
            this.lockTimer = 0
            this.lockMoves = 0
          } else {
            this.lockMoves++
            if (this.lockMoves >= MAX_LOCK_MOVES) {
              this.lock()
              return
            }
            this.lockTimer = 0
          }
        }
        return
      }
    }
    // 所有测试位失败，旋转不生效
  }

  /** 获取 wall kick 测试位（简化 SRS） */
  private getWallKicks(piece: Piece, _newRotation: number): [number, number][] {
    const kicks: [number, number][] = [[0, 0]] // 测试 1：原位

    // 测试 2：水平偏移
    const isI = piece.type === 'I'
    const maxOffset = isI ? 2 : 1

    // 判断靠近哪个墙壁
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
      // 靠左墙，向右偏移
      for (let i = 1; i <= maxOffset; i++) kicks.push([i, 0])
    } else if (rightEdge >= COLS - 1) {
      // 靠右墙，向左偏移
      for (let i = 1; i <= maxOffset; i++) kicks.push([-i, 0])
    } else {
      // 都不靠，先左后右
      kicks.push([-1, 0])
      kicks.push([1, 0])
    }

    // 测试 3：向上偏移 1 格
    kicks.push([0, -1])

    return kicks
  }

  private dropOne(): void {
    if (!this.currentPiece) return

    if (isValidPosition(this.board, this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation)) {
      this.currentPiece.y++
    } else {
      // 触底，开始锁定延迟
      this.isLocking = true
      this.lockTimer = 0
      this.lockMoves = 0
    }
  }

  private lock(): void {
    if (!this.currentPiece) return

    lockPiece(this.board, this.currentPiece)

    // 检测满行
    const fullRows = findFullRows(this.board)

    // 重置锁定状态
    this.isLocking = false
    this.lockTimer = 0
    this.lockMoves = 0
    this.dropTimer = 0
    this.softDropping = false

    if (fullRows.length > 0) {
      // 进入动画阶段
      this.animating = true
      this.animRows = fullRows
      this.animTimer = 0
      this.currentPiece = null // 动画期间隐藏当前方块
      // 震屏：2 行以上触发
      if (fullRows.length >= 2) {
        this.shakeIntensity = fullRows.length // 2~4px
        this.shakeTimer = 150 + fullRows.length * 50
      }
    } else {
      this.afterClear()
    }
  }

  /** 消行（或无消行）后的收尾：生成新方块或 Game Over */
  private afterClear(): void {
    const newPiece = this.spawnPiece()
    if (isGameOver(this.board, newPiece)) {
      this.currentPiece = null
      this.setState('over')
      cancelAnimationFrame(this.rafId)
      this.renderFrame()
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
    // 计算震屏偏移
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
