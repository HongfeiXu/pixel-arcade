# CLAUDE.md

## 项目概述

Pixel Arcade — 面向幼儿的经典小游戏合集 PWA，像素风格，移动端优先。
目标设备：iPhone 16 Pro Max（440×956pt，主力）/ iPhone 16 Pro（393×852pt）。

在线地址：https://hongfeixu.github.io/pixel-arcade/

## 常用命令

- `npm run dev` — 启动开发服务器（Vite，默认 5173 端口）
- `npm run dev -- --host` — 局域网可访问（手机调试用）
- `npm run build` — TypeScript 检查 + Vite 构建（输出到 `dist/`）
- `npm run preview` — 本地预览构建产物

## 技术栈

- React 19 + TypeScript + Vite 7
- Canvas 2D 渲染（每个游戏独立 Canvas）
- React Router v7（`/` 大厅，`/game/:id` 游戏页）
- CSS Modules（每组件一个 `.module.css`，不引入 UI 框架）
- vite-plugin-pwa（Service Worker + Manifest，autoUpdate 策略）
- 部署：GitHub Pages + GitHub Actions（push master 自动触发）

## 项目结构

```
src/
  pages/           — 页面组件（Home, GamePage）
  components/      — 通用 UI 组件（GamePad, ScoreBoard, NextPiecePreview）
  games/
    types.ts       — GameInstance / GameMeta / GameAction 统一接口
    registry.ts    — 游戏注册表
    tetris/        — 俄罗斯方块实现
  hooks/
    useGame.ts     — 游戏生命周期 Hook，桥接 React 与 GameInstance
    useKeyboard.ts — 键盘控制 Hook（方向键 + WASD）
docs/
  design/          — 视觉和玩法设计文档
  dev/             — 技术架构、API、部署文档
  dev/M1/          — M1 测试迭代记录
```

## 核心架构原则

1. **游戏核心不依赖 React**：GameInstance 是纯 TS 类，rAF 驱动循环，时间驱动（deltaTime）
2. **useGame Hook** 负责：创建/销毁实例、转发按钮事件、监听回调、处理 visibilitychange
3. **localStorage 读写**由 React 侧统一负责，GameInstance 不直接访问
4. **动态 cellSize**：`cellSize = min(floor(W/COLS), floor(H/ROWS))`，从容器实际尺寸计算，数学保证不溢出
5. **Canvas 只画纯游戏区域**，HUD 信息（预览、计分）由 React 组件渲染

## 视觉规范

- 背景 `#1A1A2E`，主强调 `#FFD600`（黄），次强调 `#00E5FF`（青）
- 字体：Press Start 2P（像素字体），中文系统默认
- Canvas：`imageSmoothingEnabled = false`，DPR 3x 处理
- 动画：像素风阶梯感，逐格跳跃，避免丝滑缓动

## 编码约定

- 语言：中文注释，中文 commit message
- 样式：CSS Modules，不用内联 style（除动态计算值）
- 新游戏：实现 `GameInstance` 接口，注册到 `registry.ts`
- 不引入额外 UI 框架或状态管理库
- 不加不必要的注释或 JSDoc
- 不使用 `any` 或 `unknown` 类型

## 开发流程

- SPEC驱动开发，在开发前进行详尽的需求讨论，并生成对应的计划文档（PLAN.md、issue-xxx.md、feature-xxx.md 等），确认无误后，才进行实际代码编写。
- 每完成一个任务或阶段，立即在计划文档中标记完成
- 不要中途停，直到所有任务和阶段都完成
- 持续运行 `npm run build`（含 tsc）检查，确保没有引入类型错误

## 文档

完整文档索引：[docs/README.md](docs/README.md)

关键文档：
- [docs/PLAN.md](docs/PLAN.md) — 路线图与里程碑
- [docs/design/tetris.md](docs/design/tetris.md) — 俄罗斯方块玩法设计
- [docs/design/game-page.md](docs/design/game-page.md) — 游戏容器页面设计
- [docs/dev/architecture.md](docs/dev/architecture.md) — 技术架构
- [docs/dev/game-api.md](docs/dev/game-api.md) — 游戏接口规范
- [docs/dev/M1/TEST.md](docs/dev/M1/TEST.md) — M1 测试迭代
