# 技术架构

## 技术选型

| 层面 | 选择 | 说明 |
|------|------|------|
| UI 框架 | React 18 + TypeScript | 管理游戏大厅、路由、状态 |
| 游戏渲染 | Canvas 2D | 每个游戏独立 Canvas |
| 构建工具 | Vite | 快速开发体验 |
| 路由 | React Router v6 | / 大厅、/game/:id 游戏页 |
| 样式 | CSS Modules | 每个组件一个 `.module.css`，类名自动隔离，不引入 UI 框架 |
| PWA | Vite PWA Plugin | Service Worker + Manifest |
| 部署 | GitHub Pages | GitHub Actions 自动构建 |

## 项目结构

此结构为高层概要，按需维护。各游戏内部模块拆分见对应开发计划（如 `docs/dev/M1/PLAN.md`）。

```
src/
  App.tsx                — 路由、全局布局
  pages/
    Home.tsx             — 游戏大厅（游戏列表）
    GamePage.tsx         — 通用游戏容器页面
  games/
    registry.ts          — 游戏注册表
    types.ts             — 统一游戏接口定义
    tetris/
      TetrisGame.ts      — 核心游戏逻辑（纯 JS 类）
      assets/            — 音效
  components/
    GamePad.tsx          — 虚拟手柄（通用）
    ScoreBoard.tsx       — 计分板
  hooks/
    useGame.ts           — 游戏生命周期 hook
    useKeyboard.ts       — 键盘控制 hook（方向键 + WASD）
  pwa/
    service-worker.js
    manifest.json
```

## 架构分层

```
┌─────────────────────────────────────┐
│           React UI 层               │
│  (路由、页面、组件、虚拟手柄)         │
├─────────────────────────────────────┤
│         useGame Hook                │
│  (持有游戏实例引用，事件桥接)         │
├─────────────────────────────────────┤
│       Game Instance（纯 JS）         │
│  (游戏循环、逻辑、Canvas 渲染)        │
├─────────────────────────────────────┤
│         Canvas 2D API               │
└─────────────────────────────────────┘
```

### 关键原则

**游戏核心不依赖 React。** GameInstance 是纯 TypeScript 类，内部用 `requestAnimationFrame` 驱动游戏循环，自己管理 Canvas 绑定。这样做的好处：

- 游戏逻辑可独立测试
- 不受 React 渲染周期影响，性能可控
- 后续移植到其他框架（或脱离框架）零成本

**时间驱动而非帧驱动。** 游戏循环使用 deltaTime 计算状态更新，不依赖固定帧率。iPhone 16 Pro/Max 是 120Hz，如果按帧计数，方块下落速度会比预期快一倍。

```typescript
// 正确做法
update(deltaTime: number) {
  this.dropTimer += deltaTime;
  if (this.dropTimer >= this.dropInterval) {
    this.dropTimer = 0;
    this.dropPiece();
  }
}

// 错误做法
update() {
  this.frameCount++;
  if (this.frameCount % 60 === 0) { // 120Hz 下会变成 0.5 秒
    this.dropPiece();
  }
}
```

**React 通过 Hook 桥接。** `useGame` hook 负责：

- 创建/销毁游戏实例
- 将按钮事件转发给游戏实例
- 监听游戏事件（分数变化、游戏结束）更新 React 状态
- 处理页面可见性变化（切后台自动暂停）

## 路由设计

```
/               → Home（游戏大厅）
/game/tetris    → GamePage（俄罗斯方块）
/game/:id       → GamePage（通用，根据 id 从 registry 加载）
```

## 数据存储

仅使用 localStorage，不需要后端。

| Key | 内容 |
|-----|------|
| `pixelarcade_scores` | `{ tetris: 12, ... }` 各游戏最高分 |
| `pixelarcade_tetris_state` | 游戏暂停时的完整状态快照 |
| `pixelarcade_settings` | `{ soundEnabled: true }` |

## 音频方案

使用 Web Audio API（AudioContext），不使用 `<audio>` 标签。

- 在首次用户交互时初始化 AudioContext（iOS 要求）
- 音效文件预加载为 AudioBuffer
- 播放时创建 BufferSource 节点，一次性使用
- 全局音量控制和静音开关

## GameConfig 计算

`GameConfig` 的 `width`/`height` 由 `useGame` Hook 在 `init()` 调用前计算：

```typescript
// useGame Hook 中
const width = window.innerWidth;  // 如 393pt
const height = /* 屏幕高度 - 操控区高度 */;
const config: GameConfig = {
  width,
  height,
  devicePixelRatio: window.devicePixelRatio,
  soundEnabled: loadSetting('soundEnabled') ?? true,
};
gameInstance.init(canvasRef.current, config);
```

具体的游戏内部布局（棋盘尺寸、格子大小）由 GameInstance 根据传入的 `width`/`height` 自行计算。

## localStorage 读写职责

**所有 localStorage 操作统一由 React 侧（useGame Hook / 页面组件）负责**，GameInstance 不直接访问 localStorage。

| Key | 写入方 | 读取方 | 时机 |
|-----|--------|--------|------|
| `pixelarcade_scores` | useGame Hook | Home 页面 | 游戏结束时写入，大厅页加载时读取 |
| `pixelarcade_{gameId}_state` | useGame Hook | GamePage | 暂停/切后台时写入，进入游戏页时读取 |
| `pixelarcade_settings` | 设置组件 | useGame Hook | 用户切换时写入，游戏初始化时读取 |

## 本地开发

```bash
npm install              # 安装依赖
npm run dev -- --host    # 本地开发（手机访问加 --host）
npm run build            # 构建生产版本
npm run preview          # 预览生产构建
```

## 屏幕适配

目标设备固定为 iPhone 16 Pro / Pro Max：

- 使用 `viewport-fit=cover` 处理安全区域
- `useGame` Hook 根据 `window.innerWidth` 计算 Canvas 逻辑尺寸，传入 GameConfig
- Canvas 分辨率 = 逻辑尺寸 × `devicePixelRatio`（3x）
- 操控区高度固定为屏幕高度的 35-40%
