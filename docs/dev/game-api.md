# 游戏接口规范

## 概述

所有游戏模块必须实现统一接口，以便游戏大厅统一管理和调度。

## 游戏元数据

每个游戏在注册时需要提供：

```typescript
interface GameMeta {
  id: string;             // 唯一标识，如 'tetris'
  name: string;           // 显示名称，如 '俄罗斯方块'
  icon: string;           // 大厅内置像素图标 key，如 'tetris'
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
  getNextPieceType?(): string | null;

  // 操控输入
  onInput(action: GameAction): void;

  // 事件回调
  onScoreChange?: (score: number) => void;
  onScoreGain?: (points: number) => void;
  onGameOver?: (finalScore: number) => void;
  onStateChange?: (state: 'idle' | 'playing' | 'paused' | 'over') => void;
  onSfx?: (event: SfxEvent) => void;

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

## 音效事件

```typescript
type SfxEvent =
  | 'move'
  | 'rotate'
  | 'softDrop'
  | 'lineClear'
  | 'tetris'
  | 'gameOver'
```

GameInstance 只通过 `onSfx` 抛出语义事件，不直接加载或播放音频。`useGame` 将事件桥接给 `useSfx`，由 React 侧统一处理音效开关、预加载和播放。

`softDrop` 表示"沿当前游戏重力方向加速"：标准俄罗斯方块中是向下软降，反重力方块中是向上速升。

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
import { AntiGravityGame } from './anti-gravity/AntiGravityGame';

export const gameRegistry: GameEntry[] = [
  {
    meta: {
      id: 'tetris',
      name: '俄罗斯方块',
      icon: 'tetris',
      status: 'active',
    },
    createInstance: () => new TetrisGame(),
  },
  {
    meta: {
      id: 'anti-gravity',
      name: '反重力方块',
      icon: 'anti-gravity',
      status: 'active',
    },
    createInstance: () => new AntiGravityGame(),
  },
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
3. 在 `registry.ts` 注册，并为大厅选择一个 `icon` key
4. 按需添加 `docs/design/` 或 `docs/dev/Mx/feature-xxx.md` 设计文档
5. 更新 `docs/PLAN.md`、`docs/PROGRESS.md` 和文档索引
