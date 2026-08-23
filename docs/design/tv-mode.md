# TV Mode 设计与实施说明

## 1. 状态与目标

- 状态：**首版已实现，待 Sony 真机验收**。
- 目标设备：Sony BRAVIA 遥控器、Sony Google TV / Android TV 浏览器，以及承载本项目的 Android TV WebView。
- 目标体验：横屏 16:9；大厅可用方向键移动焦点；确认键激活焦点按钮；游戏进行中方向键继续直接控制游戏；返回键暂停或回大厅。
- 保护边界：手机竖屏保持现有双列大厅、顶部栏、Canvas 与触控 GamePad，不改变触控热区、长按节奏或游戏规则。
- 非目标：本阶段不制作 Android 原生壳、不支持遥控器数字键/彩色键、不重构游戏核心、不把游戏动作改成 DOM 焦点事件。

## 2. 现状检查与约束

### 2.1 手机 UI

- `Home.tsx` 使用原生 `<button>` 卡片，DOM 本身可聚焦；`Home.module.css` 固定为最大宽度 480px、两列网格、竖向滚动。当前只有 `:active`，没有清晰的 `:focus-visible` 样式，也没有初始焦点或方向焦点策略。
- `GamePage.tsx` 是纵向三段式：顶部栏、Canvas、触控 GamePad；`GamePage.module.css` 同样固定最大宽度 480px。
- `GamePad` 的按钮使用 `pointerdown` 触发，并实现 150ms 长按重复。TV 模式应隐藏它，但不能卸载或改变手机分支的事件行为。
- 所有页面根节点 `overflow: hidden`。大厅只有网格自身可以纵向滚动，TV 焦点移动时必须显式 `scrollIntoView()`，否则将来游戏数量增加后可能出现焦点在屏外。

### 2.2 键盘与游戏输入

`useKeyboard.ts` 当前监听 `window.keydown/keyup`：

| 当前键 | 行为 |
|---|---|
| `ArrowLeft/Right` | 游戏左右，立即触发并以 150ms 自定义 DAS 重复 |
| `ArrowUp/Down` | 游戏上下，默认单次；Snake 中四方向都重复 |
| `WASD` | 对应方向 |
| `J/Z/Space` | `a` |
| `K/X` | `b` |
| `P/Escape` | 暂停/恢复，不受 `enabled` 控制 |

方向键在 `phase === 'playing'` 时会被 `preventDefault()` 并送入游戏。这一逻辑应保留；TV 改造必须在页面阶段层面分流，不能让 DOM 的默认空间焦点与游戏输入同时处理同一次方向键。

### 2.3 GamePage 状态

`GamePage.tsx` 当前包含 `idle → restore/countdown → playing → paused/over`，另有 `confirm-exit`。游戏中点击顶部返回按钮会暂停并进入退出确认；暂停页、结束页和恢复页都有两个纵向按钮。

TV 遥控器不适合在游戏中访问顶部栏焦点：一旦方向键控制游戏，就不能同时用它移动到暂停按钮。因此 TV 的主要路径应是“返回键暂停 → 覆盖层选择继续或返回大厅”，顶部按钮保留给手机触控。

### 2.4 大厅与 PWA

- `Home.tsx` 当前按注册顺序渲染 4 个可玩游戏，之后会自然扩展。
- `vite.config.ts` 的 manifest 设置 `orientation: 'portrait'`，与 TV 横屏目标冲突。
- Service Worker 已预缓存 JS/CSS/HTML/图片/音频；TV Mode 不需要独立缓存策略。
- `index.html` 有 iPhone 启动画面和 safe-area 配置，TV 不需要删除或替换这些配置。

## 3. TV Mode 启用规则

不以 Sony/Android UA 字符串作为唯一判断条件。UA 在第三方浏览器和 WebView 中不稳定，且不同 Sony 年代的浏览器内核差异很大。

采用以下优先级：

1. URL 显式覆盖：`?tv=1` 强制开启，`?tv=0` 强制关闭。用于真机验收、排障和截图；不写入 `localStorage`，避免同一账号/URL 在手机上留下错误模式。
2. 未显式覆盖时自动开启：视口宽度至少 `960px`、横屏且宽高比至少 `16/10`。
3. 其他情况使用现有手机模式。

实现封装为 `useTvMode()`，使用 `matchMedia` 并监听变化，再由组件添加 `.tvMode` class 驱动 CSS。这里不提供无 JavaScript 的 CSS 媒体条件兜底：应用本身依赖 JavaScript 才能运行，而且独立媒体规则无法遵守 `?tv=0` 的显式关闭。不要用触摸能力作为必要条件：部分 TV 遥控器会被浏览器声明为 coarse pointer，而部分 WebView 不会准确暴露 `hover`/`pointer`。

此规则不会命中 440×956、393×852 的手机竖屏；手机横屏宽度也低于 960px。桌面全屏 16:9 会进入 TV 布局，这是有意的：它既便于开发验证，也提供可用的大屏键盘体验。

## 4. 16:9 布局

### 4.1 大厅

TV 模式取消 480px 最大宽度，内容限制在 16:9 安全区内，四周保留约 5% 的 overscan 安全边距。首屏建议四列卡片：

```text
┌──────────────────────────────────────────────────────────┐
│                    像素游戏厅                             │
│                                                          │
│  [简单方块]  [俄罗斯方块]  [反重力方块]  [贪吃蛇]       │
│                                                          │
│                      [音效]                              │
└──────────────────────────────────────────────────────────┘
```

- 卡片封面仍保持 1:1，使用 `clamp()` 限制字号和间距，覆盖 1280×720 与 1920×1080 CSS viewport。
- 每屏优先显示 4 列；游戏增加后形成多行。网格允许纵向滚动，但不显示依赖鼠标拖动的控件。
- 焦点态必须同时包含高对比描边、亮色阴影和约 1.06 倍放大；不能只依赖颜色。焦点动画控制在 100ms 左右，并尊重 `prefers-reduced-motion`。

### 4.2 游戏页

TV 模式使用横向三栏，而不是拉伸手机竖版：

```text
┌──────────────────────────────────────────────────────────┐
│  游戏信息/下一个       Canvas 棋盘          遥控器提示   │
│  当前分/最高分         保持游戏比例          方向：移动   │
│  状态                                             OK：A   │
│                                            返回：暂停     │
└──────────────────────────────────────────────────────────┘
```

- 中栏 Canvas 使用现有 `useGame` 基于容器实际尺寸计算的逻辑，保持 `min(floor(width/cols), floor(height/rows))` 和 DPR 绘制；不对 Canvas 做非等比拉伸。
- 左栏复用 `NextPiecePreview` 与 `ScoreBoard`；手机顶部栏不删除，只在 TV CSS 中重排/隐藏触控专用图标。
- 右栏显示静态操作提示。触控 `GamePad` 在 TV 模式下 `display: none`；手机规则完全不变。
- 覆盖层仅覆盖游戏内容安全区，按钮放大到适合 10-foot UI 的尺寸，并显示清晰焦点。
- 720p 下必须完整显示，不依赖浏览器缩放；1080p 只增加留白与可读尺寸，不改变棋盘逻辑。

## 5. 输入模型与映射

### 5.1 事件归一化

新增纯函数层，将浏览器事件归一化为 `left/right/up/down/select/back`。读取顺序：

1. 标准 `KeyboardEvent.key`；
2. 现有桌面键盘兼容所需的 `KeyboardEvent.code`；
3. 仅为旧 TV/WebView 使用已知 `keyCode` 回退。

| 遥控动作 | 首选 Web 值 | 兼容候选 | TV 行为 |
|---|---|---|---|
| 左/右/上/下 | `key: ArrowLeft/Right/Up/Down` | `code` 同名；keyCode 37/39/38/40 | 大厅/覆盖层移动焦点；游戏中送入原有 `GameAction` |
| 确认/中心键 | `key: Enter` | `code: Enter/NumpadEnter`；keyCode 13 或 Android DPAD_CENTER 透传后的 23 | UI 中 `click()` 当前焦点；游戏中送 `a` |
| 返回 | `key: Escape/BrowserBack/GoBack` | `code: Escape/BrowserBack`；keyCode 4/27/461（仅经真机探针确认后启用） | 游戏中暂停；非游戏阶段回大厅或取消当前层 |
| 桌面暂停 | `P` | `code: KeyP` | 保留现有暂停/恢复 |
| 桌面动作 | WASD、J/K/Z/X/Space | 现有映射 | 全部保留 |

注意：Android 原生 `KEYCODE_DPAD_CENTER = 23` 与 `KEYCODE_BACK = 4` 是 Android 层值，不保证 Web 页面一定收到相同的 DOM `keyCode`。若采用自建 WebView，原生壳应在 `dispatchKeyEvent` 中记录并正确下发按键；Back 若被 Activity 先消费，网页永远收不到事件。

### 5.2 按页面阶段分流

每次 `keydown` 只能被一个层处理：

| 页面/阶段 | 方向键 | 确认键 | 返回键 |
|---|---|---|---|
| 大厅 | 移动卡片/音效焦点 | 激活焦点按钮 | 交给浏览器/宿主退出应用，不制造历史循环 |
| `restore` | 在“继续游戏/新游戏”间移动 | 激活按钮 | 回大厅 |
| `countdown` | 消费按键但忽略业务动作 | 消费按键但忽略业务动作 | 取消开始并回大厅；实现时必须清理倒计时 timer |
| `playing` | **沿用现有游戏方向逻辑与 DAS** | `GameAction: a`，单次触发 | 暂停并进入 `paused`，不弹退出确认 |
| `paused` | 在“继续/返回大厅”间移动 | 激活按钮 | 直接回大厅 |
| `over` | 在“再来一局/返回大厅”间移动 | 激活按钮 | 回大厅 |
| `confirm-exit` | 在“退出/继续玩”间移动 | 激活按钮 | 取消确认并继续游戏；此阶段主要保留给手机顶部返回按钮 |
| 游戏不存在 | 聚焦“返回大厅” | 返回大厅 | 回大厅 |

TV 下第一次 Back 只暂停，第二次 Back 从暂停页回大厅，符合“暂停或回大厅”。大厅 Back 不 `preventDefault()`，让 Sony 浏览器或 Android 宿主完成系统级返回。

### 5.3 重复键

- 游戏阶段继续使用当前 `useKeyboard` 的 150ms DAS；Snake 保留四方向重复的专属映射。
- 大厅/覆盖层使用遥控器原生 `event.repeat`，并设置约 180–220ms 的焦点移动节流，避免不同遥控器重复速率导致越过多个按钮。
- Select、Back、A/B 动作仅在首次 `keydown` 触发，忽略 `event.repeat`。
- 大厅与覆盖层的 Select 直接调用唯一的语义激活回调，不调用 DOM `click()`；若 TV/WebView 随后对同一焦点元素合成 `detail === 0` 的 click，则在短去重窗口内捕获并消费。真实鼠标/触摸 click 不受影响。游戏中 Select 仍只由 `useKeyboard` 映射为 `a`。
- `keyup`、`window.blur`、`visibilitychange` 和模式退出都必须清空按键状态与计时器。

## 6. 焦点顺序

### 6.1 大厅空间导航

- 初始焦点：第一个 `status === 'active'` 的游戏；从游戏页返回时恢复离开前的卡片焦点（仅内存状态，不要求持久化）。
- 卡片按 `gameRegistry` 的视觉顺序编号，TV 为四列：Left/Right 移到同行相邻卡片，Up/Down 移到同列上一/下一行。
- 最后一行不足四项时，Down 选择几何距离最近的可用卡片，而不是落到不存在的位置。
- 从最后一行按 Down 进入音效按钮；音效按钮按 Up 回到最近一次聚焦的卡片。
- 边界不循环，避免儿童快速长按后位置突变。焦点变化后调用 `scrollIntoView({ block: 'nearest' })`。
- `coming_soon` 卡片仍可获得焦点并触发现有抖动反馈，避免焦点路径产生洞；增加锁定语义和不可玩的可视提示，但不使用 HTML `disabled`（否则空间导航会跳过它）。

### 6.2 游戏与覆盖层

- `playing/countdown`：焦点停在页面的游戏根容器（建议 `tabIndex={-1}` 后程序聚焦），不允许焦点落在隐藏的 GamePad 或顶部按钮；这能阻止 Enter 误触顶部按钮。
- 每个覆盖层出现时，初始焦点落在主操作：继续游戏、继续、再来一局、退出。
- 覆盖层按钮按视觉顺序纵向导航：Up 到前一个，Down 到后一个；Left/Right 不移动。边界不循环。
- 覆盖层关闭后，恢复游戏根容器焦点；回大厅后恢复对应游戏卡片焦点。
- 鼠标点击或手机触控不应强制显示焦点环；只使用 `:focus-visible`，并为不支持它的旧浏览器加 `.tvMode [data-focused='true']` 状态兜底。

## 7. 实施文件

首版按以下文件边界实施：

| 文件 | 实施内容 |
|---|---|
| `src/hooks/useTvMode.ts`（新增） | URL 覆盖、媒体条件检测和变化监听 |
| `src/input/tvRemote.ts`（新增） | 纯函数按键归一化、兼容回退、可单测的动作类型 |
| `src/hooks/useSpatialFocus.ts`（新增） | 大厅四列空间焦点、覆盖层线性焦点、恢复焦点、滚动与节流 |
| `src/hooks/useKeyboard.ts` | 接收归一化 TV 输入或明确消费结果；保留现有桌面映射与 DAS；避免与 UI 焦点监听双重处理 |
| `src/pages/Home.tsx` | 启用 TV 检测、注册焦点项、初始/恢复焦点和 Select/Back 行为 |
| `src/pages/Home.module.css` | 16:9 四列安全区、TV 字号/间距、`focus-visible`/兜底焦点态；现有手机规则放在默认分支 |
| `src/pages/GamePage.tsx` | 按 phase 分流遥控输入、Back 两段式行为、覆盖层自动聚焦、倒计时可取消、TV 操作提示 |
| `src/pages/GamePage.module.css` | TV 三栏布局、隐藏 GamePad/触控顶部按钮、覆盖层与焦点态；默认手机布局不变 |
| `src/components/GamePad.tsx` | 原则上不改；仅当可访问性检查需要时补 `disabled`/`aria-label`，不得改变 pointer 行为 |
| `vite.config.ts` | manifest `orientation` 从 `portrait` 改为 `natural`；自然方向在手机通常为竖屏、TV 为横屏，仍以 CSS/宿主方向为最终兜底 |
| `src/input/tvRemote.test.ts`（新增） | key/code/keyCode 归一化、重复键和未知键测试 |
| `src/hooks/spatialFocus.test.ts`（新增或拆为纯函数测试） | 4 列、不完整末行、音效按钮与边界规则 |
| `docs/dev/pwa.md` | 同步 orientation 与 TV/WebView 说明 |
| `docs/design/home.md`、`docs/design/game-page.md` | 同步已落地的响应式布局和状态机 |

不应修改 `src/games/*`、`src/games/types.ts` 或 `useGame` 的游戏核心接口；TV 输入最终仍调用现有 `handleAction(GameAction)`。

## 8. PWA 与方向策略

建议将 manifest 的 `orientation` 改为 `natural`，而不是 `landscape` 或直接删除：

- 手机的自然方向通常是竖屏，可维持安装后现有启动方向；
- TV 的自然方向是横屏，不会要求一个无法旋转的屏幕进入 portrait；
- 普通浏览器标签页和部分 WebView可能忽略 manifest orientation，因此布局仍必须完全依赖响应式 CSS，而不是把 manifest 当作能力保证。

发布前仍需分别验证 Android 手机已安装 PWA、iPhone 主屏 PWA、Sony 浏览器书签入口和 WebView 壳。若某目标环境不支持 `natural`，回退方案是移除 orientation，并用 CSS 保证手机竖屏体验；不建议为 TV 把整个应用固定为 `landscape`。

## 9. Sony 浏览器与 Android TV WebView 风险

| 风险 | 影响 | 缓解/验收 |
|---|---|---|
| 新款 Sony Google TV/Android TV 通常不预装浏览器，第三方浏览器由各自厂商维护 | 内核、键值、PWA 安装和全屏能力不可统一保证 | 明确交付入口；至少选定一款目标 Sony 机型和实际浏览器版本做签收，不把“Sony TV”当成单一平台 |
| 旧 Sony 机型可能使用 Vewd/Opera，现代 ES/CSS/PWA 支持较弱 | Vite 7 默认产物、CSS `clamp`/grid、Service Worker 或 `:focus-visible` 可能失败 | 先跑构建产物兼容探针；若必须支持旧 Vewd，再单独决定 legacy 构建，不在首版盲目加入 polyfill |
| 遥控 Back 可能由浏览器或 Activity 在 DOM 前消费 | 页面收不到暂停/回大厅事件 | WebView 宿主用 `dispatchKeyEvent`/Back dispatcher 明确转发策略；浏览器场景真机记录 `key/keyCode/code`，无法截获时保留浏览器历史返回作为降级 |
| DPAD_CENTER 可能表现为 Enter、DOM click，或非标准 keyCode | Select 重复触发或完全不触发 | 归一化后去重；若浏览器已合成 click，不再对同一次按键二次 `click()`；用事件时间戳真机验证 |
| 浏览器自带空间导航可能与应用监听同时运行 | 一次方向键移动两次或页面滚动 | TV UI 分支消费已识别方向键并 `preventDefault()`；焦点移动完全由一个 hook 负责 |
| WebView 默认不启用 JavaScript，且不是完整浏览器 | React 应用白屏；没有地址栏/导航/PWA 安装能力 | 宿主必须启用 JavaScript、网络权限和 DOM storage；外链留给系统浏览器；PWA/SW 离线能力在壳内单独验证 |
| WebView APK 与 TV 固件版本分离且可能过旧 | JS/CSS/API 行为漂移 | 记录 OS、WebView/Chrome 版本；不依赖最新 WebView-only API；最低版本由实机结果决定 |
| TV overscan、浏览器工具栏与 CSS viewport 不一致 | 边缘按钮被裁切、720p 内容溢出 | 5% 安全区；覆盖 1280×720、1920×1080、工具栏可见/全屏两种 viewport 测试 |
| 字体来自 Google Fonts | TV 网络受限时字体加载失败，布局和像素风变化 | 将字体本地化列为实现时的推荐加固项；至少保证 monospace fallback 不破坏布局 |
| 音频仍受用户手势与格式支持约束 | TV 上 BGM 不播放 | 把第一次 Select 视为用户手势并测试 OGG；音频失败不能阻塞游戏，格式扩展另立任务 |
| Service Worker 旧缓存 | TV 长期停留在旧输入逻辑 | 使用现有更新提示并验证遥控可聚焦/确认；测试清缓存与离线升级路径 |

Sony 官方说明，新款 Google TV/Android TV 没有预装浏览器且不保证第三方浏览器运行；部分旧机型使用 Vewd/Opera。Android 官方则要求 TV 的所有可见控件可由 D-pad 到达、Select 激活当前焦点，并保证 Back 能逐层回到应用根与系统。实现验收应以这些原则和指定真机为准，而不是仅在桌面 Chrome 模拟。

参考：

- [Sony：Android TV 没有预装浏览器，第三方浏览器不保证运行](https://www.sony.com/electronics/support/televisions-projectors-lcd-tvs-android-/kd-55x80j/articles/00121075)
- [Sony：旧款 Android TV 的 Vewd/Opera 浏览器与遥控器操作](https://www.sony.com/electronics/support/televisions-projectors-lcd-tvs-android-/xbr-75x850d/articles/00123077)
- [Android TV：D-pad、Select 与 Back 导航规范](https://developer.android.com/training/tv/get-started/navigation)
- [Android：TV 控制器按键约定](https://developer.android.com/training/tv/get-started/controllers)
- [Android：WebView 配置与 JavaScript 要求](https://developer.android.com/develop/ui/views/layout/webapps/webview)
- [W3C：Web App Manifest orientation](https://www.w3.org/TR/appmanifest/#orientation-member)

## 10. 测试方案与通过标准

### 10.1 自动化测试

1. `tvRemote.test.ts`
   - 标准 Arrow/Enter/Escape/BrowserBack/GoBack 映射；
   - `code` 与经批准的旧 keyCode 回退；
   - 未知键不消费；Select/Back 的 repeat 被忽略；
   - 同一物理确认键不会同时产生 action 与 button click。
2. 空间焦点纯函数测试
   - 四列左右/上下；
   - 不完整末行取最近项；
   - 卡片与音效按钮转换；
   - 边界不循环；
   - coming-soon 卡片仍在焦点路径内。
3. GamePage phase 行为测试（若现有环境补充 React DOM 测试能力）
   - playing 方向键只进游戏；
   - Back：playing → paused → lobby；
   - 每个覆盖层初始焦点正确；
   - countdown Back 清 timer 且不晚启动游戏；
   - TV 退出后无残留 DAS。
4. 完整执行 `npm run test:run` 和 `npm run build`。

### 10.2 桌面浏览器回归

- Chrome/Edge 用 1920×1080、1280×720 和 `?tv=1` 检查布局、焦点环、长按与全流程。
- 用 440×956、393×852 检查默认手机模式：双列大厅、触控 GamePad、顶部返回/暂停、覆盖层、safe area 与滚动均与改造前一致。
- 手机横屏宽度低于阈值时仍走手机分支；触控和键盘可同时使用。
- 关闭 JavaScript 时不要求可玩，但不得把加载失败误判为 PWA 离线成功。

### 10.3 Android TV 模拟器 / WebView 壳

- Android TV 模拟器用 ADB 遥控键验证 DPAD 四向、CENTER、BACK、长按重复和 Activity 返回栈。
- WebView 壳记录但不上传 `key/code/keyCode/repeat`，确认宿主是否截获 Back；验证 JavaScript、DOM storage、音频、网络、Service Worker（若支持）和页面历史。
- 前后台切换后应自动暂停且无卡键；断网重启应加载缓存版本或给出明确失败状态。

### 10.4 Sony 真机门槛

实现前先记录：电视型号、年份、系统/固件、浏览器名称与版本、CSS viewport、devicePixelRatio、每个遥控键的 DOM 事件。然后完成：

- 冷启动后不使用鼠标即可进入任意游戏；
- 大厅每个卡片和音效按钮都可达，焦点始终可见；
- 四款游戏分别验证短按/长按方向、Select 动作、Back 两段式退出；
- restore、paused、over、confirm-exit 与无效路由均可只用遥控器完成；
- 720p/1080p 不裁边，棋盘无非等比拉伸；
- 音效/BGM 失败不影响操作；
- 刷新、离线、更新提示都能用遥控器恢复到可玩状态。

### 10.5 手机“不受影响”签收线

在 iPhone 16 Pro（393×852）和 Pro Max（440×956）实际 viewport 上逐项对比改造前：

- 默认仍为竖屏手机布局，GamePad 可见；
- 八个触控按钮位置、尺寸、pointerdown 与 150ms 重复行为不变；
- 顶部返回仍走现有退出确认，暂停按钮仍可点击；
- 大厅卡片点击、锁定抖动、音效切换与滚动不变；
- Canvas 尺寸、DPR 清晰度、计分/下一个预览和覆盖层不回归；
- iOS 主屏 PWA 冷启动、safe-area、后台恢复和更新提示正常。

## 11. 实施顺序与确认点

1. **真机按键探针**：先确认指定 Sony 环境的浏览器与键值，决定旧 keyCode 清单是否需要扩展。
2. **纯输入/焦点层与测试**：不碰游戏核心，先建立唯一事件消费规则。
3. **大厅 TV 布局与焦点**：完成全遥控进入游戏。
4. **GamePage phase 分流与横屏布局**：完成四款游戏和所有覆盖层。
5. **PWA orientation 与文档同步**：在手机 PWA 回归通过后才合入 `natural`。
6. **桌面、Android TV、Sony 真机、手机全矩阵验收**。

已确认的产品决策：

1. TV 游戏中 Select 统一映射为现有 `a` 动作（当前桌面 `Space/J/Z` 的同类动作）。
2. 遥控 Back 采用两段式：游戏中第一次暂停，暂停页第二次直接回大厅；不再额外弹退出确认。
