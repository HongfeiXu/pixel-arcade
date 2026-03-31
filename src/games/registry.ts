import type { GameEntry } from './types'
import { TetrisGame } from './tetris/TetrisGame'
import { EASY_PIECE_TYPES } from './tetris/pieces'

export const gameRegistry: GameEntry[] = [
  {
    meta: {
      id: 'tetris-easy',
      name: '俄罗斯方块（简单）',
      icon: '',
      status: 'active',
    },
    createInstance: () => new TetrisGame({ pieceTypes: EASY_PIECE_TYPES }),
  },
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
