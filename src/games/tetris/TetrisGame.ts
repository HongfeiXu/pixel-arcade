import type { GameInstance, GameConfig, GameAction, GameState } from '../types'
import type { Piece, Board } from './types'
import {
  COLS, calcCellSize,
  DROP_INTERVAL, SOFT_DROP_INTERVAL, LOCK_DELAY,
  SPAWN_X, SPAWN_Y,
} from './constants'
import { getShape } from './pieces'
import { createBoard, isValidPosition, lockPiece, clearLines, isGameOver, getGhostY } from './board'
import { PieceBag } from './bag'
import { TetrisRenderer } from './renderer'

export class TetrisGame implements GameInstance {
  // --- GameInstance 回调 ---
  onScoreChange?: (score: number) => void
  onGameOver?: (finalScore: number) => void
  onStateChange?: (state: GameState) => void

  // --- 内部状态 ---
  private state: GameState = 'idle'
  private score = 0
  private board: Board = createBoard()
  private currentPiece: Piece | null = null
  private bag = new PieceBag()
  private renderer = new TetrisRenderer()

  // --- 时间驱动 ---
  private rafId = 0
  private lastTime = 0
  private dropTimer = 0
  private lockTimer = 0
  private isLocking = false
  private softDropping = false

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
    this.bag = new PieceBag()
    this.dropTimer = 0
    this.lockTimer = 0
    this.isLocking = false
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
    return this.bag.peek()
  }

  onInput(action: GameAction): void {
    if (this.state !== 'playing' || !this.currentPiece) return

    switch (action) {
      case 'left':
        this.movePiece(-1, 0)
        break
      case 'right':
        this.movePiece(1, 0)
        break
      case 'down':
        this.softDropping = true
        this.dropTimer = SOFT_DROP_INTERVAL // 立即触发一次下落
        break
      case 'drop':
        this.hardDrop()
        break
      case 'rotate':
        this.rotatePiece()
        break
      case 'pause':
        this.pause()
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
    })
  }

  loadState(data: string): void {
    const s = JSON.parse(data)
    this.board = s.board
    this.currentPiece = s.currentPiece
    this.score = s.score
    this.bag.deserialize(s.bag)
    this.dropTimer = s.dropTimer
    this.lockTimer = s.lockTimer
    this.isLocking = s.isLocking
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

      // 如果在锁定延迟期间成功移动，重置锁定计时器
      if (this.isLocking) {
        // 检查是否还在底部
        if (isValidPosition(this.board, this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation)) {
          this.isLocking = false
          this.lockTimer = 0
        } else {
          this.lockTimer = 0 // 重置计时但保持锁定状态
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

        // 旋转成功，重置锁定计时
        if (this.isLocking) {
          if (isValidPosition(this.board, piece, piece.x, piece.y + 1, piece.rotation)) {
            this.isLocking = false
            this.lockTimer = 0
          } else {
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
    }
  }

  private hardDrop(): void {
    if (!this.currentPiece) return
    this.currentPiece.y = getGhostY(this.board, this.currentPiece)
    this.lock()
  }

  private lock(): void {
    if (!this.currentPiece) return

    lockPiece(this.board, this.currentPiece)

    // 消行
    const cleared = clearLines(this.board)
    if (cleared > 0) {
      this.score += cleared
      this.onScoreChange?.(this.score)
    }

    // 重置状态
    this.isLocking = false
    this.lockTimer = 0
    this.dropTimer = 0
    this.softDropping = false

    // 生成新方块
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
    this.renderer.render(this.board, this.currentPiece)
  }
}
