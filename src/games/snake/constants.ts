// 棋盘参数
export const COLS = 15
export const ROWS = 15

export function calcCellSize(availableWidth: number, availableHeight: number): number {
  const fromWidth = Math.floor(availableWidth / COLS)
  const fromHeight = Math.floor(availableHeight / ROWS)
  return Math.min(fromWidth, fromHeight)
}

// 速度
export const TICK_INTERVAL = 500       // ms，2 格/秒
export const TICK_INTERVAL_FAST = 200  // ms，5 格/秒
// 加速窗口：上次方向输入距今若超过 ACCEL_GAP_MAX 则视为"松开"，
// 持续时长需先达到 HOLD_ACCEL_DELAY 才进入 fastMode（避免单次 tap 误触发）
export const ACCEL_GAP_MAX = 200       // ms，> DAS(150) + 余量
export const HOLD_ACCEL_DELAY = 500    // ms，按下后多久开始加速

// 方向输入队列上限（tick 每次消费 1 个；连续两次转向形成 L/U 时依次应用）
export const MAX_INPUT_QUEUE = 3

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
