import type { GameAction, GameConfig, GameInstance, GameState, RewardKind } from '../types'
import { LEVELS, parseLevel } from './levels'
import type { Direction, PuzzleControls, PuzzleStatus } from './types'
import { renderBoard } from './renderer'

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right']
export class SokobanGame implements GameInstance, PuzzleControls {
  onReward?: (kind: RewardKind) => void
  onStateChange?: (state: GameState) => void
  onPuzzleChange?: (status: PuzzleStatus) => void
  private state: GameState = 'idle'
  private level = 0
  private completed = new Set<number>()
  private board = parseLevel(LEVELS[0])
  private history: Direction[] = []
  private canvas?: HTMLCanvasElement
  private config?: GameConfig

  init(canvas: HTMLCanvasElement, config: GameConfig) { this.canvas = canvas; this.config = config; this.render() }
  start() { this.restartLevel() }
  pause() { if (this.state === 'playing') this.setState('paused') }
  resume() { if (this.state === 'paused') this.setState('playing') }
  destroy() { this.canvas = undefined; this.config = undefined }
  getState() { return this.state }
  getScore() { return 0 }
  getBoard() { return { ...this.board, boxes: [...this.board.boxes], walls: new Set(this.board.walls), targets: new Set(this.board.targets) } }
  getPuzzleStatus(): PuzzleStatus {
    return { level: this.level, completed: [...this.completed].sort((a,b) => a-b), won: this.won(), canUndo: this.history.length > 0 }
  }
  selectLevel(level: number) {
    if (!Number.isInteger(level) || level < 0 || level >= LEVELS.length) return
    this.level = level
    this.restartLevel()
  }
  restartLevel() {
    this.board = parseLevel(LEVELS[this.level]); this.history = []
    this.setState('playing'); this.changed()
  }
  undo() {
    if (this.state !== 'playing' && this.state !== 'paused') return
    if (!this.history.length) return
    const remaining = this.history.slice(0, -1)
    this.board = parseLevel(LEVELS[this.level]); this.history = []
    for (const direction of remaining) { this.move(direction); this.history.push(direction) }
    this.changed()
  }
  onInput(action: GameAction) {
    if (this.state !== 'playing' || this.won() || !DIRECTIONS.includes(action as Direction)) return
    const direction = action as Direction
    const before = this.board.boxes.filter(box => this.board.targets.has(box)).length
    if (!this.move(direction)) return
    this.history.push(direction)
    if (this.won()) this.completed.add(this.level)
    this.changed()
    if (this.won()) this.onReward?.('victory')
    else if (this.board.boxes.filter(box => this.board.targets.has(box)).length > before) this.onReward?.('target')
  }
  saveState() { return JSON.stringify({ version: 1, level: this.level, completed: [...this.completed], history: this.history }) }
  loadState(data: string) {
    // 重放合法操作，不信任存档里的坐标；失败不影响当前游戏。
    try {
      const saved = JSON.parse(data) as { version: number; level: number; completed: number[]; history: Direction[] }
      if (!saved || saved.version !== 1 || !Number.isInteger(saved.level) || saved.level < 0 || saved.level >= LEVELS.length
        || !Array.isArray(saved.completed) || !saved.completed.every(i => Number.isInteger(i) && i >= 0 && i < LEVELS.length)
        || !Array.isArray(saved.history)) return
      const candidate = new SokobanGame()
      candidate.level = saved.level; candidate.board = parseLevel(LEVELS[saved.level])
      for (const direction of saved.history) {
        if (!DIRECTIONS.includes(direction) || candidate.won() || !candidate.move(direction)) return
      }
      this.level = saved.level; this.board = candidate.board; this.history = [...saved.history]
      this.completed = new Set(saved.completed)
      if (this.won()) this.completed.add(this.level)
      this.setState('playing'); this.changed()
    } catch { /* 损坏存档忽略，由页面回退到第一关 */ }
  }
  private move(direction: Direction): boolean {
    const { width, height, player, walls, boxes } = this.board
    const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
    const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0
    const adjacent = (pos: number) => {
      const x = pos % width + dx, y = Math.floor(pos / width) + dy
      return x < 0 || x >= width || y < 0 || y >= height ? -1 : y * width + x
    }
    const next = adjacent(player)
    if (next < 0 || walls.has(next)) return false
    const box = boxes.indexOf(next)
    if (box >= 0) {
      const beyond = adjacent(next)
      if (beyond < 0 || walls.has(beyond) || boxes.includes(beyond)) return false
      boxes[box] = beyond
    }
    this.board.player = next
    return true
  }
  private won() { return this.board.boxes.every(box => this.board.targets.has(box)) }
  private setState(state: GameState) { this.state = state; this.onStateChange?.(state) }
  private changed() { this.render(); this.onPuzzleChange?.(this.getPuzzleStatus()) }
  private render() { if (this.canvas && this.config) renderBoard(this.canvas, this.config, this.board) }
}
