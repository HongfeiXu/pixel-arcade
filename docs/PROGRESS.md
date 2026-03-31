# 开发进度

## 当前阶段：M1 — 基础设施 + 首个游戏 ✅

### 已完成

- **项目初始化**：Vite + React 18 + TypeScript 脚手架搭建
- **设计文档**：完成俄罗斯方块玩法、视觉规范、游戏接口、页面设计、技术架构、PWA、部署方案
- **俄罗斯方块核心引擎**：纯 TS 实现（棋盘逻辑、方块旋转/Wall Kick、5-bag 随机、Canvas 渲染、Ghost Piece）
- **useGame Hook + GamePage 集成**：完整生命周期管理、覆盖层系统（倒计时/暂停/游戏结束/存档恢复/退出确认）
- **GamePad 长按支持**：左/右方向键 150ms 间隔连续触发
- **游戏大厅**：最高分显示、音效开关、卡片交互（抖动动画）
- **PWA 完善**：占位图标、meta 标签、离线 precache
- **部署配置**：GitHub Actions 工作流（push master → 自动构建部署）

## 当前阶段：M2 — 打磨体验 🚧

### 已完成

- **经典手柄布局**：D-pad + ABXY 经典手柄重构
- **XYAB 键映射**：XYAB 映射为方向键，移除硬降操作
- **S/Z 型方块**：补全标准 7 种方块
- **背景音乐**：`useBgm` Hook，倒计时和游戏中循环播放，暂停/结束时暂停，iOS 首次手势恢复播放，音频文件 `public/audio/bgm-pixel-balloons.ogg`，workbox 缓存支持
- **宽屏适配**：Home 和 GamePage 容器 `max-width: 480px; margin: 0 auto`，桌面端居中显示
