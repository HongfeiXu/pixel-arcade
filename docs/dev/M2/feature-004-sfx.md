# Feature-004: 音效系统（SFX）

## 背景

目前仅有 BGM（`useBgm`），游戏过程中缺少瞬时反馈音——按键、消行、Game Over 都是静默。加入最小集短音效，提升节奏感与幼儿玩家的动作反馈。

## 设计方案

### 事件清单（最小集）

| 事件 key | 触发时机 | 音色取向 |
|---------|---------|---------|
| `move` | 方块左右移动成功 | 短促点击感（~40ms） |
| `rotate` | 旋转成功（up 按下） | 轻微音高上扬 |
| `softDrop` | 软降开始（down 按下，一次性） | 低频快速下滑 |
| `lineClear` | 消 1~3 行 | 清脆上扬音阶 |
| `tetris` | 消 4 行 | 更长、更高昂的成就音 |
| `gameOver` | 游戏结束 | 下行音阶（悲伤） |

**注意事项：**

- `move` / `softDrop` 需频率限制：左右长按每 150ms 连触发，音效会吵。建议 `move` 正常播（短到可叠加），`softDrop` 只在开始按下瞬间播一次、持续过程静音。
- `lineClear` 与 `tetris` 互斥：4 行走 `tetris`，1~3 行走 `lineClear`。
- 消行动画 320ms，音效应在动画开始时就播（玩家听到声才有"爆"的快感），而非动画结束删行后。

### 资源方案

两种候选：

**A. 静态文件（推荐）**

使用 [jsfxr](https://sfxr.me/) 在线生成 8-bit WAV，放 `public/audio/sfx/{event}.wav`。
- 优点：一次生成，体积小（每个 1~3KB），浏览器兼容最好
- 缺点：需要手动调参生成，文件多

**B. Web Audio 纯合成（无资源文件）**

用 `OscillatorNode` + `GainNode` 代码里合成。
- 优点：无资源文件、体积零、随时可调
- 缺点：代码复杂度高、不同浏览器时基略有差异

**决策：采用 A 方案**，理由：幼儿用户音效质感重要，jsfxr 一次生成即可，后续也更方便换素材或交给美术调。

### 架构改动

#### 1. 扩展 `GameInstance` 接口

在 [src/games/types.ts](../../src/games/types.ts) 新增音效事件类型与回调：

```typescript
export type SfxEvent =
  | 'move' | 'rotate' | 'softDrop'
  | 'lineClear' | 'tetris'
  | 'gameOver'

export interface GameInstance {
  // ... 原有回调
  onSfx?: (event: SfxEvent) => void
}
```

**原则：** 游戏核心只**声明事件**，不关心音效文件、音量、是否开启——全部由 React 侧 `useSfx` 处理。符合"核心不依赖 React / 不直接读 localStorage"的现有架构。

#### 2. 新增 `useSfx` hook

位置：`src/hooks/useSfx.ts`

职责：
- 预加载所有 SFX 到 AudioBuffer（Web Audio API，支持重叠播放）
- 暴露 `playSfx(event)` 函数
- 读取 `settings.soundEnabled` 开关（与 BGM 共用）
- iOS 手势解锁（首次 touchstart 时 `audioContext.resume()`）

骨架：

```typescript
export function useSfx(): (event: SfxEvent) => void {
  // 1. 创建 AudioContext + 预加载所有 buffer
  // 2. 返回 playSfx(event)：从 buffer pool 创建 BufferSourceNode 播放
  // 3. 卸载时 close() AudioContext
}
```

#### 3. `useGame` 桥接

[src/hooks/useGame.ts](../../src/hooks/useGame.ts) 调用 `useSfx`，把 `playSfx` 赋给 `instance.onSfx`，完成事件→播放的桥接。

#### 4. TetrisGame 发射事件

在各触发点调用 `this.onSfx?.(...)`：

| 文件位置 | 事件 |
|---------|------|
| `onInput` 左右移动成功分支 | `move` |
| `onInput` 旋转成功分支 | `rotate` |
| `onInput` down 按下（首次） | `softDrop` |
| 检测到满行后进入动画时 | `lineClear`（1~3）或 `tetris`（4） |
| `onGameOver` 触发处 | `gameOver` |

### 音量控制

- **当前决策：** 不做 SFX/BGM 分级，沿用 `settings.soundEnabled` 一个开关（关则两者都静音）
- **预留：** `useSfx` 内部 `GainNode.gain` 设固定值（如 0.5，略低于 BGM 的 0.3~0.4 组合），后续若需要分级再扩展 settings
- **理由：** 幼儿目标用户，一个开关 UI 更简单；分级可作为后续 polish 任务

## 资源生成清单

用 jsfxr 生成以下 7 个文件，存放 `public/audio/sfx/`：

- `move.wav` — Pickup/Coin 模板，调短
- `rotate.wav` — Pickup/Coin 模板，频率略高
- `soft-drop.wav` — Laser/Shoot 模板，短促下滑
- `line-clear.wav` — Powerup 模板
- `tetris.wav` — Powerup 模板，时长翻倍、频率更高
- `game-over.wav` — Hit/Hurt + Explosion 混合或下行音阶

目标：每个文件 ≤ 5KB，8-bit 16000Hz 单声道。

## 实现清单

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `public/audio/sfx/*.wav` | jsfxr 生成 7 个资源 |
| 2 | `src/games/types.ts` | 新增 `SfxEvent` 类型与 `onSfx` 回调 |
| 3 | `src/hooks/useSfx.ts` | 新建音效播放 hook |
| 4 | `src/hooks/useGame.ts` | 桥接 `playSfx → instance.onSfx` |
| 5 | `src/games/tetris/TetrisGame.ts` | 在 7 个触发点调用 `this.onSfx?.(...)` |
| 6 | `docs/PLAN.md` | M2 音效系统条目打勾 |

## 验证方式

1. `npm run build` 无类型错误
2. 左右移动有点击音；长按连续移动听感不刺耳
3. 旋转、软降各有独立音色
4. 消 1~3 行播 `lineClear`，消 4 行播 `tetris`，互不重叠
5. Game Over 播下行音
6. 关闭 soundEnabled 后所有 SFX 静音（BGM 亦静）
7. iOS Safari 首次触摸后音效正常（AudioContext 解锁）
8. 同时触发多个音效（如消行期间按键）能重叠播放、不互相打断

## 开放问题

- jsfxr 生成的参数是否入库（存成 JSON 方便重新生成 WAV）？— 建议先不做，如需调音再说
- 是否区分"左"和"右"音效？— 默认不区分，保持最小集
