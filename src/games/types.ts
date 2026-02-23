export interface GameMeta {
  id: string
  name: string
  icon: string
  status: 'active' | 'coming_soon'
  description?: string
}

export type GameAction = 'left' | 'right' | 'down' | 'drop' | 'rotate' | 'pause'

export type GameState = 'idle' | 'playing' | 'paused' | 'over'

export interface GameConfig {
  width: number
  height: number
  devicePixelRatio: number
  soundEnabled: boolean
}

export interface GameInstance {
  // 生命周期
  init(canvas: HTMLCanvasElement, config: GameConfig): void
  start(): void
  pause(): void
  resume(): void
  destroy(): void

  // 状态
  getState(): GameState
  getScore(): number
  getNextPieceType?(): string | null

  // 操控输入
  onInput(action: GameAction): void

  // 事件回调
  onScoreChange?: (score: number) => void
  onGameOver?: (finalScore: number) => void
  onStateChange?: (state: GameState) => void

  // 存档（仅序列化/反序列化，不直接读写 localStorage）
  saveState(): string
  loadState(data: string): void
}

export interface GameEntry {
  meta: GameMeta
  createInstance: () => GameInstance
}
