# 游戏接口规范

## 概述

所有游戏模块必须实现统一接口，以便游戏大厅统一管理和调度。

## 游戏元数据

每个游戏在注册时需要提供：

```typescript
interface GameMeta {
  id: string;             // 唯一标识，如 'tetris'
  name: string;           // 显示名称，如 '俄罗斯方块'
  icon: string;           // 封面图路径
  status: 'active' | 'coming_soon';
  description?: string;   // 简短描述
}
```

## 游戏实例接口

```typescript
interface GameInstance {
  // 生命周期
  init(canvas: HTMLCanvasElement, config: GameConfig): void;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;

  // 状态
  getState(): 'idle' | 'playing' | 'paused' | 'over';
  getScore(): number;

  // 操控输入
  onInput(action: GameAction): void;

  // 事件回调
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onStateChange?: (state: 'idle' | 'playing' | 'paused' | 'over') => void;

  // 存档（仅负责序列化/反序列化，不直接读写 localStorage）
  saveState(): string;            // 将当前状态序列化为 JSON 字符串
  loadState(data: string): void;  // 从 JSON 字符串恢复状态
}
```

## 操控动作

```typescript
type GameAction = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'pause'
```

GameAction 采用"物理按键"而非"语义动作"，GamePad 只负责传递"按了什么"，每个游戏的 `onInput` 自行解释含义。不同游戏可以只响应其中部分动作，忽略不适用的。

## 游戏配置

```typescript
interface GameConfig {
  width: number;          // Canvas 逻辑宽度 (pt)
  height: number;         // Canvas 逻辑高度 (pt)
  devicePixelRatio: number;
  soundEnabled: boolean;
}
```

## 注册方式

在 `games/registry.ts` 中注册：

```typescript
import { TetrisGame } from './tetris/TetrisGame';

export const gameRegistry: GameEntry[] = [
  {
    meta: {
      id: 'tetris',
      name: '俄罗斯方块',
      icon: '/assets/tetris-cover.png',
      status: 'active',
    },
    createInstance: () => new TetrisGame(),
  },
  // 后续新游戏在此追加
];
```

## 存档职责划分

| 职责 | 负责方 |
|------|--------|
| 序列化/反序列化游戏状态 | `GameInstance.saveState()` / `loadState()` |
| 读写 localStorage | `useGame` Hook |
| 触发保存时机（暂停、visibilitychange、pagehide） | `useGame` Hook |
| 触发恢复时机（进入 GamePage 时检测存档） | `GamePage` 组件 |

`saveState()` 返回的 JSON 字符串由 Hook 存入 `pixelarcade_{gameId}_state`，Hook 取出后原样传给 `loadState()`。GameInstance 不需要知道存储细节。

## 新增游戏清单

添加一个新游戏需要：

1. 在 `src/games/` 下新建游戏目录
2. 实现 `GameInstance` 接口
3. 在 `registry.ts` 注册
4. 在 `docs/design/` 添加设计文档
5. 完成
