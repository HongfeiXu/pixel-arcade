# Issue-002: 棋子触底后可无限左右移动，不触发锁定

## 现象

棋子到达最后一行（或堆叠表面）后，玩家可以一直按左右键移动，棋子永远不会锁定，不会触发下一个方块下落。

## 根因

`src/games/tetris/TetrisGame.ts` 中 `movePiece()` (第 194-201 行) 和 `rotatePiece()` (第 224-231 行) 的锁定期间逻辑存在问题：

```typescript
// movePiece() 第 194-201 行
if (this.isLocking) {
  if (isValidPosition(board, piece, x, y + 1, rotation)) {
    // 移动后脱离底部 → 取消锁定 ✓
    this.isLocking = false
    this.lockTimer = 0
  } else {
    // 移动后仍在底部 → 重置计时器 ✗ 问题在此
    this.lockTimer = 0
  }
}
```

**问题链路：**

1. 棋子触底 → `dropOne()` 设置 `isLocking = true`, `lockTimer = 0`
2. `update()` 开始累积 `lockTimer`，目标达到 `LOCK_DELAY`（500ms）后调用 `lock()`
3. 玩家按左/右键 → `movePiece()` 成功移动 → 检测仍在底部 → **`lockTimer = 0`**
4. 计时器被重置，回到步骤 2
5. 只要玩家持续操作，`lockTimer` 永远无法累积到 500ms → 棋子永不锁定

`rotatePiece()` 第 228-229 行存在完全相同的问题。

## Tetris 锁定规则调研

经典 Tetris 有三种锁定策略（参考 [TetrisWiki - Lock delay](https://tetris.wiki/Lock_delay)、[Infinity](https://tetris.wiki/Infinity)）：

| 策略 | 规则 | 使用场景 |
|------|------|----------|
| **Infinity** | 移动/旋转无条件重置计时器，无上限 | 早期 Guideline 游戏，已弃用 |
| **Move Reset** | 移动/旋转重置计时器，上限 15 次，超过立即锁定 | **2007+ 现代标准**，tetris.com 官方版 |
| **Step Reset** | 只有下落一行才重置计时器，左右/旋转不重置 | 世嘉系 Tetris |

**结论：采用 Move Reset（15 次上限）**，符合现代 Tetris Guideline，操作手感好且防止无限拖延。

## 修复方案

### 改动

**`src/games/tetris/constants.ts`**

```typescript
export const MAX_LOCK_MOVES = 15   // 锁定期间最大操作次数
```

**`src/games/tetris/TetrisGame.ts`**

1. 新增实例字段 `lockMoves: number`（初始 0）

2. `movePiece()` 锁定期间逻辑改为：

```typescript
if (this.isLocking) {
  if (isValidPosition(board, piece, x, y + 1, rotation)) {
    // 脱离底部，取消锁定
    this.isLocking = false
    this.lockTimer = 0
    this.lockMoves = 0
  } else {
    // 仍在底部，允许有限次重置
    this.lockMoves++
    if (this.lockMoves >= MAX_LOCK_MOVES) {
      this.lock()
      return true
    }
    this.lockTimer = 0
  }
}
```

3. `rotatePiece()` 同样逻辑

4. `dropOne()` 进入锁定时重置：`this.lockMoves = 0`

5. `lock()` / `start()` / 重新开局时重置：`this.lockMoves = 0`

## 关联文档

- [docs/design/tetris.md](../../design/tetris.md) — 玩法设计（如有锁定规则章节需同步）
