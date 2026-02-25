# Issue-003: 继续游戏实际重新开局

## 现象

从 Tetris 返回大厅，再返回 Tetris，点击"继续游戏"后，不会恢复存档，而是重新开了一局。

## 根因

`GamePage.tsx` 第 32-38 行的 `useEffect` 监听 `hasSavedState` 变化：

```typescript
useEffect(() => {
  if (hasSavedState) {
    setPhase('restore')
  } else {
    startCountdown()  // ← 问题在此
  }
}, [hasSavedState])
```

**问题链路：**

1. 用户点击"继续游戏" → `handleRestoreLoad()` 执行
2. `loadSaved()` 调用 `instance.loadState(savedData)` → 游戏状态恢复 ✓
3. `loadSaved()` 内部设置 `setHasSavedState(false)` → 触发上述 effect 重新运行
4. effect 检测 `hasSavedState === false` → 走 else 分支 → 调用 `startCountdown()`
5. `startCountdown()` 倒计时结束后调用 `start()` → **`TetrisGame.start()` 重置所有状态**
6. 刚恢复的存档被覆盖 → 用户看到新游戏

**核心矛盾：** `hasSavedState` 从 `true` 变 `false` 有两种含义——"没有存档"和"存档已加载"，但 effect 无法区分，统一走了 `startCountdown()` 逻辑。

## 修复方案

`handleRestoreLoad` 不应通过 `setHasSavedState(false)` 触发 effect，而是直接控制 phase。将 `loadSaved()` 拆分为不修改 `hasSavedState` 的版本，或在 `handleRestoreLoad` 中跳过 effect。

**方案：让 effect 只在初始化时执行，不响应后续 `hasSavedState` 变化。**

### 改动

**`src/pages/GamePage.tsx`**

将 `hasSavedState` effect 改为只在初始阶段生效：

```typescript
useEffect(() => {
  if (phase !== 'idle') return  // 只在 idle 阶段决定初始流程
  if (hasSavedState) {
    setPhase('restore')
  } else {
    startCountdown()
  }
}, [hasSavedState, phase, startCountdown])
```

这样当 `handleRestoreLoad` 设置 `hasSavedState=false` 时，phase 已经是 `'playing'`，effect 直接 return，不会触发 `startCountdown()`。

## 关联文档

- [docs/design/game-page.md](../../design/game-page.md) — 游戏页面设计
