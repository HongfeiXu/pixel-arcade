# 项目路线图

## 愿景

打造一个面向幼儿的像素风经典小游戏合集 PWA，可持续扩展新游戏。

## 里程碑

### M1 — 基础设施 + 首个游戏 ✅

- [x] 项目脚手架搭建（Vite + React + TS）
- [x] 设计文档编写
- [x] 通用游戏框架（GameInstance 接口、useGame Hook、GamePage、GamePad）
- [x] 俄罗斯方块核心玩法
- [x] 游戏大厅首页
- [x] PWA 配置 & 离线支持
- [x] GitHub Pages 部署

### M2 — 打磨体验

- [x] 经典手柄布局（D-pad + ABXY）— [feature-001](dev/M2/feature-001-gamepad-redesign.md)
- [x] 背景音乐（BGM 循环播放，跟随游戏状态暂停/恢复）
- [x] 宽屏适配（max-width 480px 居中，防止桌面端布局失控）
- [x] 进度本地记录（暂停返回大厅后，再进游戏恢复到暂停时的状态）
- [x] 最高分实时更新（游戏中超过最高分时立即刷新，不等结束）— [feature-002](dev/M2/feature-002-realtime-highscore.md)
- [x] 音效系统（按键、消行、Game Over 等短音效）— [feature-004](dev/M2/feature-004-sfx.md)
- [x] 视觉反馈动画（消行闪白、震屏）— [feature-003](dev/M2/feature-003-visual-feedback.md)
- [x] iOS 启动画面 & 图标

### M3 — 第二个游戏

- [x] 新游戏选型 & 设计文档 — 反重力方块 [feature-005](dev/M3/feature-005-anti-gravity.md)
- [x] 实现 & 注册到游戏大厅

### M4 — 第三个游戏

- [x] 新游戏选型 & 设计文档 — 贪吃蛇（简单版） [feature-006](dev/M4/feature-006-snake.md)
- [ ] 实现 & 注册到游戏大厅

## 游戏规划

| 游戏 | 状态 | 说明 |
|------|------|------|
| 俄罗斯方块（简单） | ✅ 已完成（M1） | 5 种方块（无 S/Z），适合幼儿 |
| 俄罗斯方块 | ✅ 已完成（M1） | 标准 7 种方块 |
| 反重力方块 | ✅ 已完成（M3） | 方块从底部上升，标准玩法镜像 |
| 贪吃蛇（简单） | 🛠 设计完成（M4） | 15×15 方形、穿墙、单一食物、恒速慢节奏 |
| 待定 | 💡 规划中 | — |
