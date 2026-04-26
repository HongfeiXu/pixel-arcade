# 音效排障记录

## 本地 dev 短音效静音，但 BGM 正常

### 现象

- `npm run dev` 本地运行时，俄罗斯方块和贪吃蛇短音效不播放
- BGM 正常播放
- GitHub Pages 部署版短音效正常

### 根因

BGM 和短音效走的是两条不同播放链路：

- BGM 使用 `HTMLAudioElement` 播放
- 短音效使用 Web Audio API：`AudioContext` + `AudioBufferSourceNode`

浏览器的自动播放策略可能让 `AudioContext` 初始保持 `suspended`。旧实现只在首次 `touchstart` / `click` 监听中尝试 `ctx.resume()`，但真正播放短音效前没有再次确认 `AudioContext` 状态。

本地 dev 下有 Vite dev server、React StrictMode dev 行为、HMR 和加载时序差异，更容易出现首次交互和 `AudioContext` 解锁不同步的问题。生产部署版时序更稳定，所以 GitHub Pages 上可能不复现。

### 修复原则

每次播放短音效前都检查 `ctx.state`：

- 如果是 `running`，直接创建 `AudioBufferSourceNode` 并播放
- 如果是 `suspended`，先 `ctx.resume()`，成功后再创建并播放音效

不要假设首次手势监听一定已经完成 Web Audio 解锁。

### 相关文件

- `src/hooks/useSfx.ts`：短音效预加载、解锁与播放
- `src/hooks/useBgm.ts`：BGM 播放
- `public/audio/sfx/`：短音效资源

### 验证

- `npm run test:run`
- `npm run build`
- 本地 `npm run dev` 下确认 BGM 与 SFX 都能播放
