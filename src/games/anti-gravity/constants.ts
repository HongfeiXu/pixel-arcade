import type { PieceType } from './types'

// --- 棋盘参数（与标准版一致）---
export const COLS = 10
export const ROWS = 18

/** 根据可用空间动态计算格子尺寸 */
export function calcCellSize(availableWidth: number, availableHeight: number): number {
  const fromWidth = Math.floor(availableWidth / COLS)
  const fromHeight = Math.floor(availableHeight / ROWS)
  return Math.min(fromWidth, fromHeight)
}

// --- 速度参数 ---
export const DROP_INTERVAL = 1000    // ms，自然"上升"间隔
export const SOFT_DROP_INTERVAL = 100 // ms，速升间隔
export const LOCK_DELAY = 500        // ms，触顶后锁定延迟
export const MAX_LOCK_MOVES = 15     // 锁定期间最大操作次数

// --- 方块配色 ---
export interface PieceColors {
  main: string
  light: string
  dark: string
}

export const PIECE_COLORS: Record<PieceType, PieceColors> = {
  I: { main: '#00E5FF', light: '#4CEDFF', dark: '#00A0B3' },
  O: { main: '#FFD600', light: '#FFE24C', dark: '#B39600' },
  T: { main: '#AA00FF', light: '#C44CFF', dark: '#7700B3' },
  L: { main: '#FF9100', light: '#FFB24C', dark: '#B36600' },
  S: { main: '#00E676', light: '#4CEF9C', dark: '#00A152' },
  Z: { main: '#FF1744', light: '#FF5C7A', dark: '#B31030' },
  J: { main: '#2979FF', light: '#69A1FF', dark: '#1D55B3' },
}

// --- 视觉颜色 ---
export const COLOR_BG = '#1A1A2E'
export const COLOR_BOARD_BG = '#16213E'
export const COLOR_GRID = '#1E2A4A'
export const COLOR_ACCENT = '#FFD600'
export const COLOR_ACCENT2 = '#00E5FF'

// --- 方块生成起始位置（底部） ---
// SPAWN_Y = ROWS - 2 让常见 2 行高方块贴近底部生成
// 竖直 I 方块旋转后会延伸到棋盘外（boardY >= ROWS），由 board 允许底部隐藏区
export const SPAWN_X = 3
export const SPAWN_Y = ROWS - 2
