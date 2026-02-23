import type { PieceType } from './types'

/**
 * 方块形状定义（tetris.md #方块定义）
 * 每种方块有 4 个旋转态（O 型 4 态相同），用二维布尔矩阵表示。
 * 矩阵 [row][col]，true 表示有方块。
 */

type Shape = boolean[][]

export const PIECE_SHAPES: Record<PieceType, Shape[]> = {
  // I 型（长条）— 4×4 bounding box
  I: [
    // 0°
    [
      [false, false, false, false],
      [true,  true,  true,  true],
      [false, false, false, false],
      [false, false, false, false],
    ],
    // 90°
    [
      [false, false, true, false],
      [false, false, true, false],
      [false, false, true, false],
      [false, false, true, false],
    ],
    // 180°
    [
      [false, false, false, false],
      [false, false, false, false],
      [true,  true,  true,  true],
      [false, false, false, false],
    ],
    // 270°
    [
      [false, true, false, false],
      [false, true, false, false],
      [false, true, false, false],
      [false, true, false, false],
    ],
  ],

  // O 型（方块）— 2×2，旋转不变
  O: [
    [
      [true, true],
      [true, true],
    ],
    [
      [true, true],
      [true, true],
    ],
    [
      [true, true],
      [true, true],
    ],
    [
      [true, true],
      [true, true],
    ],
  ],

  // T 型 — 3×3
  T: [
    // 0°
    [
      [false, true, false],
      [true,  true, true],
      [false, false, false],
    ],
    // 90°
    [
      [false, true, false],
      [false, true, true],
      [false, true, false],
    ],
    // 180°
    [
      [false, false, false],
      [true,  true,  true],
      [false, true,  false],
    ],
    // 270°
    [
      [false, true, false],
      [true,  true, false],
      [false, true, false],
    ],
  ],

  // L 型 — 3×3
  L: [
    // 0°
    [
      [false, false, true],
      [true,  true,  true],
      [false, false, false],
    ],
    // 90°
    [
      [false, true, false],
      [false, true, false],
      [false, true, true],
    ],
    // 180°
    [
      [false, false, false],
      [true,  true,  true],
      [true,  false, false],
    ],
    // 270°
    [
      [true,  true, false],
      [false, true, false],
      [false, true, false],
    ],
  ],

  // J 型 — 3×3
  J: [
    // 0°
    [
      [true,  false, false],
      [true,  true,  true],
      [false, false, false],
    ],
    // 90°
    [
      [false, true, true],
      [false, true, false],
      [false, true, false],
    ],
    // 180°
    [
      [false, false, false],
      [true,  true,  true],
      [false, false, true],
    ],
    // 270°
    [
      [false, true, false],
      [false, true, false],
      [true,  true, false],
    ],
  ],
}

/** 获取方块在指定旋转态的形状矩阵 */
export function getShape(type: PieceType, rotation: number): Shape {
  const shapes = PIECE_SHAPES[type]
  return shapes[rotation % shapes.length]
}

/** 获取方块类型列表（用于 bag 算法） */
export const ALL_PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'L', 'J']
