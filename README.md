# 🎮 Pixel Arcade — 像素游戏厅

一个面向幼儿的经典小游戏合集 PWA，像素风格，移动端优先。

## 在线体验

> 部署完成后补充 GitHub Pages 地址

## 技术栈

- **框架**：React + TypeScript
- **构建**：Vite
- **游戏渲染**：Canvas 2D
- **部署**：GitHub Pages + GitHub Actions
- **PWA**：Service Worker 离线缓存 + Standalone 模式

## 游戏列表

| 游戏 | 状态 |
|------|------|
| 俄罗斯方块 | 🚧 开发中 |

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发（手机访问加 --host）
npm run dev -- --host

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 项目结构（计划）

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
      TetrisView.tsx     — React 包装组件
      config.ts          — 难度配置与数值参数
      assets/            — 音效
  components/
    GamePad.tsx          — 虚拟手柄（通用）
    ScoreBoard.tsx       — 计分板
  hooks/
    useGame.ts           — 游戏生命周期 hook
  pwa/
    service-worker.js
    manifest.json
docs/
  design/                — 设计文档
  dev/                   — 技术文档
```

## 目标设备

- iPhone 16 Pro（393 × 852 pt）
- iPhone 16 Pro Max（440 × 956 pt）

不考虑 Android 和桌面端适配。

## 设计文档

- [俄罗斯方块设计](docs/design/tetris.md)
- [游戏大厅设计](docs/design/game-hall.md)
- [游戏容器页面设计](docs/design/game-page.md)
- [视觉规范](docs/design/ui-style.md)
- [游戏接口规范](docs/design/game-interface.md)
- [技术架构](docs/dev/architecture.md)
- [PWA 配置](docs/dev/pwa.md)
- [部署流程](docs/dev/deploy.md)
