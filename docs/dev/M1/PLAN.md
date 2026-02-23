# M1 开发计划 — 基础设施 + 首个游戏

## 目标

完成从"空壳"到"可在手机上玩俄罗斯方块"的全部工作。交付物：一个可部署到 GitHub Pages、能在 iPhone 上添加到主屏幕并离线使用的 PWA。

## 设计文档索引

本计划基于以下设计文档，开发时应以设计文档为准：

| 文档 | 对应阶段 | 关注内容 |
|------|---------|---------|
| [tetris.md](../../design/tetris.md) | 阶段 1 | 棋盘参数、方块定义、旋转/Wall Kick、速度、计分、操控、游戏结束条件 |
| [visual-guide.md](../../design/visual-guide.md) | 阶段 1、2、3 | 配色方案、方块颜色、按钮样式、字体、动画、Canvas 像素渲染、覆盖层样式 |
| [game-page.md](../../design/game-page.md) | 阶段 2 | 页面布局、用户流程、状态机、覆盖层交互、存档恢复 |
| [game-api.md](../game-api.md) | 阶段 1、2 | GameInstance 接口、GameAction、GameConfig、存档职责划分、注册方式 |
| [architecture.md](../architecture.md) | 阶段 1、2 | 架构分层、关键原则（纯 TS / deltaTime）、localStorage 职责、GameConfig 计算 |
| [home.md](../../design/home.md) | 阶段 3 | 大厅布局、卡片交互、最高分显示、音效开关 |
| [pwa.md](../pwa.md) | 阶段 4 | Manifest、Service Worker、iOS meta 标签、音频限制、后台恢复 |
| [deploy.md](../deploy.md) | 阶段 5 | GitHub Actions 配置、base 路径、发布流程 |

## 已完成

- [x] 项目脚手架（Vite + React 19 + TS + React Router v7）
- [x] 设计文档体系
- [x] 类型定义（`types.ts`：GameMeta / GameInstance / GameAction / GameConfig / GameEntry）
- [x] 基础路由（`/` → Home, `/game/:id` → GamePage）
- [x] PWA 插件接入（`vite-plugin-pwa` 已配置 manifest + workbox）
- [x] 页面/组件空壳（Home、GamePage、GamePad、ScoreBoard 有基本结构但功能未实现）

## 开发阶段

分 5 个阶段，每阶段可独立验收。

---

### 阶段 1：俄罗斯方块核心引擎 ✅

**目标**：纯 TS 实现游戏逻辑，不依赖 React，可通过 Canvas 看到方块下落、移动、旋转、消行。

**设计依据**：[tetris.md](../../design/tetris.md)（玩法规则）、[visual-guide.md](../../design/visual-guide.md)（渲染规范）、[game-api.md](../game-api.md)（接口定义）、[architecture.md](../architecture.md)（架构原则）

#### 产出文件

```
src/games/tetris/
  constants.ts       — 棋盘尺寸、颜色表、速度参数等常量
  types.ts           — Tetris 内部类型（Piece、Board、方块形状定义等）
  pieces.ts          — 5 种方块的形状矩阵 + 4 个旋转状态
  board.ts           — 棋盘逻辑（碰撞检测、放置方块、消行、判定游戏结束）
  bag.ts             — 5-bag 随机生成器
  TetrisGame.ts      — GameInstance 实现（主入口，组装上述模块）
  renderer.ts        — Canvas 渲染（棋盘、方块、Ghost Piece、网格线、HUD）
```

> **注**：`architecture.md` 项目结构为高层概要，tetris/ 目录仅列出 `TetrisGame.ts` 主入口。实际开发按本计划细拆模块（constants / types / pieces / board / bag / renderer）。

#### 任务清单

1. **常量与类型定义**
   - `constants.ts`：棋盘 10×18、格子 36pt（[tetris.md #棋盘参数](../../design/tetris.md#棋盘参数)）、颜色表含主色/亮色/暗色（[tetris.md #方块配色](../../design/tetris.md#方块配色)）、下落间隔 1000ms、软降 100ms、锁定延迟 500ms（[tetris.md #速度与难度](../../design/tetris.md#速度与难度)）
   - `types.ts`：`PieceType`（I/O/T/L/J）、`Piece`（type + rotation + position）、`Board`（二维数组）

2. **方块数据**（`pieces.ts`）
   - 5 种方块的 4 个旋转态，使用二维布尔矩阵表示（[tetris.md #方块定义](../../design/tetris.md#方块定义)）
   - O 型只有 1 个旋转态

3. **棋盘逻辑**（`board.ts`）
   - `createBoard(cols, rows)` → 空棋盘
   - `isValidPosition(board, piece, x, y, rotation)` → 碰撞检测
   - `lockPiece(board, piece)` → 将方块固定到棋盘
   - `clearLines(board)` → 消行，返回消除行数（[tetris.md #计分规则](../../design/tetris.md#计分规则)）
   - `isGameOver(board, piece)` → 新方块生成位置已被占据（[tetris.md #游戏结束条件](../../design/tetris.md#游戏结束条件)）

4. **随机包**（`bag.ts`）
   - 5-bag 算法（[tetris.md #随机方块生成](../../design/tetris.md#随机方块生成)）：打乱 5 种方块，依次取出，取完重新装包
   - `next()` 返回下一个 PieceType
   - `peek()` 返回下一个但不消费（用于"下一个"预览）

5. **TetrisGame 类**（`TetrisGame.ts`）
   - 实现 `GameInstance` 接口全部方法（[game-api.md](../game-api.md)）
   - 游戏循环：`requestAnimationFrame` + deltaTime 驱动（[architecture.md #关键原则](../architecture.md#关键原则)：时间驱动而非帧驱动）
   - 下落计时：每 1000ms 自动下落一格
   - `onInput(action)` 响应：left/right/down/drop/rotate/pause
   - 旋转：简化 SRS wall kick，3 个测试位（[tetris.md #Wall Kick 规则](../../design/tetris.md#wall-kick-规则简化-srs)）
   - 锁定延迟：触底后 500ms 内可移动/旋转，超时自动锁定
   - 状态管理：idle → playing → paused → over
   - `saveState()` / `loadState()`：序列化/反序列化完整游戏状态（[game-api.md #存档职责划分](../game-api.md#存档职责划分)：GameInstance 仅负责序列化，不访问 localStorage）

6. **Canvas 渲染**（`renderer.ts`）
   - DPR 处理（[visual-guide.md #游戏区域像素渲染](../../design/visual-guide.md#游戏区域像素渲染)）：canvas 尺寸 = 逻辑尺寸 × dpr，ctx.scale(dpr, dpr)
   - `ctx.imageSmoothingEnabled = false`
   - 绘制：网格线（`#1E2A4A`）、棋盘背景（`#16213E`）、已锁定方块（3 层颜色立体感）、当前方块、Ghost Piece（半透明）（[tetris.md #功能列表](../../design/tetris.md#功能列表规划清单)）
   - HUD：下一个方块预览、星星计分（[tetris.md #操控方案](../../design/tetris.md#操控方案) 布局图）

#### 验收标准

- 写一个临时的测试页面或在 GamePage 中临时创建 TetrisGame 实例，Canvas 显示棋盘，方块自动下落
- 可通过临时绑定的键盘事件控制移动、旋转、软降、Hard Drop（仅开发调试用，阶段 2 会通过 GamePad 正式接入）
- 消行时行消失、上方行下落
- 游戏结束时状态变为 `over`
- 控制台无报错

---

### 阶段 2：useGame Hook + GamePage 集成 ✅

**目标**：打通 React 层与游戏引擎的桥梁，GamePage 完整可用（含倒计时、暂停、游戏结束覆盖层）。

**设计依据**：[game-page.md](../../design/game-page.md)（页面布局、用户流程、状态机、覆盖层）、[architecture.md](../architecture.md)（Hook 职责、localStorage 读写）、[visual-guide.md](../../design/visual-guide.md)（覆盖层样式）、[tetris.md #操控方案](../../design/tetris.md#操控方案)（长按规格）

#### 修改文件

```
src/hooks/useGame.ts     — 完整实现
src/pages/GamePage.tsx   — 接入 Canvas + Hook + 覆盖层
src/pages/GamePage.module.css
src/components/GamePad.tsx  — 长按连续移动
src/components/GamePad.module.css
src/games/registry.ts    — tetris status 改为 active，接入 TetrisGame
```

#### 任务清单

1. **useGame Hook 完整实现**（[architecture.md #React 通过 Hook 桥接](../architecture.md#关键原则)、[architecture.md #localStorage 读写职责](../architecture.md#localstorage-读写职责)）
   - 接收 `gameId` 参数，从 registry 查找 GameEntry
   - `useEffect` 中：创建 GameInstance → `init(canvas, config)` → 注册回调
   - GameConfig 计算（[architecture.md #GameConfig 计算](../architecture.md#gameconfig-计算)）：width = `window.innerWidth`，height = 屏幕高度 - 控制区高度
   - 回调桥接：`onScoreChange` → `setScore()`，`onGameOver` → `setState('over')`，`onStateChange` → `setState()`
   - 暴露方法：`start()`, `pause()`, `resume()`, `handleAction(action)`, `restart()`
   - `visibilitychange` 监听：hidden 时自动暂停 + 保存状态（[pwa.md #后台恢复](../pwa.md#后台恢复)）
   - `pagehide` 监听：保存状态
   - 存档读写：`pixelarcade_{gameId}_state`（JSON 字符串）
   - 检测存档：暴露 `hasSavedState` 布尔值
   - 清理：`destroy()` + 移除事件监听

2. **GamePage 覆盖层系统**（[game-page.md #用户流程](../../design/game-page.md#用户流程) 全部 7 个步骤）
   - 页面状态机（[game-page.md #状态机](../../design/game-page.md#状态机)）：`idle` → `countdown` → `playing` → `paused` → `over`
   - 倒计时覆盖层（[game-page.md #3. 倒计时启动](../../design/game-page.md#3-倒计时启动)）：3 → 2 → 1，每个 800ms，48px 像素字体居中（[visual-guide.md #覆盖层](../../design/visual-guide.md#覆盖层--弹窗样式)），结束后调用 `start()`
   - 存档恢复覆盖层（[game-page.md #2. 存档恢复](../../design/game-page.md#2-存档恢复有存档时)）：检测到存档时显示"⭐ 上次获得 N 颗星星"+"继续游戏 / 新游戏"
   - 暂停覆盖层（[game-page.md #5. 暂停](../../design/game-page.md#5-暂停)）："继续 / 返回大厅"
   - 游戏结束覆盖层（[game-page.md #6. 游戏结束](../../design/game-page.md#6-游戏结束)）：星星总数 + "再来一局 / 返回大厅"，最高分判定 + "新纪录！"
   - 退出确认覆盖层（[game-page.md #7. 退出确认](../../design/game-page.md#7-退出确认)）：返回按钮点击时弹出"确定退出游戏？（进度会自动保存）"+"退出 / 继续玩"
   - 覆盖层样式（[visual-guide.md #覆盖层](../../design/visual-guide.md#覆盖层--弹窗样式)）：`rgba(26,26,46,0.85)` 背景，`#FFD600` 文字，按钮 `#2D2D5E` 填充 + `#4A4A8A` 描边

3. **GamePage 布局调整**（[game-page.md #页面布局](../../design/game-page.md#页面布局)）
   - 顶部栏（[game-page.md #顶部栏](../../design/game-page.md#顶部栏)）：返回 [←]、暂停 [⏸]、静音 [🔇]，最小触控 44×44pt
   - 中部：Canvas 元素，ref 绑定到 useGame，占屏幕高度 60-65%
   - 底部：GamePad 组件，占屏幕高度 35-40%，事件接入 Hook

4. **GamePad 长按支持**（[tetris.md #按钮规格](../../design/tetris.md#按钮规格)）
   - 左/右按钮：`pointerdown` 时立即触发一次 + 启动 150ms 间隔定时器
   - `pointerup` / `pointerleave` / `pointercancel` 时清除定时器
   - 其他按钮保持单次触发

5. **Registry 更新**（[game-api.md #注册方式](../game-api.md#注册方式)）
   - `createInstance: () => new TetrisGame()`
   - `status: 'active'`

#### 验收标准

- 从大厅点击俄罗斯方块卡片 → 进入游戏页 → 倒计时 3-2-1 → 游戏开始
- 虚拟手柄可操控，长按左/右连续移动
- 暂停按钮可用，暂停覆盖层正常显示
- 切后台 → 自动暂停 → 切回来看到暂停覆盖层
- 游戏结束覆盖层显示星星，"再来一局"重新开始
- 返回按钮弹出确认，退出后回到大厅

---

### 阶段 3：游戏大厅 ✅

**目标**：Home 页功能完整——游戏卡片可点击、显示历史最高分、音效开关可用。

**设计依据**：[home.md](../../design/home.md)（布局、卡片、交互、数据）、[visual-guide.md](../../design/visual-guide.md)（字体字号、动画、按钮样式）

#### 修改文件

```
src/pages/Home.tsx
src/pages/Home.module.css
```

#### 任务清单

1. **最高分读取**（[home.md #数据](../../design/home.md#数据)）
   - 从 `localStorage` 读取 `pixelarcade_scores`（JSON 对象）
   - 每个卡片显示对应游戏的最高星星数，无记录显示"⭐ —"

2. **音效开关**（[home.md #交互](../../design/home.md#交互)）
   - 读写 `pixelarcade_settings` 的 `soundEnabled` 字段
   - 按钮点击切换，图标跟随状态变化（🔊 / 🔇）

3. **卡片交互完善**（[home.md #游戏卡片](../../design/home.md#游戏卡片)、[home.md #交互](../../design/home.md#交互)）
   - `coming_soon` 卡片点击时轻微抖动动画（CSS animation）
   - `active` 卡片点击进入游戏，淡入过渡（200ms opacity，[visual-guide.md #动画](../../design/visual-guide.md#动画)）

4. **Press Start 2P 字体加载**（[visual-guide.md #字体](../../design/visual-guide.md#字体)）
   - `index.html` 中添加 Google Fonts `<link>`
   - 确认字体正确应用于大厅标题（24px）、卡片名称（14px）、计分（[visual-guide.md #字号](../../design/visual-guide.md#字号)）

#### 验收标准

- 大厅显示俄罗斯方块卡片（active）+ 占位卡片（coming_soon + 锁定样式）
- 玩完一局回到大厅，最高分正确显示
- 音效开关切换正常
- 字体加载正确

---

### 阶段 4：PWA 完善 ✅

**目标**：可添加到 iPhone 主屏幕，全屏运行，离线可用。

**设计依据**：[pwa.md](../pwa.md)（Manifest、Service Worker、iOS 特殊处理、图标）

#### 修改文件

```
index.html                 — meta 标签
public/icons/              — PWA 图标（占位图标即可）
vite.config.ts             — 确认 PWA 配置完整
```

#### 任务清单

1. **index.html meta 标签**（[pwa.md #iOS 特殊处理 - 状态栏](../pwa.md#状态栏)）
   - `viewport-fit=cover`
   - `apple-mobile-web-app-capable=yes`
   - `apple-mobile-web-app-status-bar-style=black-translucent`
   - `apple-touch-icon` 指向 180px 图标

2. **PWA 图标**（[pwa.md #图标制作](../pwa.md#图标制作)）
   - 创建占位图标：icon-192.png、icon-512.png、apple-touch-icon.png（180px）、favicon.ico（32px）
   - 像素风格，简单方块图案即可（后续可替换精致版本）

3. **离线验证**
   - `npm run build` → `npm run preview`
   - 开启后断网，确认页面仍可加载和游戏

4. **Service Worker 确认**（[pwa.md #Service Worker](../pwa.md#service-worker)）
   - 检查 `vite-plugin-pwa` 生成的 SW 是否正确 precache 所有资源
   - `navigateFallback` 确认 SPA 路由正常

#### 验收标准

- iPhone Safari 打开 → "添加到主屏幕" → 全屏 standalone 模式运行
- 断网后重新打开仍可正常使用
- 状态栏透明，内容不被遮挡

---

### 阶段 5：部署上线 ✅

**目标**：push 到 GitHub 自动构建部署，手机可通过链接访问。

**设计依据**：[deploy.md](../deploy.md)（Actions 配置、base 路径、发布流程）

#### 新增文件

```
.github/workflows/deploy.yml
```

#### 任务清单

1. **GitHub Actions 工作流**（[deploy.md #GitHub Actions 自动部署](../deploy.md#github-actions-自动部署)）
   - 按 deploy.md 中的 YAML 配置创建 `deploy.yml`
   - 触发条件：push 到 master 分支

2. **GitHub 仓库设置**（[deploy.md #GitHub Pages 设置](../deploy.md#github-pages-设置)）
   - Settings → Pages → Source 选择 "GitHub Actions"

3. **Vite base 路径确认**（[deploy.md #Vite base 路径](../deploy.md#vite-base-路径)）
   - 当前已配置 `base: '/pixel-arcade/'`，确认与仓库名一致
   - 同步确认 PWA manifest 的 `start_url` 和 `scope`（[pwa.md #PWA 与 base 路径](../pwa.md#pwa-与-base-路径)）

4. **端到端验证**
   - push 后等 Actions 完成
   - 手机访问 `https://hongfeixu.github.io/pixel-arcade/`
   - 验证游戏可玩、PWA 可安装

#### 验收标准

- GitHub Actions 构建成功（绿色）
- 线上地址可访问，游戏功能正常
- 可添加到主屏幕

---

## 开发顺序与依赖

```
阶段 1（引擎）
  ↓
阶段 2（集成）  ←  依赖阶段 1 的 TetrisGame
  ↓
阶段 3（大厅）  ←  依赖阶段 2 的 localStorage 分数写入
  ↓
阶段 4（PWA）   ←  独立，但需要阶段 1-3 完成后才有意义验证
  ↓
阶段 5（部署）  ←  所有功能就绪后上线
```

## M1 不包含的内容（推到 M2）

以下功能在 M1 中**故意不做**，避免范围膨胀：

- 音效（M2 音效系统）
- 消行闪烁动画、星星飞入动画、震屏效果（M2 视觉反馈，[tetris.md #反馈设计](../../design/tetris.md#反馈设计)）
- 方块落地弹跳动画（M2）
- 游戏结束逐行灰化动画（M2）
- iOS 启动画面（M2，[pwa.md #启动画面](../pwa.md#启动画面)）
- 震动反馈 `navigator.vibrate()`（M2，[tetris.md #震动](../../design/tetris.md#震动)）

## 完成后需同步更新的文档

- `docs/dev/architecture.md` — 更新项目结构（tetris/ 目录细化）
- `docs/PROGRESS.md` — 记录 M1 完成状态
- `docs/PLAN.md` — M1 打勾
