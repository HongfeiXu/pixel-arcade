# Feature-002: 最高分实时更新

## 背景

当前最高分仅在 Game Over 时写入 localStorage，游戏过程中玩家无法感知"已经打破纪录"。改为实时检查，超分时立即更新存储和 UI 显示。

## 设计方案

### ScoreBoard 改造

显示当前分和最高分，格式：`⭐ 5 / 🏆 12`

```
┌─────────────────┐
│  ⭐ 5  / 🏆 12  │   ← 正常状态
│  ⭐ 13 / 🏆 13  │   ← 超越最高分，两者同步
└─────────────────┘
```

- 当 score > highScore 时，🏆 数字跟随 ⭐ 同步更新
- 首局游戏（无历史最高分）时，🏆 显示 `—`

### 数据流

```
TetrisGame.onScoreChange(score)
  → useGame: setScore(score)
  → useGame: if (score > highScore) { setHighScore(score); 写 localStorage }
  → ScoreBoard: 展示 score 和 highScore
```

### useGame 改动

1. 新增 `highScore` state，初始值从 localStorage 读取
2. `onScoreChange` 回调中，若 `score > highScore`：
   - `setHighScore(score)` 更新 React state
   - 写入 `localStorage.pixelarcade_scores`
3. `onGameOver` 回调中，去掉重复的最高分写入逻辑（已在 onScoreChange 中处理）
4. `restart` 时重新从 localStorage 读取 highScore（防止"上一局刷新的纪录"丢失）

### ScoreBoard 组件改动

```typescript
interface ScoreBoardProps {
  score: number
  highScore: number   // 新增
}
```

布局：水平排列，用 `/` 分隔，`⭐ {score} / 🏆 {highScore || '—'}`

### GamePage 改动

`<ScoreBoard score={score} highScore={highScore} />`

## 实现清单

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/hooks/useGame.ts` | 新增 highScore state，onScoreChange 中实时写入 |
| 2 | `src/components/ScoreBoard.tsx` | 接收 highScore prop，展示双分数 |
| 3 | `src/components/ScoreBoard.module.css` | 调整布局适配双分数 |
| 4 | `src/pages/GamePage.tsx` | 传递 highScore 给 ScoreBoard |

## 验证方式

1. `npm run build` 无类型错误
2. 首局游戏：🏆 显示 `—`，得分后 🏆 跟随更新
3. 非首局：🏆 显示历史最高分，超越后实时更新
4. Game Over 后返回大厅，Home 页最高分已是最新值
5. 重新开始游戏，🏆 显示正确的历史最高分
