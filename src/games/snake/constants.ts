// 棋盘参数
export const COLS = 15
export const ROWS = 15

export function calcCellSize(availableWidth: number, availableHeight: number): number {
  const fromWidth = Math.floor(availableWidth / COLS)
  const fromHeight = Math.floor(availableHeight / ROWS)
  return Math.min(fromWidth, fromHeight)
}

// 速度
export const TICK_INTERVAL = 250       // ms，4 格/秒
export const TICK_INTERVAL_FAST = 125  // ms，8 格/秒
export const ACCEL_TIMEOUT = 250       // ms，上次加速输入多久后退出 fastMode

// 视觉配色
export const COLOR_BG = '#1A1A2E'
export const COLOR_BOARD_BG = '#16213E'
export const COLOR_GRID = '#1E2A4A'
export const COLOR_HEAD = '#FFD600'
export const COLOR_BODY = '#00E5FF'
export const COLOR_FOOD = '#FF5252'
export const COLOR_FLASH = '#FFFFFF'

// 视觉反馈时长（吃食物闪白、Game Over 震屏）
export const FLASH_DURATION = 100      // ms
export const SHAKE_DURATION = 300      // ms
export const SHAKE_INTENSITY = 4       // px
