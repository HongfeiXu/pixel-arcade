import type { GameEntry } from './types'
import { TetrisGame } from './tetris/TetrisGame'

export const gameRegistry: GameEntry[] = [
  {
    meta: {
      id: 'tetris',
      name: '俄罗斯方块',
      icon: '',
      status: 'active',
    },
    createInstance: () => new TetrisGame(),
  },
]
