import type { GameEntry } from './types'

export const gameRegistry: GameEntry[] = [
  {
    meta: {
      id: 'tetris',
      name: '俄罗斯方块',
      icon: '',
      status: 'coming_soon', // 游戏逻辑实现后改为 'active'
    },
    createInstance: () => {
      throw new Error('Tetris game not yet implemented')
    },
  },
]
