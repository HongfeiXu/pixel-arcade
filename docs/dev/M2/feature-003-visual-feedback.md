# Feature-003: 视觉反馈动画

## 背景

消行时缺少视觉反馈，方块直接消失体验生硬。加入经典 Game Boy 风格的闪白消行动画和震屏效果。

## 设计方案

### 消行动画（GB 风格闪白）

**效果**：被消除的行整行闪白 3 次后消失。

**时序**：

```
锁定方块 → 检测满行 → 进入动画阶段（~400ms）→ 实际删行 → 生成新方块
                         ↓
              闪白(60ms) → 原色(60ms) → 闪白(60ms) → 原色(60ms) → 闪白(80ms) → 删行
              总计 ~320ms，3 次闪烁
```

- 动画期间暂停正常 update（方块不下落、不接受输入）
- 动画结束后才执行 `removeRows` 和 `spawnPiece`

**渲染**：闪白阶段，满行的所有格子用纯白色 `#FFFFFF` 填充（保留立体边框效果，main/light/dark 全白）。

### 震屏效果

**触发条件**：一次消除 2 行及以上。

**效果**：Canvas 内容整体抖动（通过 `ctx.translate` 偏移），快速衰减。

| 消行数 | 抖动强度 | 持续时间 |
|--------|---------|---------|
| 2 行 | ±2px | 200ms |
| 3 行 | ±3px | 250ms |
| 4 行 | ±4px | 300ms |

**实现**：每帧随机偏移 `[-intensity, +intensity]`，intensity 线性衰减到 0。震屏与闪白动画同时播放。

### 架构改动

#### 1. board.ts — 拆分 clearLines

```typescript
/** 找出所有满行的行号 */
export function findFullRows(board: Board): number[]

/** 移除指定行，顶部补空行 */
export function removeRows(board: Board, rows: number[]): void
```

原 `clearLines` 保留为兼容函数（内部调用 findFullRows + removeRows），但 TetrisGame 不再使用。

#### 2. TetrisGame — 动画状态机

新增状态：

```typescript
// 消行动画
private animating = false
private animRows: number[] = []    // 待消行号
private animTimer = 0              // 动画计时器
private animPhase = 0              // 当前闪烁阶段 (0-5)

// 震屏
private shakeTimer = 0
private shakeIntensity = 0
```

`lock()` 改造：

```typescript
private lock(): void {
  lockPiece(this.board, this.currentPiece)
  const fullRows = findFullRows(this.board)

  if (fullRows.length > 0) {
    // 进入动画阶段，暂停正常游戏逻辑
    this.animating = true
    this.animRows = fullRows
    this.animTimer = 0
    this.animPhase = 0
    // 震屏
    if (fullRows.length >= 2) {
      this.shakeIntensity = fullRows.length  // 2~4px
      this.shakeTimer = 150 + fullRows.length * 50
    }
  } else {
    this.afterClear()
  }
}
```

`update()` 改造：

```typescript
private update(delta: number): void {
  if (this.animating) {
    this.updateAnimation(delta)
    return  // 动画期间跳过正常下落逻辑
  }
  // ... 原有下落逻辑
}
```

`updateAnimation()` — 处理闪烁时序：

```typescript
private static readonly ANIM_FLASH_ON = 60   // 闪白持续 ms
private static readonly ANIM_FLASH_OFF = 60   // 原色持续 ms
private static readonly ANIM_FINAL_FLASH = 80 // 最后一次闪白

private updateAnimation(delta: number): void {
  this.animTimer += delta

  // 计算当前阶段：on(60) off(60) on(60) off(60) on(80) = 5 段
  const phases = [60, 60, 60, 60, 80]  // 每段时长
  let elapsed = 0
  let phase = 0
  for (let i = 0; i < phases.length; i++) {
    elapsed += phases[i]
    if (this.animTimer < elapsed) { phase = i; break }
    if (i === phases.length - 1) phase = phases.length  // 动画结束
  }
  this.animPhase = phase

  // 动画结束
  if (phase >= phases.length) {
    this.animating = false
    this.score += this.animRows.length
    this.onScoreChange?.(this.score)
    removeRows(this.board, this.animRows)
    this.animRows = []
    this.afterClear()
  }

  // 震屏衰减
  if (this.shakeTimer > 0) {
    this.shakeTimer = Math.max(0, this.shakeTimer - delta)
  }
}
```

#### 3. TetrisRenderer — 动画渲染

`render()` 方法签名扩展：

```typescript
render(
  board: Board,
  currentPiece: Piece | null,
  animRows?: number[],       // 闪烁中的行号
  animFlashOn?: boolean,     // 当前是否处于闪白阶段
  shake?: { x: number; y: number },  // 震屏偏移
): void
```

- `animRows` + `animFlashOn`：在 `drawBoard` 时，属于 animRows 且 flashOn 的行用白色绘制
- `shake`：render 开头 `ctx.save(); ctx.translate(shake.x, shake.y)`，结尾 `ctx.restore()`

#### 4. onInput 屏蔽

动画期间 `onInput` 不响应：

```typescript
onInput(action: GameAction): void {
  if (this.state !== 'playing' || !this.currentPiece || this.animating) return
  // ...
}
```

## 实现清单

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/games/tetris/board.ts` | 新增 `findFullRows`、`removeRows` |
| 2 | `src/games/tetris/TetrisGame.ts` | 动画状态机、lock() 改造、update() 分支 |
| 3 | `src/games/tetris/renderer.ts` | render() 支持 animRows/flashOn/shake 参数 |
| 4 | `src/games/tetris/constants.ts` | 动画时序常量（如需要） |

## 验证方式

1. `npm run build` 无类型错误
2. 消 1 行：闪白 3 次后消失，无震屏
3. 消 2+ 行：闪白 + canvas 抖动
4. 动画期间按键无响应（方块不移动、不旋转）
5. 动画结束后新方块正常生成，游戏继续
6. 分数在动画结束后才更新（视觉上消行完成后加分）
