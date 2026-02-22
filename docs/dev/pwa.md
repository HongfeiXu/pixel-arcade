# PWA 配置

## 概述

将应用打包为 PWA，支持"添加到主屏幕"后以全屏 Standalone 模式运行，离线可用。

## Manifest 配置要点

```json
{
  "name": "像素游戏厅",
  "short_name": "像素游戏厅",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1A1A2E",
  "theme_color": "#1A1A2E",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

关键点：
- `display: standalone` — 隐藏浏览器地址栏，像原生 App
- `orientation: portrait` — 锁定竖屏
- `background_color` 和 `theme_color` 与应用背景色一致，启动画面无白屏闪烁

## Service Worker

使用 `vite-plugin-pwa` 自动生成 Service Worker，采用 **precache** 策略：

- 构建时将所有静态资源（HTML、JS、CSS、音效、图片）列入预缓存清单
- 首次加载后全部缓存到本地
- 之后完全离线可用
- 有新版本时**静默自动更新**（`registerType: 'autoUpdate'`），用户下次打开时即为最新版

配置示例（vite.config.ts）：

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: { /* 上面的 manifest 内容 */ },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,mp3,wav}'],
      },
    }),
  ],
});
```

## iOS 特殊处理

### 状态栏

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

`black-translucent` 让状态栏透明叠在内容上方，需要用 CSS 安全区域避开：

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

### 启动画面

iOS PWA 支持自定义启动画面，需要为每个设备尺寸提供 `apple-touch-startup-image`。
iPhone 16 Pro 和 Pro Max 需要两个尺寸：

- 16 Pro: 1206 × 2622
- 16 Pro Max: 1320 × 2868

### 音频限制

iOS 要求音频必须由用户手势触发。处理方式：

```typescript
let audioContext: AudioContext | null = null;

function initAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
}

// 在游戏开始按钮的 click/touchend 事件中调用 initAudio()
```

### 后台恢复

iOS PWA 切到后台一段时间后可能被系统回收，回来时会重新加载页面。
需要在以下时机自动保存游戏状态到 localStorage：

- 暂停时
- `document.visibilitychange` 事件触发时（hidden）
- `window.pagehide` 事件触发时

恢复逻辑：进入 GamePage 时，`useGame` Hook 检查 `pixelarcade_{gameId}_state` 是否有存档，有则在游戏页内弹出覆盖层提示"继续上次的游戏？"，提供"继续"和"新游戏"两个按钮。详见 [GamePage 设计文档](../design/game-page.md)。

## PWA 与 base 路径

当部署到 GitHub Pages 子路径（如 `/<repo-name>/`）时，PWA 相关配置需要同步调整：

```typescript
// vite.config.ts
const base = '/<repo-name>/';

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    start_url: base,
    scope: base,
    // ...其他配置
  },
  workbox: {
    navigateFallback: base + 'index.html',
    globPatterns: ['**/*.{js,css,html,png,mp3,wav}'],
  },
})
```

> 如果使用自定义域名则 base 为 `/`，无需特殊处理。

## 图标制作

需要准备的图标：

| 文件 | 尺寸 | 用途 |
|------|------|------|
| icon-192.png | 192×192 | Manifest 标准图标 |
| icon-512.png | 512×512 | Manifest 大图标 |
| apple-touch-icon.png | 180×180 | iOS 主屏幕图标 |
| favicon.ico | 32×32 | 浏览器标签页图标 |

图标使用像素风格设计，建议内容为一个简化的游戏手柄或方块图案。
