# Feature-001: 键盘操作支持

## 背景

当前游戏仅支持触屏 GamePad 操作，桌面端（Chrome Windows 11）用户无法用键盘控制。需要新增键盘映射，让桌面测试和游玩更方便。键盘操作与现有 GamePad 共存，互不影响。

## 键位映射

| 按键 | GameAction | 行为 |
|------|-----------|------|
| `←` ArrowLeft / `A` | `left` | 按下立即触发，长按 DAS 重复（150ms 间隔） |
| `→` ArrowRight / `D` | `right` | 同上 |
| `↓` ArrowDown / `S` | `down` | 按下触发一次（游戏内部处理持续软降） |
| `↑` ArrowUp / `W` | `rotate` | 按下触发一次，需松开重按 |
| `Space` | `drop` | 硬降，按下触发一次，需松开重按 |
| `P` / `Escape` | 暂停/恢复 | 切换暂停状态，不受 enabled 控制 |

## 控制流

```
键盘 keydown/keyup (window)
  │
  ▼
useKeyboard Hook
  ├── DAS 键 (←/A, →/D): 立即触发 + setInterval 150ms 重复
  ├── 单次键 (↓/S, ↑/W, Space): keydown 触发一次，忽略原生 repeat
  └── 暂停键 (P/Escape): 调用 onPauseToggle
  │
  ▼
handleAction(action)  ← useGame 提供，与 GamePad 共用
handlePauseBtn()      ← GamePage 提供，处理暂停/恢复双向切换
```

## 实现方案

### 1. 新增 `src/hooks/useKeyboard.ts`

键盘控制 Hook，约 100 行。

**接口设计：**

```typescript
interface UseKeyboardOptions {
  onAction: (action: GameAction) => void
  onPauseToggle: () => void
  enabled: boolean              // phase === 'playing' 时为 true
  keyMap?: Record<string, KeyMapping>  // 可选自定义键位
}

function useKeyboard(options: UseKeyboardOptions): void
```

**核心逻辑：**

- 用 `useRef` 存储回调引用，避免事件监听器频繁重新绑定
- keydown 时：
  - 暂停键 → 调用 `onPauseToggle()`（不受 `enabled` 限制）
  - 已映射键 → `e.preventDefault()` 阻止默认行为（箭头滚动、空格激活按钮）
  - 忽略 `e.repeat`（浏览器原生重复），用自定义 DAS
  - DAS 键 → 立即触发 + 启动 `setInterval(150ms)` 重复
  - 非 DAS 键 → 触发一次
- keyup 时：清理对应键的 DAS 定时器
- blur 时：清理所有 DAS 定时器（防止 Alt-Tab 后按键卡住）
- `enabled` 变 false 时：立即清理所有 DAS 定时器

### 2. 修改 `src/pages/GamePage.tsx`（3 行改动）

```typescript
// 新增 import
import { useKeyboard } from '../hooks/useKeyboard'

// 在 handlePauseBtn 定义之后添加：
useKeyboard({
  onAction: handleAction,
  onPauseToggle: handlePauseBtn,
  enabled: phase === 'playing',
})
```

### 3. 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `src/games/types.ts` | GameAction 已包含所有动作 |
| `src/hooks/useGame.ts` | handleAction 已可直接使用 |
| `src/components/GamePad.tsx` | 与键盘共存，互不影响 |
| `src/games/tetris/TetrisGame.ts` | onInput 已处理所有动作 |

## 行为规格

### 游戏中 (phase === 'playing')

- 所有映射键正常响应
- 左右键长按触发 DAS 重复
- 下键触发一次软降（TetrisGame 内部处理持续下落）
- P/Escape 暂停游戏

### 暂停中 (phase === 'paused')

- P/Escape 恢复游戏（通过 handlePauseBtn → handleResume）
- 其他映射键无效（enabled = false）

### 其他阶段（countdown / restore / over / confirm-exit）

- P/Escape 调用 handlePauseBtn，但 state 非 playing/paused 时无操作（安全）
- 其他映射键无效

### 边界情况

- **窗口失焦**：blur 事件清理所有 DAS 定时器
- **左右同时按**：两个 DAS 独立运行，游戏逐帧处理（标准 Tetris 行为）
- **键盘 + 触屏同时**：均调用同一 handleAction，无冲突

## 验证方式

1. `npm run build` 无类型错误
2. 桌面 Chrome 手动测试：
   - [ ] 方向键移动、旋转
   - [ ] WASD 移动、旋转
   - [ ] 空格硬降
   - [ ] 左右键（Arrow / A D）长按 DAS 重复
   - [ ] P/Escape 暂停恢复
   - [ ] Alt-Tab 后无按键卡住
   - [ ] 暂停/倒计时/结算时移动键无效
   - [ ] 触屏 GamePad 仍正常工作

## 关联文档

- [docs/design/game-page.md](../../design/game-page.md) — 游戏页面设计
- [docs/dev/game-api.md](../game-api.md) — GameAction 接口定义
- [docs/dev/M1/TEST.md](TEST.md) — feature 清单
