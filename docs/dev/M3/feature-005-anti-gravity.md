# Feature-005: 反重力方块

## 背景

合集的第三款游戏，俄罗斯方块变种：方块从棋盘底部生成，向上"漂浮"直到触顶或触到已锁定块，玩法核心一致（消行、计分、连消），仅"重力方向"反转。

## 玩法设计

### 基本设定

- 棋盘尺寸、格子大小、配色、DPR、HUD 布局：与标准俄罗斯方块完全一致
- 方块形状 7 种，**不做镜像**，`rotation=0` 时和标准版形状相同
- 方块生成在棋盘**底部**，向上飞行（反重力）
- 允许方块在底部棋盘外短暂存在（`boardY >= ROWS`），作为标准版顶部隐藏区的镜像
- 触顶或触到已锁定块底面 → 触发 LOCK_DELAY → 锁定
- 满行检测、闪白动画、震屏、消行计分：与标准版一致
- Game Over：新方块在底部生成位置被已锁定块占据

### 控制映射

| 输入 | 动作 |
|------|------|
| D-pad 上 / Y 按钮 | 速升（软降的反向，加速向上移动） |
| D-pad 下 / A 按钮 | 旋转 |
| D-pad 左 / X 按钮 | 左移 |
| D-pad 右 / B 按钮 | 右移 |

**设计理由：** XYAB 与 D-pad 方向一一对应（X/左、B/右、Y/上、A/下），肌肉记忆统一。上键作为重力方向的"加速键"与标准版对称。

### 与标准版的差异清单

| 维度 | 标准版 | 反重力版 |
|------|--------|---------|
| 方块生成位置 | `y = 0`（顶部） | `y = ROWS - 2`（底部，留一行给形状高度） |
| 下落方向 | `y++`（向下） | `y--`（向上） |
| 触底检测 | `y + 1` 无效 | `y - 1` 无效 |
| Wall kick 第三测试位 | `[0, -1]`（向上 1 格） | `[0, +1]`（向下 1 格） |
| 消行后填空方向 | 上方行下移 | 下方行上移 |
| Game Over 判定 | 新方块在顶部位置无法放置 | 新方块在底部位置无法放置 |
| 隐藏区/越界规则 | 允许 `boardY < 0` | 允许 `boardY >= ROWS` |

### 音效 / 视觉反馈

- 音效事件沿用 [feature-004](../M2/feature-004-sfx.md) 最小集，共用同一套 WAV 资源（`move / rotate / softDrop / lineClear / tetris / gameOver`）
- **语义映射：** `softDrop` 事件对应本游戏的"速升"（含义是"加速朝重力方向运动"，命名不改以保持接口稳定）
- 闪白动画、震屏、消行计分逻辑完全照搬

## 架构方案

### 目录结构

```
src/games/
├── shared/tetromino/     # 两款游戏共用，无游戏逻辑依赖
│   ├── types.ts          # PieceType / Piece / Board / Cell
│   ├── pieces.ts          # 形状定义 / getShape / ALL_PIECE_TYPES
│   └── bag.ts             # PieceBag 随机袋
├── tetris/               # 标准版独立
│   ├── TetrisGame.ts
│   ├── constants.ts
│   ├── board.ts
│   ├── renderer.ts
│   └── ...
└── anti-gravity/         # 反向版独立
    ├── AntiGravityGame.ts
    ├── constants.ts
    ├── board.ts
    ├── renderer.ts
    └── ...
```

**理由：** `types / pieces / bag` 无任何游戏逻辑，立即抽取避免副本同步。`renderer` 依赖各游戏的 constants/board，暂无抽取必要。

### 关键改动点

#### `constants.ts`

```typescript
export const SPAWN_X = 3
export const SPAWN_Y = ROWS - 2  // 反向版：底部
```

注：`SPAWN_Y = ROWS - 2` 让常见 2 行高方块贴近底部生成。竖直 I 方块旋转后会延伸到棋盘底部外侧，因此 `anti-gravity/board.ts` 必须允许 `boardY >= ROWS` 的隐藏区。若 spawn 时棋盘内的有效格被占据，即 Game Over。

#### `AntiGravityGame.ts`

关键方法对称翻转：

```typescript
// dropOne: y-- 取代 y++
private dropOne(): void {
  if (!this.currentPiece) return
  if (isValidPosition(this.board, this.currentPiece, this.currentPiece.x, this.currentPiece.y - 1, this.currentPiece.rotation)) {
    this.currentPiece.y--
  } else {
    this.isLocking = true
    this.lockTimer = 0
    this.lockMoves = 0
  }
}

// movePiece 的 Move Reset 规则：y + 1 改为 y - 1
// （即方块脱离"顶部"判断，实际是检测 y - 1 是否有效）

// rotatePiece 的 getWallKicks：第三测试位 [0, -1] → [0, +1]

// onInput：down 触发 rotatePiece，up 触发 softDropping（速升）
```

`softDropping` 状态的含义变为"向上加速移动"，实现上不变（`dropTimer` 达阈值就 `dropOne()`，只不过 `dropOne` 现在是向上）。

当前 `GamePad` 和 `useKeyboard` 的上/下键是单次触发，不是按住松开模型。和标准版一致，按一次"速升"后当前方块持续加速，直到该方块锁定后重置 `softDropping = false`。如果后续想改成"按住才加速"，需要扩展输入接口支持 release 事件，本功能先不做。

#### `board.ts`

越界规则镜像标准版：标准版允许方块在顶部隐藏区（`boardY < 0`），反重力版允许方块在底部隐藏区（`boardY >= ROWS`）。这会影响 `isValidPosition` 和 `lockPiece`。

```typescript
export function isValidPosition(
  board: Board,
  piece: Piece,
  x: number,
  y: number,
  rotation: number,
): boolean {
  const shape = getShape(piece.type, rotation)
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue
      const boardX = x + col
      const boardY = y + row
      if (boardX < 0 || boardX >= COLS || boardY < 0) return false
      if (boardY >= ROWS) continue
      if (board[boardY][boardX] !== null) return false
    }
  }
  return true
}
```

`removeRows` 方向反转：先按原始索引从大到小删除，避免相邻多行同时消除时 `splice` 导致索引偏移；再统一从底部补空行。

```typescript
export function removeRows(board: Board, rows: number[]): void {
  const sorted = [...rows].sort((a, b) => b - a)
  for (const row of sorted) {
    board.splice(row, 1)
  }
  for (let i = 0; i < sorted.length; i++) {
    board.push(createEmptyRow())  // 在底部补空行
  }
}
```

对比标准版：sorted 降序，`board.unshift(emptyRow)`（顶部补空）。

`getGhostY` 也要反向：从当前 `y` 开始不断尝试 `ghostY - 1`，直到不能继续向上移动。

```typescript
export function getGhostY(board: Board, piece: Piece): number {
  let ghostY = piece.y
  while (isValidPosition(board, piece, piece.x, ghostY - 1, piece.rotation)) {
    ghostY--
  }
  return ghostY
}
```

#### `registry.ts`

新增条目：

```typescript
{
  meta: {
    id: 'anti-gravity',
    name: '反重力方块',
    icon: '',  // TODO: 像素图标
    status: 'active',
  },
  createInstance: () => new AntiGravityGame(),
},
```

### 复用与接口

- `GameInstance` 接口无需改动，`AntiGravityGame` 实现所有现有回调（`onScoreChange / onGameOver / onStateChange / onSfx`）
- `useGame / useSfx / GamePad / NextPiecePreview / ScoreBoard` 全部无改动直接复用
- `GamePad` 的按钮布局不改，但 `AntiGravityGame.onInput()` 内部重新解释 `up/down/a/y`
- 最高分 / 存档：独立 `gameId='anti-gravity'`，localStorage 键天然隔离

## 实现清单

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/games/shared/tetromino/` | 抽出 pieces/bag/types 至 shared（renderer 依赖游戏 constants，暂不抽出） |
| 2 | `src/games/tetris/` | pieces.ts / bag.ts / types.ts 改为 re-export from shared |
| 3 | `src/games/anti-gravity/` | 新建目录，复制 tetris 目录结构 |
| 4 | `anti-gravity/constants.ts` | `SPAWN_Y = ROWS - 2` |
| 5 | `anti-gravity/AntiGravityGame.ts` | 类；`dropOne` / `movePiece` / `rotatePiece` / `getWallKicks` / `onInput` 方向反转 |
| 6 | `anti-gravity/board.ts` | `isValidPosition` / `lockPiece` / `removeRows` / `findFullRows` / `getGhostY` 方向反转 |
| 7 | `src/games/registry.ts` | 注册 `anti-gravity` 条目 |
| 8 | `docs/PLAN.md` | M3 条目打勾 |
| 9 | 游戏图标 | 像素图标（可先占位，后续补） |

## 验证方式

1. `npm run build` 无类型错误
2. 大厅显示三款游戏（简单 / 标准 / 反重力），点击反重力进入正常
3. 方块从底部生成、向上飞行
4. D-pad 上键（和 Y）加速上升；D-pad 下键（和 A）旋转；左右键（X/B）移动
5. 键盘映射正确：`ArrowUp/W` 速升，`ArrowDown/S` 旋转，`ArrowLeft/A` 左移，`ArrowRight/D` 右移，`Space` 触发 `a`（即旋转）
6. 底部生成后，7 种方块均可正常移动/旋转，重点检查竖直 I 方块不会因底部隐藏区误判而卡死
7. 触顶或触到已锁定块底面时触发锁定延迟，LOCK_DELAY 内滑动可重置（Move Reset 上限 15 次）
8. Ghost Piece 指向方块最终向上的锁定位置，而不是向下
9. 相邻多行同时消除时，删除正确行，并在棋盘底部补空行
10. 消 1~3 行触发 `lineClear` 音；消 4 行触发 `tetris` 音；`gameOver` 时触发下行音
11. 消行动画：闪白 + 2 行以上震屏
12. 存档独立：反重力进度和标准版互不影响；最高分各自独立
13. 暂停 / 恢复 / 离开再回来 / 刷新页面：与标准版行为一致

## 开放问题

- **游戏图标** — 大厅卡片需要一个代表性像素图标，建议做一个"向上飞的 T 形"加箭头。可先占位，后续补。
- **难度曲线差异** — 反向版视觉陌生，是否需要降低初始下落速度（如 `DROP_INTERVAL = 1200`）让玩家适应？默认先照搬 1000ms，实测再调。
- **方块落地判定的视觉感** — 方块向上飞，"落地"在玩家视觉上变成"撞到天花板"，是否影响手感？这条没法靠纸面决定，需要实玩验证。
