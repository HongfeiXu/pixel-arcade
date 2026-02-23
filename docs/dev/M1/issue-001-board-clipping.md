# Issue-001: 棋盘裁剪 ✅

## 现象

1. 棋盘底部若干行被裁剪（桌面 Chrome + iPhone 实机）
2. 修复底部裁剪后，棋盘顶部又被裁剪（iPhone 实机）

## 根因

`CELL_SIZE = 36pt` 硬编码，仅基于屏幕**宽度**推算（393pt → 10×36=360），未验证高度方向。

棋盘 648pt + 顶栏 60pt + 手柄 220pt = 928pt，远超 iPhone 16 Pro Max 可用高度 863pt。`overflow: hidden` 裁剪底部。

中间尝试 CSS `transform: scale()` 缩放，但 transform 不改变布局盒子，`align-items: center` 导致顶部也被裁剪（回归 bug）。

## 修复方案

**废弃固定格子尺寸 + CSS 缩放，改为动态计算 cellSize。**

```
cellSize = min(floor(containerWidth / COLS), floor(containerHeight / ROWS))
```

`floor()` + `min()` 从数学上保证棋盘 ≤ 可用空间，不可能溢出任何方向。

附带改动：Canvas HUD（"下一个"预览 + 星星计分）移入 React 顶栏，Canvas 只画纯棋盘。

## 代码改动

| 文件 | 改动 |
|------|------|
| `constants.ts` | 删除 `CELL_SIZE`/`BOARD_WIDTH`/`BOARD_HEIGHT`，新增 `calcCellSize(w, h)` |
| `renderer.ts` | `init()` 接收动态 `cellSize`，所有绘制用 `this.cellSize`；删除 HUD 相关方法；高光边框按格子大小动态计算 |
| `TetrisGame.ts` | `init()` 调用 `calcCellSize(config.width, config.height)`；新增 `getNextPieceType()` |
| `types.ts` | `GameInstance` 添加可选 `getNextPieceType?()` |
| `useGame.ts` | 新增 `containerRef` 参数，传容器实际尺寸；新增 `nextPiece` 状态 |
| `GamePage.tsx` | 删除 `transform: scale()` / `ResizeObserver` 全部缩放逻辑；顶栏加入 `<NextPiecePreview>` |
| `GamePage.module.css` | `.canvasArea` 移除 `overflow: hidden` |
| `NextPiecePreview.tsx` | 新建，div 网格 + boxShadow 渲染方块预览 |

## 设计文档修正

- `design/tetris.md` — 格子尺寸标注为逻辑值，新增"高度适配"小节
- `design/game-page.md` — 新增"高度预算与 Canvas 适配"章节，顶栏增加预览和计分元素
