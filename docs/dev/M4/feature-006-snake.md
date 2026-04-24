# Feature-006: 贪吃蛇（简单版）

> 状态：设计中
> 定位：合集第 4 款游戏，面向幼儿的低门槛玩法补充

## 背景

合集目前有俄罗斯方块系列两款（标准 + 反重力），均属"堆叠消行"品类。加入贪吃蛇可以补齐"连续路径"品类，节奏更慢、操作更简单，适合幼儿短时段上手。

## 玩法设计

### 基本设定

- 棋盘：`COLS = 15`，`ROWS = 15`，方形
- `cellSize = min(floor(W/15), floor(H/15))`，从 Canvas 容器实际尺寸计算；长短边多出的像素留空
- 蛇初始：长度 3 节，横放于棋盘中央朝右，`segments = [{x:8,y:7},{x:7,y:7},{x:6,y:7}]`，初始方向 `Right`
- 食物：同时只存在 1 个；从全部非蛇身格中均匀随机生成；吃到 `+1 分`，蛇身 `+1 节`，立即生成下一个
- 只有一种食物（不引入金苹果、限时食物等特殊机制）

### 移动规则

- 每 tick 头前进 1 格，尾部弹出（吃到食物的那一 tick 不弹尾，自然实现 +1 节）
- **穿墙**：`head.x = (head.x + dx + COLS) % COLS`，`y` 同理
- **撞自己**：新 head 命中 `segments[0..n-2]` → Game Over
  - 判定时若本 tick **不**吃食物，需把"即将弹出的尾部"（`segments[n-1]`）从碰撞集合中排除，避免"紧贴尾部前进"误判为撞自己
  - 若本 tick 吃食物，碰撞集合包含全部蛇身
- **掉头保护**：新方向若与当前 `direction` 相反则忽略（在写入 `pendingDirection` 之前过滤）

### 速度

| 模式 | tickInterval | 频率 |
|------|--------------|------|
| 默认 | 500ms | 2 格/秒 |
| 加速（任一方向键长按） | 200ms | 5 格/秒 |

全程恒速，不随蛇长或分数变化。加速倍率 2.5×，反差比 4/8 明显，给小朋友更大的"主动提速"爽点。

> 初版设计是 250/125（4/8 格/秒），实际和 tetris 默认下落（1 格/秒）一对比明显偏快，幼儿很难规划转向。真机前先按"走路"级别（2 格/秒）打底。

### 控制映射

| 输入 | 动作 |
|------|------|
| D-pad 上 / 下 / 左 / 右 | 改变方向（经过掉头保护）；**长按 = 加速** |
| XYAB（Y=上 / A=下 / X=左 / B=右） | 同 D-pad，完全等价；**长按 = 加速** |
| 暂停键 | 暂停 / 恢复 |

- **XYAB 等价于 D-pad**，和 tetris / anti-gravity 系列的肌肉记忆对齐（虽然这两款的语义不同，物理布局一致）
- **加速 = 长按任一方向键**（不再占用独立按键）。实现：任何方向输入到达即刷 `lastAccelTime`；UI 侧 D-pad 上下和 Y/A 使用 RepeatButton（通过 GamePad 的 `directionRepeat` prop 按游戏启用），键盘侧 snake 专属 keyMap 让上下方向键 `repeat: true`，形成 150ms DAS 心跳，`ACCEL_TIMEOUT=250ms` 足以连续保持
- 短按 = 一次方向改变 + 约 250ms 短脉冲加速
- 左/右已有 DAS（tetris 遗留），Y/A（= 上/下）按 snake 需求启用

### 游戏结束

- 撞自己 → `phase = 'gameOver'`、震屏、播 `gameOver` 音效、清空本地存档
- 最高分实时刷新（照搬 feature-002）

### 暂停 / 存档

- 退出返回大厅前：保存快照到 localStorage
- 从大厅再次进入：
  - 有有效快照 → 恢复为 `paused` 态，用户按开始键继续
  - 无快照 / 版本不匹配 → 新局开始
- Game Over 时清空存档

## 架构方案

### 目录结构

```
src/games/snake/
├── SnakeGame.ts        # GameInstance 实现，纯 TS，rAF 驱动
├── constants.ts        # COLS/ROWS/TICK_INTERVAL/TICK_INTERVAL_FAST/COLORS
├── types.ts            # Direction / Point / SnakeState / SnakeSavedState
├── renderer.ts         # render(ctx, state) 纯渲染函数
├── food.ts             # spawnFood(segments): Point
└── index.ts            # 导出 GameMeta
```

**不扩展 `src/games/shared/`**。贪吃蛇与 tetromino 零重合，强行抽象只会污染 shared 模块。`shared/tetromino/` 继续给 tetris + anti-gravity 两款共用。

### 状态结构

```ts
type Direction = 'up' | 'down' | 'left' | 'right'
type Point = { x: number; y: number }

type SnakeState = {
  phase: 'idle' | 'running' | 'paused' | 'gameOver'
  segments: Point[]            // index 0 = head
  direction: Direction         // 当前生效方向
  pendingDirection: Direction  // 下一 tick 开始时应用
  food: Point
  score: number
  fastMode: boolean
  accumulatedTime: number      // tick 累计
}

type SnakeSavedState = {
  version: 1
  segments: Point[]
  direction: Direction
  pendingDirection: Direction
  food: Point
  score: number
}
```

### 主循环

```
每帧 (rAF):
  deltaTime = now - lastFrame
  if phase !== 'running': render(ctx, state); return
  accumulatedTime += deltaTime
  interval = fastMode ? TICK_INTERVAL_FAST : TICK_INTERVAL
  while accumulatedTime >= interval:
    accumulatedTime -= interval
    tick()
    if phase === 'gameOver': break
  render(ctx, state)
```

### tick() 算法

```
1. direction = pendingDirection
2. newHead = wrap(segments[0] + delta(direction))
3. willEat = equals(newHead, food)
4. bodyToCheck = willEat ? segments : segments.slice(0, -1)
5. if bodyToCheck 包含 newHead:
     phase = 'gameOver'
     fire onGameOver; 触发 shake + sfx('gameOver')
     return
6. segments.unshift(newHead)
7. if willEat:
     score++
     food = spawnFood(segments)
     fire onScoreChange; sfx('lineClear'); 触发吃食物位置闪白
   else:
     segments.pop()
```

### 输入处理

- 所有 8 个方向输入（D-pad 上下左右 + XYAB 的 y/a/x/b）通过统一分支处理：
  - 映射到 `Direction`：y=up, a=down, x=left, b=right；D-pad 按字面
  - 写入**方向输入队列** `inputQueue`（上限 `MAX_INPUT_QUEUE=3`）
  - 去重与掉头保护基于**队尾**（若空则当前 direction）为基准：
    - 与队尾同向 → 去重跳过（DAS 连发不会灌满）
    - 与队尾反向 → 掉头保护跳过
    - 其他情况 → 入队
  - 这样"向上时连按 右→下"形成 L 形转向时两次输入都能正确排队
  - `tick()` 开头从队头取出一个方向应用（`shift`），空队列则保持当前方向
  - 每次方向输入同时刷新 `lastInputTime = performance.now()`
- tick 时 `fastMode = stillHolding && heldLongEnough`
  - `stillHolding`：`now - lastInputTime < ACCEL_GAP_MAX (200ms)` — 距上次心跳未超时
  - `heldLongEnough`：`now - holdStartTime >= HOLD_ACCEL_DELAY (500ms)` — 按下已累计 500ms+
  - 单次 tap：holdDuration=0 不触发加速（避免"一按就冲一步"的误触感）
  - 长按（DAS/RepeatButton 每 150ms 心跳）：前 500ms 慢速，之后进入 fastMode
- UI 侧：GamePad `directionRepeat={true}` 让 up/down/Y/A 也使用 RepeatButton
- 键盘侧：snake 专属 keyMap 让 ArrowUp/Down/W/S 也 `repeat: true`
- `pause` → phase 切换；React 侧在 pause 时调 `saveState` 存档

### GameInstance 接口

照搬 `src/games/types.ts` 已有规范，无需改动接口：

```ts
class SnakeGame implements GameInstance {
  mount(canvas: HTMLCanvasElement): void
  start(): void
  pause(): void
  resume(): void
  reset(): void
  destroy(): void
  handleAction(action: GameAction): void
  getSnapshot(): SnakeSavedState
  restore(state: SnakeSavedState): void
  onScoreChange, onGameOver, onStateChange  // 回调
}
```

### 注册

- `src/games/registry.ts` 新增 snake 项
- 大厅新增像素风 SVG 图标（16×16，蛇头造型，与 tetris/anti-gravity 的图标风格一致）

## 渲染

- DPR 3x，`imageSmoothingEnabled = false`（照搬 tetris）
- ResizeObserver 监听容器尺寸，重新计算 cellSize

**绘制顺序**（每帧 render）：

1. 背景 `#1A1A2E` 铺满
2. （可选）辅助网格点阵 `#2A2A3E`——先做，不满意再删
3. 蛇身：每节画填充方块，内缩 1px 形成像素描边
   - 头：`#FFD600`（主强调黄）
   - 身 / 尾：`#00E5FF`（次强调青）
4. 食物：`#FF5252` 像素方块
5. Game Over 覆盖层由 GamePage 已有 overlay 机制负责（不在 Canvas 内画）

**不画**：蛇眼、方向箭头、食物呼吸动画——像素清爽优先；如后续试玩觉得单调再加。

## 音效 & 视觉反馈

复用 feature-004 SFX 集，**不引入新 WAV**。

| 事件 | 音效 | 视觉 |
|------|------|------|
| 吃食物 | `lineClear` | 食物位置闪白 1 帧（复用 tetris 闪白机制） |
| 撞自己（Game Over） | `gameOver` | 震屏（复用 tetris shake） |
| 移动 / 转向 | — | 不做（每 tick 响太吵） |
| 加速按住 | — | GamePad 按钮本身已有按下视觉反馈 |

## 存档

- **最高分 key**：`pixel-arcade:snake:highscore`
- **存档 key**：`pixel-arcade:snake:savedState`
- 存档 React 侧负责 read/write：
  - 暂停时保存
  - `destroy` 前保存（hooks/useGame 已有 lifecycle hook）
  - Game Over 时清空
- 恢复时 phase 不写入，默认 `paused`，等用户按开始
- `fastMode / accumulatedTime` 不存档，恢复后归零
- 版本号 `version: 1`；不兼容旧版本直接丢弃

## 测试

项目无自动化测试，沿用手动清单，写入 `docs/dev/M4/TEST.md`。

**设备**
- iPhone 16 Pro Max（主力，生产环境通过 GitHub Pages 访问）
- 桌面 Chrome（键盘模拟：方向键 → 方向，WASD → 加速）

**清单**
- [ ] 四方向移动 + 穿墙（4 个边界各走一次）
- [ ] 掉头保护：向右时按左应被忽略
- [ ] 一 tick 内连按两个方向，以最后一次为准
- [ ] 吃食物时蛇正确 +1 节
- [ ] 紧贴尾部前进不被误判为撞自己
- [ ] 撞自己触发 Game Over（震屏 + 音效）
- [ ] 加速：按住/释放、多键同时按（例如 `按A → 按B → 松A` 时 fastMode 仍应保持，直到 B 也释放）
- [ ] 暂停 → 返回大厅 → 再进游戏 → 恢复到暂停状态
- [ ] 最高分实时刷新（边玩边对比 HUD）
- [ ] 锁屏 / 切后台 → `visibilitychange` 自动暂停
- [ ] 屏幕旋转 / 容器尺寸变化 → cellSize 重算且不错位
- [ ] Game Over 后存档被清空（DevTools 验证 localStorage）
- [ ] 新局：初始蛇长 3 节朝右、食物不生成在蛇身上

## 风险与已知坑

- **撞尾误判**：算法步骤 4 的 `slice(0, -1)` 必须放在 `willEat` 分支判定之后，顺序反了会在"紧贴尾部 + 吃食物"极少数情况下错判
- **方向输入 = 加速心跳源**：fastMode 依赖每 150ms 到达的 DAS 心跳，`ACCEL_TIMEOUT=250ms` 留了 100ms 容忍。更长的 DAS 间隔（修改 useKeyboard.DAS_INTERVAL 或 RepeatButton 的 setInterval）会导致 fastMode 间歇性退出，需同步调大 `ACCEL_TIMEOUT`
- **食物生成饥饿**：蛇填满棋盘时均匀随机会退化；15×15=225 格，蛇 200 节以上才明显，不优化
- **浏览器 tab 切换**：`visibilitychange` 触发的 pause 路径已存在，贪吃蛇直接复用

## 相关文档

- [feature-002: 最高分实时更新](../M2/feature-002-realtime-highscore.md)
- [feature-003: 视觉反馈动画](../M2/feature-003-visual-feedback.md)
- [feature-004: 音效系统](../M2/feature-004-sfx.md)
- [feature-005: 反重力方块](../M3/feature-005-anti-gravity.md)
- [game-api.md](../game-api.md)
- [architecture.md](../architecture.md)
