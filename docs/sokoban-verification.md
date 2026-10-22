# 推箱子本地验收

## 范围

在现有网页版 Pixel Arcade 增加推箱子；Godot 桌面工程未修改。本记录是发布前的本地验收；用户随后已授权通过 master 发布，实际部署结果以 GitHub Actions 与线上回读验收为准。

## 自动化与构建

主代理独立重跑：
- `npm run test:run`：11 文件，106 测试通过。
- `npm run build`：TypeScript、Vite 与 PWA 构建通过。
- 关卡测试用独立 BFS 求解全部 12 个手工关卡，经真实引擎回放并完整撤销。
- 已有 Browserslist 数据过期警告保留，未为此升级依赖。

## 浏览器实际验收

通过隔离 Chrome/CDP 访问本机 Vite 服务：
- 第一关点击向右即通关；撤销后恢复未通关状态，再次可通关。
- 进入第二关移动后刷新，`pixelarcade_sokoban_state` 的关卡、完成记录和完整操作历史保留。
- 393×852、440×956、320×568 三种实际仿真视口逐个选择全部 12 关，共 36 次布局检查：文档宽度等于视口宽度，无元素右侧越界，Canvas 尺寸均非零。
- 1280×720 TV 模式：Enter 打开菜单、方向键选择撤销、Enter 执行，实际存档历史正确变空；方向键 keyDown 后连续 5 次 autoRepeat 只产生一步。
- 选关菜单和第十关手机/TV 截图人工检查：人物、叉纹箱子、菱形目标清晰可辨。
- TV 大厅增加第五张卡片后发现 CSS Grid 自动压缩导致标题裁切，设置 `grid-auto-rows: max-content` 修复；所有卡片 `clientHeight === scrollHeight`，方向下可聚焦推箱子，Enter 正确进入游戏。
- 四款旧游戏路由均可打开，有非零 Canvas，显示准备倒计时。此项只是页面启动冒烟检查，不等于完整玩法回归。
- 测试用浏览器本地音效设置为关闭，不改变用户日常浏览器。

截图：
- [手机第十关](verification/sokoban-mobile.png)
- [TV 第十关](verification/sokoban-tv.png)

## 未验证事项

- Sony 实体遥控器的系统键值、返回键宿主行为、真实长按事件和 overscan。
- iPhone 实机触控与安装态 PWA。
- 本记录未包含线上部署及线上 Service Worker 升级结果，发布后单独验收。

## 本机预览

仅绑定回环地址，不开放局域网：

```bash
npm run dev -- --host 127.0.0.1 --port 5178 --strictPort
```

- 游戏：`http://127.0.0.1:5178/pixel-arcade/game/sokoban?tv=0`
- TV：`http://127.0.0.1:5178/pixel-arcade/game/sokoban?tv=1`
