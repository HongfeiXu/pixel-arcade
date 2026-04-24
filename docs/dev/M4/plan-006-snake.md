# Feature-006 贪吃蛇 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Pixel Arcade 合集中实现贪吃蛇（简单版），15×15 方形棋盘、穿墙、单一食物、恒速慢节奏，适合幼儿。

**Architecture:** 独立目录 `src/games/snake/`，不扩展 `src/games/shared/`。`SnakeGame` 实现现有 `GameInstance` 接口（`init/start/pause/resume/destroy/onInput/saveState/loadState`），rAF 驱动固定步长 tick。渲染走单 Canvas + DPR 3x，视觉反馈（闪白、震屏）参考 tetris 实现。`useGame` hook 自动处理 localStorage 与最高分——`SnakeGame` 只负责序列化。

**Tech Stack:** TypeScript + React 19 + Canvas 2D。项目无自动化测试框架，每个 task 以 `npm run build`（含 tsc）+ 浏览器手动验证 + git commit 作为验收闭环。

**Spec 与实现的差异（阅前必看）：**

1. Spec 用 `mount/handleAction/getSnapshot/restore`、状态 `running/gameOver`——代码实际接口是 `init(canvas, config)` / `onInput(action)` / `saveState():string` / `loadState(data:string)`、状态 `idle/playing/paused/over`。本计划全部使用真实接口名。
2. Spec 的"XYAB 按住加速"依赖 press/release，但 `GameAction` 是 fire-once。实际用**心跳超时**模式：任何 `a/b/x/y` 到达时记录时间戳，`now - lastAccelTime < ACCEL_TIMEOUT (250ms)` 时即 `fastMode = true`。X/B 是 `RepeatButton`，按住每 150ms 发一次，天然保持；Y/A 点一下给约 250ms 短脉冲加速（可接受）。键盘侧 `useKeyboard` DAS 间隔 150ms，行为一致。
3. Spec 的存档 key `pixel-arcade:snake:savedState` 与实际约定不符。真实约定：`pixelarcade_snake_state`（存档，由 `useGame` 自动读写）、`pixelarcade_scores.snake`（最高分，由 `useGame` 自动维护）。`SnakeGame` 只需把 gameId 定为 `snake`，并正确实现 `saveState/loadState`，其他交给 hook。

---

## File Structure

```
src/games/snake/
├── SnakeGame.ts        # GameInstance 实现，~220 行
├── constants.ts        # COLS/ROWS/TICK_INTERVAL/... 配色
├── types.ts            # Direction/Point/SnakeSavedState
├── renderer.ts         # 纯渲染类（类比 TetrisRenderer）
└── food.ts             # spawnFood(segments): Point

src/games/registry.ts   # 新增 snake 注册项
src/components/GameIcon.tsx  # 新增 snake 图标配置

docs/dev/M4/TEST.md     # 手动测试清单
docs/PLAN.md            # M4 勾选完成
```

文件边界：
- `constants.ts / types.ts / food.ts / renderer.ts` 单一职责，纯数据或纯函数
- `SnakeGame.ts` 承载状态机、tick 循环、接口对接，不直接操作 canvas（委托 renderer）
- 不引入 `index.ts`（和 tetris / anti-gravity 保持一致，registry 直接引 class）

---

## Task 1: 基础脚手架与大厅入口

**Files:**
- Create: `src/games/snake/types.ts`
- Create: `src/games/snake/constants.ts`
- Create: `src/games/snake/renderer.ts`
- Create: `src/games/snake/SnakeGame.ts`
- Modify: `src/games/registry.ts`
- Modify: `src/components/GameIcon.tsx`（添加临时占位图标）

**目标：** 点击大厅"贪吃蛇"能进入 GamePage，画布渲染空的 15×15 棋盘背景（还不能开始玩）。

- [ ] **Step 1.1：** 创建 `src/games/snake/types.ts`

```ts
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Point {
  x: number
  y: number
}

export interface SnakeSavedState {
  version: 1
  segments: Point[]
  direction: Direction
  pendingDirection: Direction
  food: Point
  score: number
}
```

- [ ] **Step 1.2：** 创建 `src/games/snake/constants.ts`

```ts
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
```

- [ ] **Step 1.3：** 创建 `src/games/snake/renderer.ts`（先只实现 init + 背景绘制）

```ts
import type { Point } from './types'
import { COLS, ROWS, COLOR_BG, COLOR_BOARD_BG, COLOR_GRID } from './constants'

export class SnakeRenderer {
  private ctx!: CanvasRenderingContext2D
  private dpr = 1
  private cellSize = 0

  init(canvas: HTMLCanvasElement, cellSize: number, dpr: number): void {
    this.dpr = dpr
    this.cellSize = cellSize

    const width = COLS * cellSize
    const height = ROWS * cellSize

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    this.ctx = canvas.getContext('2d')!
    this.ctx.scale(dpr, dpr)
    this.ctx.imageSmoothingEnabled = false
  }

  render(
    segments: Point[],
    food: Point | null,
    flash: { pos: Point; on: boolean } | null,
    shake: { x: number; y: number } | null,
  ): void {
    const ctx = this.ctx
    const canvasW = ctx.canvas.width / this.dpr
    const canvasH = ctx.canvas.height / this.dpr

    ctx.clearRect(0, 0, canvasW, canvasH)
    ctx.fillStyle = COLOR_BG
    ctx.fillRect(0, 0, canvasW, canvasH)

    ctx.save()
    if (shake) ctx.translate(shake.x, shake.y)

    // 棋盘背景
    ctx.fillStyle = COLOR_BOARD_BG
    ctx.fillRect(0, 0, COLS * this.cellSize, ROWS * this.cellSize)

    // 辅助网格
    this.drawGrid()

    // TODO Task 2: 画蛇
    // TODO Task 3: 画食物
    // TODO Task 6: 闪白叠加

    // 防止 unused 警告（Task 2/3/6 会用到）
    void segments
    void food
    void flash

    ctx.restore()
  }

  private drawGrid(): void {
    const ctx = this.ctx
    const cs = this.cellSize
    ctx.strokeStyle = COLOR_GRID
    ctx.lineWidth = 1
    for (let c = 0; c <= COLS; c++) {
      const x = c * cs
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ROWS * cs)
      ctx.stroke()
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = r * cs
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(COLS * cs, y)
      ctx.stroke()
    }
  }
}
```

- [ ] **Step 1.4：** 创建 `src/games/snake/SnakeGame.ts`（骨架：init/start/pause/resume/destroy 可跑，onInput/saveState/loadState 先空实现）

```ts
import type { GameInstance, GameConfig, GameAction, GameState, SfxEvent } from '../types'
import type { Direction, Point, SnakeSavedState } from './types'
import { COLS, ROWS, calcCellSize } from './constants'
import { SnakeRenderer } from './renderer'

export class SnakeGame implements GameInstance {
  // --- 回调 ---
  onScoreChange?: (score: number) => void
  onGameOver?: (finalScore: number) => void
  onStateChange?: (state: GameState) => void
  onSfx?: (event: SfxEvent) => void

  // --- 状态 ---
  private state: GameState = 'idle'
  private score = 0
  private segments: Point[] = []
  private direction: Direction = 'right'
  private pendingDirection: Direction = 'right'
  private food: Point | null = null
  private renderer = new SnakeRenderer()

  // --- 时间驱动 ---
  private rafId = 0
  private lastTime = 0
  private accumulatedTime = 0

  // --- 加速心跳 ---
  private lastAccelTime = -Infinity

  // --- 视觉反馈 ---
  private flashPos: Point | null = null
  private flashTimer = 0
  private shakeTimer = 0

  init(canvas: HTMLCanvasElement, config: GameConfig): void {
    const cellSize = calcCellSize(config.width, config.height)
    this.renderer.init(canvas, cellSize, config.devicePixelRatio)
    this.renderFrame()
  }

  start(): void {
    this.score = 0
    this.segments = [
      { x: 8, y: 7 },
      { x: 7, y: 7 },
      { x: 6, y: 7 },
    ]
    this.direction = 'right'
    this.pendingDirection = 'right'
    this.food = null  // Task 3 填入
    this.accumulatedTime = 0
    this.lastAccelTime = -Infinity
    this.flashPos = null
    this.flashTimer = 0
    this.shakeTimer = 0
    this.setState('playing')
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  pause(): void {
    if (this.state !== 'playing') return
    this.setState('paused')
    cancelAnimationFrame(this.rafId)
  }

  resume(): void {
    if (this.state !== 'paused') return
    this.setState('playing')
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId)
  }

  getState(): GameState { return this.state }
  getScore(): number { return this.score }

  onInput(_action: GameAction): void {
    // Task 2 / Task 5 填充
  }

  saveState(): string {
    // Task 7 填充
    return '{}'
  }

  loadState(_data: string): void {
    // Task 7 填充
  }

  // --- 内部 ---

  private setState(s: GameState): void {
    this.state = s
    this.onStateChange?.(s)
  }

  private loop = (now: number): void => {
    if (this.state !== 'playing') return
    const delta = Math.min(now - this.lastTime, 200)
    this.lastTime = now
    this.update(delta, now)
    this.renderFrame()
    this.rafId = requestAnimationFrame(this.loop)
  }

  private update(_delta: number, _now: number): void {
    // Task 2 填充：推进 tick
  }

  private renderFrame(): void {
    const shake = this.shakeTimer > 0
      ? { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }
      : null
    const flash = this.flashPos && this.flashTimer > 0
      ? { pos: this.flashPos, on: true }
      : null
    this.renderer.render(this.segments, this.food, flash, shake)
  }
}
```

- [ ] **Step 1.5：** 在 `src/components/GameIcon.tsx` 的 `ICONS` 对象中添加临时 snake 图标（和 tetris-easy 风格一致的 8×8 像素图）

```ts
// ICONS 对象中追加
snake: {
  bg: '#1e3a2b',
  glow: '#8cffb7',
  palette: {
    h: '#FFD600',   // 头
    b: '#00E5FF',   // 身
    f: '#FF5252',   // 食物
  },
  pixels: [
    '........',
    '..bbbb..',
    '.b....b.',
    '.b.hh.b.',
    '.b.hh.f.',
    '.b......',
    '.bbbbb..',
    '........',
  ],
},
```

（具体像素形状可凭审美调整；保留 h/b/f 三色以呼应游戏配色）

- [ ] **Step 1.6：** 修改 `src/games/registry.ts` 注册 snake

```ts
import type { GameEntry } from './types'
import { TetrisGame } from './tetris/TetrisGame'
import { EASY_PIECE_TYPES } from './tetris/pieces'
import { AntiGravityGame } from './anti-gravity/AntiGravityGame'
import { SnakeGame } from './snake/SnakeGame'

export const gameRegistry: GameEntry[] = [
  // ...已有三项保持不变...
  {
    meta: {
      id: 'snake',
      name: '贪吃蛇',
      icon: 'snake',
      status: 'active',
    },
    createInstance: () => new SnakeGame(),
  },
]
```

- [ ] **Step 1.7：** 运行构建

Run: `npm run build`
Expected: 通过（无 tsc 错误、Vite 构建成功）

- [ ] **Step 1.8：** 启动 dev 服务器，浏览器验证

Run: `npm run dev`
Expected:
- 大厅首页能看到新增的"贪吃蛇"入口 + 新图标
- 点击进入 `/game/snake`，Canvas 显示 15×15 空棋盘（深色背景 + 辅助网格），但按开始按钮后画面仍然是空的（蛇/食物还没画，预期中）
- 控制台无报错

- [ ] **Step 1.9：** Commit

```bash
git add src/games/snake/ src/games/registry.ts src/components/GameIcon.tsx
git commit -m "feat(snake): 脚手架与大厅入口

- src/games/snake/ 目录 + types/constants/renderer/SnakeGame 骨架
- registry 注册
- 大厅图标占位

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Tick 循环 + 蛇身移动 + 穿墙 + 掉头保护

**Files:**
- Modify: `src/games/snake/SnakeGame.ts`
- Modify: `src/games/snake/renderer.ts`

**目标：** 开始游戏后，蛇按方向键向四方移动、会穿墙（不会死），反向输入被忽略。暂无食物、暂无撞自己判定。

- [ ] **Step 2.1：** `renderer.ts` 的 `render()` 里把 TODO Task 2 替换为蛇身绘制

在 `render()` 方法中，`drawGrid()` 之后：

```ts
// 蛇身
for (let i = segments.length - 1; i >= 0; i--) {
  const seg = segments[i]
  const isHead = i === 0
  this.drawCell(seg, isHead ? COLOR_HEAD : COLOR_BODY)
}

void food
void flash
```

`drawCell` 作为 renderer 的私有方法新增：

```ts
private drawCell(p: Point, color: string): void {
  const cs = this.cellSize
  const ctx = this.ctx
  // 1px 内缩制造像素描边
  ctx.fillStyle = color
  ctx.fillRect(p.x * cs + 1, p.y * cs + 1, cs - 2, cs - 2)
}
```

记得在文件顶部从 `./constants` 追加导入 `COLOR_HEAD, COLOR_BODY`。

- [ ] **Step 2.2：** `SnakeGame.ts` — 实现 `onInput` 中的方向处理（暂不处理加速）

```ts
onInput(action: GameAction): void {
  if (this.state !== 'playing') return

  switch (action) {
    case 'up':
      if (this.direction !== 'down') this.pendingDirection = 'up'
      break
    case 'down':
      if (this.direction !== 'up') this.pendingDirection = 'down'
      break
    case 'left':
      if (this.direction !== 'right') this.pendingDirection = 'left'
      break
    case 'right':
      if (this.direction !== 'left') this.pendingDirection = 'right'
      break
    // a/b/x/y Task 5 填充
  }
}
```

- [ ] **Step 2.3：** `SnakeGame.ts` — 实现 `update` 步进 tick

```ts
private update(delta: number, _now: number): void {
  this.accumulatedTime += delta
  const interval = TICK_INTERVAL  // Task 5 改成 fastMode 三元
  while (this.accumulatedTime >= interval) {
    this.accumulatedTime -= interval
    this.tick()
    if (this.state !== 'playing') break
  }
}

private tick(): void {
  this.direction = this.pendingDirection
  const head = this.segments[0]
  const d = this.direction
  const dx = d === 'left' ? -1 : d === 'right' ? 1 : 0
  const dy = d === 'up' ? -1 : d === 'down' ? 1 : 0
  const newHead: Point = {
    x: (head.x + dx + COLS) % COLS,
    y: (head.y + dy + ROWS) % ROWS,
  }
  this.segments.unshift(newHead)
  this.segments.pop()
  // 撞自己 Task 4
  // 吃食物 Task 3
}
```

顶部从 `./constants` 追加导入 `TICK_INTERVAL`。

- [ ] **Step 2.4：** 运行构建

Run: `npm run build`
Expected: 通过

- [ ] **Step 2.5：** 浏览器验证

Run: `npm run dev`
手机或桌面 Chrome 打开游戏，开始一局。验证：
- 蛇 3 节朝右移动，头黄身青
- 按上/下/左/右 能改变方向
- 撞到任一边墙不会死，从另一侧穿出
- 向右走时按"左"无效（掉头保护）

- [ ] **Step 2.6：** Commit

```bash
git add src/games/snake/SnakeGame.ts src/games/snake/renderer.ts
git commit -m "feat(snake): tick 循环、方向控制、穿墙与掉头保护

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 食物生成、吃食物、计分

**Files:**
- Create: `src/games/snake/food.ts`
- Modify: `src/games/snake/SnakeGame.ts`
- Modify: `src/games/snake/renderer.ts`

**目标：** 进入游戏时棋盘上出现 1 个红色食物，蛇头吃到后 +1 分、蛇身 +1 节、新食物随机出现。

- [ ] **Step 3.1：** 创建 `src/games/snake/food.ts`

```ts
import type { Point } from './types'
import { COLS, ROWS } from './constants'

/**
 * 从所有非蛇身格子中均匀随机选一个生成食物。
 * 若棋盘被蛇填满则返回 null（实际不会发生，15×15=225 格）。
 */
export function spawnFood(segments: Point[]): Point | null {
  const occupied = new Set<number>()
  for (const s of segments) occupied.add(s.y * COLS + s.x)
  const candidates: Point[] = []
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!occupied.has(y * COLS + x)) candidates.push({ x, y })
    }
  }
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}
```

- [ ] **Step 3.2：** `SnakeGame.ts` — `start()` 末尾初始化食物

在 `start()` 中把 `this.food = null` 改为：

```ts
this.food = spawnFood(this.segments)
```

顶部追加：

```ts
import { spawnFood } from './food'
```

- [ ] **Step 3.3：** `SnakeGame.ts` — 修改 `tick()` 实现吃食物（替换 Task 2 的 `unshift/pop` 逻辑）

```ts
private tick(): void {
  this.direction = this.pendingDirection
  const head = this.segments[0]
  const d = this.direction
  const dx = d === 'left' ? -1 : d === 'right' ? 1 : 0
  const dy = d === 'up' ? -1 : d === 'down' ? 1 : 0
  const newHead: Point = {
    x: (head.x + dx + COLS) % COLS,
    y: (head.y + dy + ROWS) % ROWS,
  }
  const willEat = this.food !== null && newHead.x === this.food.x && newHead.y === this.food.y
  // 撞自己 Task 4

  this.segments.unshift(newHead)
  if (willEat) {
    this.score++
    this.onScoreChange?.(this.score)
    this.onSfx?.('lineClear')
    this.food = spawnFood(this.segments)
  } else {
    this.segments.pop()
  }
}
```

- [ ] **Step 3.4：** `renderer.ts` — `render()` 中把 TODO Task 3 替换为食物绘制

在蛇身绘制之后：

```ts
if (food) {
  this.drawCell(food, COLOR_FOOD)
}
```

追加 `COLOR_FOOD` 导入，移除 `void food`。

- [ ] **Step 3.5：** 构建

Run: `npm run build`
Expected: 通过

- [ ] **Step 3.6：** 浏览器验证

- 开始游戏时棋盘上有 1 个红色食物
- 吃到食物后：分数 HUD +1、蛇长 +1、新食物出现在非蛇身格
- 有音效（复用 lineClear）
- 连续吃几次都正常

- [ ] **Step 3.7：** Commit

```bash
git add src/games/snake/food.ts src/games/snake/SnakeGame.ts src/games/snake/renderer.ts
git commit -m "feat(snake): 食物生成、吃食物、计分与增长

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 撞自己 → Game Over（含震屏、音效）

**Files:**
- Modify: `src/games/snake/SnakeGame.ts`

**目标：** 蛇头撞到自己身体时触发 Game Over：停 tick、回调 `onGameOver`、震屏、音效。紧贴尾部前进不死。

- [ ] **Step 4.1：** `SnakeGame.ts` — 在 `tick()` 中加入撞自己判定

把 `tick()` 中 `// 撞自己 Task 4` 注释替换为：

```ts
// 判定 body：若本 tick 会吃到食物，蛇不弹尾；否则尾部让开
const body = willEat
  ? this.segments
  : this.segments.slice(0, -1)
for (const s of body) {
  if (s.x === newHead.x && s.y === newHead.y) {
    this.onSfx?.('gameOver')
    this.shakeTimer = SHAKE_DURATION
    this.setState('over')
    cancelAnimationFrame(this.rafId)
    this.onGameOver?.(this.score)
    return
  }
}
```

顶部追加：

```ts
import { ..., SHAKE_DURATION } from './constants'
```

- [ ] **Step 4.2：** `SnakeGame.ts` — 让震屏计时真正衰减

把 `update()` 改为：

```ts
private update(delta: number, _now: number): void {
  if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - delta)

  this.accumulatedTime += delta
  const interval = TICK_INTERVAL
  while (this.accumulatedTime >= interval) {
    this.accumulatedTime -= interval
    this.tick()
    if (this.state !== 'playing') break
  }
}
```

另外，`renderFrame()` 中震屏强度已经是固定随机偏移——改为根据 timer 线性衰减：

```ts
private renderFrame(): void {
  let shake: { x: number; y: number } | null = null
  if (this.shakeTimer > 0) {
    const intensity = (this.shakeTimer / SHAKE_DURATION) * SHAKE_INTENSITY
    shake = {
      x: (Math.random() - 0.5) * 2 * intensity,
      y: (Math.random() - 0.5) * 2 * intensity,
    }
  }
  const flash = this.flashPos && this.flashTimer > 0
    ? { pos: this.flashPos, on: true }
    : null
  this.renderer.render(this.segments, this.food, flash, shake)
}
```

顶部追加 `SHAKE_INTENSITY` 导入。

- [ ] **Step 4.3：** Game Over 后继续渲染残帧以看到震屏

由于 `loop()` 在 `state !== 'playing'` 时直接 return，`over` 时将不再渲染。改成：

```ts
private loop = (now: number): void => {
  const delta = Math.min(now - this.lastTime, 200)
  this.lastTime = now

  if (this.state === 'playing') {
    this.update(delta, now)
  } else if (this.state === 'over' && this.shakeTimer > 0) {
    // 仅衰减震屏计时，不推 tick
    this.shakeTimer = Math.max(0, this.shakeTimer - delta)
  } else {
    return
  }

  this.renderFrame()

  if (this.state === 'playing' || (this.state === 'over' && this.shakeTimer > 0)) {
    this.rafId = requestAnimationFrame(this.loop)
  }
}
```

`pause()` / `resume()` 中调用 `cancelAnimationFrame` / 重启 loop 的逻辑保持不变。

- [ ] **Step 4.4：** 构建

Run: `npm run build`
Expected: 通过

- [ ] **Step 4.5：** 浏览器验证

- 故意让蛇撞到自己 → 立即停止移动、震屏约 300ms、播放 gameOver 音效、GamePage overlay 显示 Game Over
- **紧贴尾部前进不误判**：让蛇形成 U 形，头部追着尾部走一格——不应该死（因为"本 tick 不吃食物时，body 检查排除尾部"）
- 撞墙不会死（穿墙）

- [ ] **Step 4.6：** Commit

```bash
git add src/games/snake/SnakeGame.ts
git commit -m "feat(snake): 撞自己触发 Game Over 与震屏反馈

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 加速模式（心跳超时）

**Files:**
- Modify: `src/games/snake/SnakeGame.ts`

**目标：** XYAB 任一键按下/连发时蛇加速到 8 格/秒；停止 250ms 后恢复 4 格/秒。

- [ ] **Step 5.1：** `onInput` 中处理 a/b/x/y

在 `onInput()` 的 switch 中追加 `a/b/x/y` 四个 case：

```ts
case 'a':
case 'b':
case 'x':
case 'y':
  this.lastAccelTime = performance.now()
  break
```

- [ ] **Step 5.2：** `update()` 中按 fastMode 选 interval

```ts
private update(delta: number, now: number): void {
  if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - delta)

  const fastMode = now - this.lastAccelTime < ACCEL_TIMEOUT
  const interval = fastMode ? TICK_INTERVAL_FAST : TICK_INTERVAL

  this.accumulatedTime += delta
  while (this.accumulatedTime >= interval) {
    this.accumulatedTime -= interval
    this.tick()
    if (this.state !== 'playing') break
  }
}
```

顶部追加 `TICK_INTERVAL_FAST, ACCEL_TIMEOUT` 导入。

- [ ] **Step 5.3：** 构建

Run: `npm run build`
Expected: 通过

- [ ] **Step 5.4：** 浏览器验证

- 不按 XYAB：蛇 4 格/秒（约每 250ms 走一格），肉眼可辨
- 按住 X 或 B（`RepeatButton`）：蛇持续以 8 格/秒走；松开约 250ms 后回到慢速
- 点一下 Y 或 A：会短暂加速约 250ms（一两个 tick）
- 键盘 J/Z（A 键）/ K/X（B 键）/ Space（A 键）按住测试同理

- [ ] **Step 5.5：** Commit

```bash
git add src/games/snake/SnakeGame.ts
git commit -m "feat(snake): 加速模式（XYAB 心跳超时）

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 吃食物闪白动画

**Files:**
- Modify: `src/games/snake/SnakeGame.ts`
- Modify: `src/games/snake/renderer.ts`

**目标：** 每次吃到食物，那一格闪一次白（约 100ms），视觉肯定反馈。

- [ ] **Step 6.1：** `tick()` 中吃到食物时触发闪白

在 `tick()` 的 `if (willEat)` 分支里，在 `spawnFood` 之前插入：

```ts
this.flashPos = { x: newHead.x, y: newHead.y }
this.flashTimer = FLASH_DURATION
```

顶部追加 `FLASH_DURATION` 导入。

- [ ] **Step 6.2：** `update()` 中衰减 flashTimer

在 `update()` 开头（`shakeTimer` 衰减之后）插入：

```ts
if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - delta)
```

- [ ] **Step 6.3：** `renderer.ts` — `render()` 中叠加闪白

把 `drawGrid` 之后的 TODO Task 6 替换为：若 flash 非空，在对应格子叠一层 COLOR_FLASH：

具体做法：蛇身与食物绘制之后追加

```ts
if (flash && flash.on) {
  this.drawCell(flash.pos, COLOR_FLASH)
}
```

追加 `COLOR_FLASH` 导入。

- [ ] **Step 6.4：** 构建

Run: `npm run build`
Expected: 通过

- [ ] **Step 6.5：** 浏览器验证

- 吃到食物瞬间那格子闪一次白（约一帧可见）
- 连续吃多次每次都闪
- 闪白不影响后续渲染（不会残留）

- [ ] **Step 6.6：** Commit

```bash
git add src/games/snake/SnakeGame.ts src/games/snake/renderer.ts
git commit -m "feat(snake): 吃食物位置闪白动画

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 暂停 / 存档（saveState / loadState）

**Files:**
- Modify: `src/games/snake/SnakeGame.ts`

**目标：** 暂停 → 返回大厅 → 再次进入 → 恢复到暂停状态（蛇身、方向、食物、分数一致）。Game Over 由 useGame 自动清档。

- [ ] **Step 7.1：** 实现 `saveState()`

替换 Task 1 的占位：

```ts
saveState(): string {
  const snapshot: SnakeSavedState = {
    version: 1,
    segments: this.segments.map(s => ({ x: s.x, y: s.y })),
    direction: this.direction,
    pendingDirection: this.pendingDirection,
    food: this.food!,  // 运行态下 food 必非空
    score: this.score,
  }
  return JSON.stringify(snapshot)
}
```

- [ ] **Step 7.2：** 实现 `loadState()`

```ts
loadState(data: string): void {
  const s: SnakeSavedState = JSON.parse(data)
  if (s.version !== 1) return  // 不兼容旧版则丢弃
  this.segments = s.segments.map(p => ({ x: p.x, y: p.y }))
  this.direction = s.direction
  this.pendingDirection = s.pendingDirection
  this.food = s.food
  this.score = s.score
  this.accumulatedTime = 0
  this.lastAccelTime = -Infinity
  this.flashPos = null
  this.flashTimer = 0
  this.shakeTimer = 0
  this.setState('playing')
  this.lastTime = performance.now()
  this.renderFrame()
  this.loop(this.lastTime)
}
```

（`loadState` 进入后直接切 `playing` 与 tetris 保持一致；GamePage 处理"有存档恢复"流程时会先调 `loadState` 再按需 `pause`）

- [ ] **Step 7.3：** 构建

Run: `npm run build`
Expected: 通过

- [ ] **Step 7.4：** 浏览器验证

- 开始一局，吃几个食物让蛇有一定长度，暂停 → 点"返回"回大厅
- DevTools → Application → Local Storage，应看到 `pixelarcade_snake_state` 有 JSON
- 再点击贪吃蛇进入：按"继续"应恢复到暂停时的蛇身、方向、食物位置、分数
- 继续玩正常；Game Over 时 `pixelarcade_snake_state` 被清除（由 useGame 处理，不用 SnakeGame 管）
- 切换浏览器 tab（触发 `visibilitychange`）→ 自动暂停并存档；回来继续

- [ ] **Step 7.5：** Commit

```bash
git add src/games/snake/SnakeGame.ts
git commit -m "feat(snake): 存档序列化与恢复

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 渲染精修 & 大厅图标

**Files:**
- Modify: `src/games/snake/renderer.ts`
- Modify: `src/components/GameIcon.tsx`

**目标：** 提升视觉质感——蛇头/身区分更明显、食物稍加描边提升存在感；大厅图标替换为更精心的像素形状。

- [ ] **Step 8.1：** 优化 `drawCell` 加像素描边感

```ts
private drawCell(p: Point, color: string): void {
  const cs = this.cellSize
  const ctx = this.ctx
  // 外圈深色描边（提升像素感）
  ctx.fillStyle = color
  ctx.fillRect(p.x * cs + 1, p.y * cs + 1, cs - 2, cs - 2)
  // 内亮高光（左上 1/3 区域）
  ctx.fillStyle = this.lighten(color)
  ctx.fillRect(p.x * cs + 2, p.y * cs + 2, Math.floor((cs - 4) / 3), Math.floor((cs - 4) / 3))
}

private lighten(hex: string): string {
  // 简单取高亮：RGB 每通道 +40 上限 255
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + 40)
  const g = Math.min(255, ((n >> 8) & 0xff) + 40)
  const b = Math.min(255, (n & 0xff) + 40)
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 8.2：** 蛇头再叠一个方向点，凸显朝向（可选，如果觉得视觉够好可跳过）

在 `render()` 蛇身循环画完后，画头的朝向标记：

```ts
if (segments.length > 0) {
  const head = segments[0]
  // 眼睛：在头方格正中画 1×1 深色点（根据方向偏移）
  const cs = this.cellSize
  const cx = head.x * cs + cs / 2
  const cy = head.y * cs + cs / 2
  this.ctx.fillStyle = '#1A1A2E'
  this.ctx.fillRect(Math.floor(cx - 1), Math.floor(cy - 1), 2, 2)
}
```

（此处未区分方向眼，偏"抽象"；若实现方向感更强的两只眼睛需要 renderer 知道 direction——见 Step 8.3 备选）

- [ ] **Step 8.3：**（备选，如果 8.2 觉得不够）renderer 的 `render` 签名加入 direction，画两只眼

```ts
// render 签名改：
render(
  segments: Point[],
  direction: Direction,   // 新增
  food: Point | null,
  flash: ...,
  shake: ...,
): void
```

在 SnakeGame 的 `renderFrame` 中传 `this.direction`。具体眼睛位置根据 direction 画两个 1×1 或 2×2 黑点于头格前部。

**推荐先做 8.1 + 8.2，浏览器看一眼效果，不满意再做 8.3。** 这是 spec 里"不画蛇眼"的有意放宽（试玩前置性）。

- [ ] **Step 8.4：** 修正大厅图标（如 Task 1 的占位不满意）

在 `src/components/GameIcon.tsx` 的 `ICONS.snake` 调整 `pixels` 数组到满意形状。可选风格：弯曲的蛇身 + 前方一个食物。

- [ ] **Step 8.5：** 构建

Run: `npm run build`
Expected: 通过

- [ ] **Step 8.6：** 浏览器验证

- 蛇身有 1px 黑边 + 左上高光（像素马赛克风）
- 蛇头醒目于身体
- 食物一样的质感
- 大厅图标清晰辨识

- [ ] **Step 8.7：** Commit

```bash
git add src/games/snake/renderer.ts src/components/GameIcon.tsx
git commit -m "feat(snake): 像素描边高光 + 图标精修

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 手动测试清单 + PLAN.md 完结

**Files:**
- Create: `docs/dev/M4/TEST.md`
- Modify: `docs/PLAN.md`

**目标：** 落档测试清单供回归和后续迭代，更新路线图状态。

- [ ] **Step 9.1：** 创建 `docs/dev/M4/TEST.md`

```markdown
# M4 测试清单 — 贪吃蛇（feature-006）

## 设备
- 主力：iPhone 16 Pro Max（Safari + 主屏 PWA）
- 辅助：桌面 Chrome（键盘模拟）

## 玩法
- [ ] 4 方向移动正常
- [ ] 4 个边界各穿墙一次
- [ ] 向右走时按左 被忽略（掉头保护）
- [ ] 向上时按下、向下时按上、向左时按右 同理
- [ ] 一 tick 内连按两个方向，以最后一次为准
- [ ] 吃食物时蛇 +1 节、分数 +1
- [ ] 吃食物那格有闪白
- [ ] 紧贴尾部前进不被判为撞自己
- [ ] 撞自己触发 Game Over：震屏 + gameOver 音效
- [ ] 初始蛇长 3 节朝右（从棋盘中央）
- [ ] 食物不会生成在蛇身上

## 加速
- [ ] 按住 X 或 B 蛇变快（8 格/秒）
- [ ] 松开约 250ms 后回到慢速（4 格/秒）
- [ ] 点一下 Y 或 A 短暂加速（1~2 个 tick）
- [ ] 键盘 J/Z/Space（A）、K/X（B）按住加速等效
- [ ] 多键同时按：例如按 X → 按 B → 松 X，松到 B 之前保持 fastMode

## 状态与存档
- [ ] 暂停键（P / Esc / UI 按钮）暂停 & 恢复
- [ ] 暂停 → 返回大厅 → 再进 → 按"继续"恢复到暂停时蛇身/方向/食物/分数
- [ ] localStorage 中 `pixelarcade_snake_state` 在游戏中存在
- [ ] Game Over 后 `pixelarcade_snake_state` 被清除
- [ ] 切换浏览器 tab（visibilitychange）→ 自动暂停并存档 → 回来继续
- [ ] 锁屏后解锁（iOS PWA）→ 自动暂停

## 最高分
- [ ] 新纪录时游戏内 HUD 实时更新
- [ ] `pixelarcade_scores.snake` 持久化

## 响应式
- [ ] 屏幕旋转 / 容器尺寸变化 → cellSize 重算不错位
- [ ] 桌面宽屏下 GamePage 居中、不拉伸

## 视觉
- [ ] 蛇头色（黄）与身色（青）明显区分
- [ ] 食物（红）一眼可见
- [ ] 辅助网格点阵存在但不喧宾夺主
- [ ] 吃食物闪白 / Game Over 震屏 视觉有反馈
```

- [ ] **Step 9.2：** 修改 `docs/PLAN.md` 勾选 M4 完成

```markdown
### M4 — 第三个游戏

- [x] 新游戏选型 & 设计文档 — 贪吃蛇（简单版） [feature-006](dev/M4/feature-006-snake.md)
- [x] 实现 & 注册到游戏大厅
```

并把游戏规划表中贪吃蛇状态从"🛠 设计完成"改为"✅ 已完成（M4）"。

- [ ] **Step 9.3：** 执行一遍测试清单

打开 dev 或 preview，按清单逐项过，失败项回到相应 task 修复（这属于迭代范畴，不属于本 plan）。

- [ ] **Step 9.4：** Commit 文档

```bash
git add docs/dev/M4/TEST.md docs/PLAN.md
git commit -m "docs: M4 贪吃蛇手动测试清单 + 路线图勾选完成

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review 备注

对照 `docs/dev/M4/feature-006-snake.md` 要点：

| Spec 条目 | 对应 Task |
|---|---|
| 15×15 棋盘、动态 cellSize | Task 1 (constants + renderer.init) |
| 初始蛇 3 节朝右 | Task 1 (SnakeGame.start) |
| 单一食物、均匀随机 | Task 3 (food.ts + start) |
| 吃食物 +1 分/节 | Task 3 (tick 分支) |
| 穿墙 | Task 2 (tick 模运算) |
| 撞自己 Game Over | Task 4 |
| 紧贴尾部不死 | Task 4 (body 排除尾) |
| 掉头保护 | Task 2 (onInput 过滤反向) |
| pendingDirection 延迟到下 tick | Task 2 (tick 起首 direction = pendingDirection) |
| 250ms / 125ms 双速 | Task 5 (ACCEL_TIMEOUT 心跳) |
| 加速键 XYAB 任一 | Task 5 (onInput a/b/x/y) |
| 震屏 | Task 4 |
| 吃食物闪白 | Task 6 |
| Game Over 音效 | Task 4 |
| 吃食物音效 lineClear | Task 3 |
| 暂停/存档 | Task 7 + useGame 既有机制 |
| 最高分实时刷新 | 自动生效（useGame 统一处理） |
| 版本号 version: 1 丢弃 | Task 7 (loadState) |
| 大厅图标 | Task 1 + Task 8 |
| 测试清单落档 | Task 9 |

**无 TBD / placeholder**。加速机制由"按住"改为"心跳超时"，已在 plan 顶部"Spec 与实现的差异"注明，行为上等价。

**已知小边缘：** Task 7 中 `saveState` 里 `this.food!` 使用非空断言——在 `playing` 或 `paused` 状态下 food 必非空（start 已初始化），但 TypeScript 无法推断。另一种选择是把 `food` 初始化改为 `spawnFood(segments)!` 并让 `food` 在类上声明为 `Point`（非 null）。若 tsc 严格模式报错，改用后者。
