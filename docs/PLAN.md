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
- [x] 实现 & 注册到游戏大厅
- [ ] 体验优化与收口

### M5 — TV Mode 📺

- [x] 遥控按键归一化、四列/线性焦点算法与自动化测试
- [x] 大厅四列安全区布局、焦点恢复与全遥控导航
- [x] GamePage 横屏三栏、Select → `a`、Back 两段式 phase 分流
- [x] PWA `orientation: natural` 与设计/开发文档同步
- [ ] Sony 真机按键、720p/1080p、PWA/WebView 与手机安装态验收

### M6 — 推箱子 📦

- [x] 儿童友好设计先行 — [feature-008](dev/feature-008-sokoban.md)
- [x] 纯 TS 核心、像素 Canvas、12 个手工关卡、无限撤销/重来/自由选关
- [x] React 专用页面与 useGame 自动存档/继续，大厅注册，不改旧游戏核心
- [x] 触屏大方向键、键盘单步、TV OK 可达菜单
- [x] 独立 BFS 全关求解 + 引擎回放、核心/输入/Hook 持久化测试及构建
- [x] 原版 12 关浏览器仿真验收（历史记录见 sokoban-verification.md）
- [x] 24 关扩展设计修订、12 个署名 Microban 布局、数字范围分页、Arcade 共享 UI/手柄 — [feature-009](dev/feature-009-sokoban-expansion.md)
- [x] 全 24 关独立 BFS / 最少推 / 引擎回放与完整撤销、旧版历史兼容、数字页焦点/手柄回归；195 测试与构建通过
- [ ] 本轮 24 关 + 统一界面浏览器竖屏/TV 验收（主代理接续）；Sony / iPhone 真机确认
- [ ] 本轮扩展发布（需另行授权；当前未提交/推送/发布）

## 游戏规划

| 游戏 | 状态 | 说明 |
|------|------|------|
| 俄罗斯方块（简单） | ✅ 已完成（M1） | 5 种方块（无 S/Z），适合幼儿 |
| 俄罗斯方块 | ✅ 已完成（M1） | 标准 7 种方块 |
| 反重力方块 | ✅ 已完成（M3） | 方块从底部上升，标准玩法镜像 |
| 贪吃蛇（简单） | 🛠 M4 优化中 | 已实现并注册到大厅；15×15 方形、穿墙、单一食物、恒速慢节奏 |
| 推箱子 | ✅ 本地实现（M6） | 24 关（原 12 + 署名 Microban 12），数字分页、共享 Arcade 界面与单步手柄；旧存档兼容，本轮浏览器/真机验收待完成 |
