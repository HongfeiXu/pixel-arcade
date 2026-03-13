# Feature-001: 经典手柄布局改造

## 背景

当前 GamePad 是俄罗斯方块专用的三排按钮布局（← 旋转 → / ↓ 软降 / ⬇ 到底），扩展性差。改为经典手柄布局（左 D-pad + 右 ABXY），统一所有游戏的操控方案，后续新增游戏无需重新设计手柄。

## 设计方案

### GameAction 类型改造

从"语义动作"改为"物理按键"，GamePad 只负责传递"按了什么"，每个游戏的 `onInput` 自行解释含义。

```typescript
// 之前：语义动作（与特定游戏耦合）
type GameAction = 'left' | 'right' | 'down' | 'drop' | 'rotate' | 'pause'

// 之后：物理按键（通用）
type GameAction = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'pause'
```

### 手柄布局

```
┌──────────────────────────────────────────┐
│                                          │
│    [D-pad]                    [ABXY]     │
│                                          │
│         ↑                      Y         │
│      ←     →                X     B      │
│         ↓                      A         │
│                                          │
└──────────────────────────────────────────┘
```

- **左侧 D-pad**：4 个方形按钮排成十字，中间空心
- **右侧 ABXY**：4 个圆形按钮排成菱形（Xbox 布局）
- 左右各占约 148pt，中间间隙约 44pt，适配 393pt 屏幕宽度（iPhone 16 Pro）

### 按钮尺寸

| 类型 | 尺寸 | 说明 |
|------|------|------|
| D-pad 按钮 | 48×48pt | 方形，加 padding 满足 56pt 最小触控区 |
| ABXY 按钮 | 48×48pt | 圆形，加 padding 满足 56pt 最小触控区 |

### 配色

**D-pad**：沿用现有按钮样式

| 属性 | 色值 |
|------|------|
| 背景 | `#2d2d5e` |
| 边框 | `#4a4a8a` |
| 按压态 | `#1a1a3e` |

**ABXY**：彩色圆形按钮

| 按键 | 颜色 | 色值 |
|------|------|------|
| A | 青 | `#00E5FF` |
| B | 红 | `#FF4444` |
| X | 蓝 | `#4488FF` |
| Y | 黄 | `#FFD600` |

按钮上的字母用深色（`#1A1A2E`），确保对比度。

### 长按重复

| 按键 | 重复 | 说明 |
|------|------|------|
| D-pad ← → | 150ms 间隔 | 连续移动，与现有 DAS 一致 |
| D-pad ↑ ↓ | 不重复 | 单次触发 |
| A B X Y | 不重复 | 单次触发 |

## 俄罗斯方块按键映射

| 物理按键 | Tetris 动作 | 说明 |
|---------|------------|------|
| D-pad ← | 左移 | 支持长按连续移动 |
| D-pad → | 右移 | 支持长按连续移动 |
| D-pad ↓ | 软降 | 单次触发，游戏内部处理持续软降 |
| D-pad ↑ | 旋转 | 单次触发 |
| A | 硬降到底 | 单次触发 |
| B | 旋转 | 与 ↑ 相同 |
| X | 不使用 | onInput 忽略 |
| Y | 不使用 | onInput 忽略 |

## 键盘映射更新

| 按键 | GameAction | 行为 |
|------|-----------|------|
| `←` ArrowLeft / `A` | `left` | 按下立即触发，长按 DAS 重复（150ms） |
| `→` ArrowRight / `D` | `right` | 同上 |
| `↓` ArrowDown / `S` | `down` | 按下触发一次 |
| `↑` ArrowUp / `W` | `up` | 按下触发一次 |
| `J` / `Z` | `a` | 硬降（等同 A 键） |
| `K` / `X` | `b` | 旋转（等同 B 键） |
| `Space` | `a` | 硬降（等同 A 键） |
| `P` / `Escape` | 暂停/恢复 | 不受 enabled 控制 |

> 注意：`↑/W` 从 `rotate` 改为 `up`，`Space` 从 `drop` 改为 `b`。语义由游戏侧处理。

## 实现方案

### 1. 修改 `src/games/types.ts`

GameAction 类型重定义：

```typescript
export type GameAction = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'pause'
```

### 2. 重写 `src/components/GamePad.tsx` + `GamePad.module.css`

**组件结构：**

```tsx
<div className={styles.container}>
  {/* 左侧 D-pad */}
  <div className={styles.dpad}>
    <DpadButton direction="up" ... />
    <DpadButton direction="left" ... />
    <DpadButton direction="right" ... />
    <DpadButton direction="down" ... />
  </div>

  {/* 右侧 ABXY */}
  <div className={styles.abxy}>
    <ActionButton name="y" ... />
    <ActionButton name="x" ... />
    <ActionButton name="b" ... />
    <ActionButton name="a" ... />
  </div>
</div>
```

**CSS 布局要点：**

- 外层 container: `display: flex; justify-content: space-between`
- D-pad: 3×3 CSS Grid，只填充上下左右 4 个位置，中心和角落留空
- ABXY: 同样 3×3 CSS Grid，菱形排布

**RepeatButton 逻辑**复用现有实现，仅 D-pad ← → 启用 repeat。

### 3. 修改 `src/games/tetris/TetrisGame.ts`

`onInput` 方法的 switch 映射改为新 action：

```typescript
onInput(action: GameAction): void {
  if (this.state !== 'playing' || !this.currentPiece) return

  switch (action) {
    case 'left':
      this.movePiece(-1, 0)
      break
    case 'right':
      this.movePiece(1, 0)
      break
    case 'down':
      this.softDropping = true
      this.dropTimer = SOFT_DROP_INTERVAL
      break
    case 'up':
    case 'b':
      this.rotatePiece()
      break
    case 'a':
      this.hardDrop()
      break
    // x, y, pause: 不处理
  }
}
```

### 4. 修改 `src/hooks/useKeyboard.ts`

键盘映射表更新：

```typescript
const DEFAULT_KEY_MAP: Record<string, KeyMapping> = {
  ArrowLeft:  { action: 'left',  repeat: true },
  ArrowRight: { action: 'right', repeat: true },
  ArrowDown:  { action: 'down',  repeat: false },
  ArrowUp:    { action: 'up',    repeat: false },
  KeyA:       { action: 'left',  repeat: true },
  KeyD:       { action: 'right', repeat: true },
  KeyS:       { action: 'down',  repeat: false },
  KeyW:       { action: 'up',    repeat: false },
  KeyJ:       { action: 'a',     repeat: false },
  KeyZ:       { action: 'a',     repeat: false },
  KeyK:       { action: 'b',     repeat: false },
  KeyX:       { action: 'b',     repeat: false },
  Space:      { action: 'a',     repeat: false },
}
```

### 5. 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `src/hooks/useGame.ts` | handleAction 透传 action，不关心具体类型 |
| `src/pages/GamePage.tsx` | 只调用 `<GamePad onAction={handleAction}>` 和 `useKeyboard`，接口不变 |

## 验证方式

1. `npm run build` 无类型错误
2. 手机端（iPhone 16 Pro / Pro Max）测试：
   - [ ] D-pad 十字键视觉正确，触控区域足够大
   - [ ] ABXY 菱形排列，颜色正确
   - [ ] D-pad ← → 长按连续移动
   - [ ] D-pad ↑ 旋转
   - [ ] D-pad ↓ 软降
   - [ ] A 硬降到底
   - [ ] B 旋转
   - [ ] X Y 无反应（不报错）
   - [ ] 横屏/竖屏布局不溢出
3. 桌面端键盘测试：
   - [ ] 方向键 / WASD 对应 up/down/left/right
   - [ ] J/Z/Space 对应 A（硬降）
   - [ ] K/X 对应 B（旋转）
   - [ ] P/Escape 暂停恢复
   - [ ] 左右键长按 DAS 重复

## 关联文档

- [docs/design/game-page.md](../../design/game-page.md) — 游戏页面设计（手柄布局图需同步更新）
- [docs/dev/game-api.md](../game-api.md) — GameAction 接口定义（需同步更新）
- [docs/dev/M1/feature-001-keyboard-controls.md](../M1/feature-001-keyboard-controls.md) — 之前的键盘控制实现
