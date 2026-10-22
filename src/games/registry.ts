import type { GameEntry } from './types'
import { TetrisGame } from './tetris/TetrisGame'
import { EASY_PIECE_TYPES } from './tetris/pieces'
import { AntiGravityGame } from './anti-gravity/AntiGravityGame'
import { SnakeGame } from './snake/SnakeGame'
import { SokobanGame } from './sokoban/SokobanGame'

export const gameRegistry: GameEntry[] = [
  {
    meta: {
      id: 'tetris-easy',
      name: '俄罗斯方块（简单）',
      icon: 'tetris-easy',
      status: 'active',
    },
    createInstance: () => new TetrisGame({ pieceTypes: EASY_PIECE_TYPES }),
  },
  {
    meta: {
      id: 'tetris',
      name: '俄罗斯方块',
      icon: 'tetris',
      status: 'active',
    },
    createInstance: () => new TetrisGame(),
  },
  {
    meta: {
      id: 'anti-gravity',
      name: '反重力方块',
      icon: 'anti-gravity',
      status: 'active',
    },
    createInstance: () => new AntiGravityGame(),
  },
  {
    meta: {
      id: 'snake',
      name: '贪吃蛇',
      icon: 'snake',
      status: 'active',
    },
    createInstance: () => new SnakeGame(),
  },
  {
    meta: { id: 'sokoban', name: '推箱子', icon: 'sokoban', status: 'active', description: '24 关 · 经典仓库' },
    createInstance: () => new SokobanGame(),
  },
]
