# Issue-004: 新游戏初始化时方块闪现

## 现象

从大厅进入 Tetris 新游戏，会先短暂显示一个方块（预览区），然后刷新为另一个方块开始下降。

## 根因

`TetrisGame` 类中 `PieceBag` 被初始化了两次：

```typescript
// 第 1 次：字段初始化（类实例化时）
private bag = new PieceBag()  // ← 立即生成随机序列

// 第 2 次：start() 方法内（倒计时结束后）
start(): void {
  this.bag = new PieceBag()   // ← 覆盖为新的随机序列
  this.currentPiece = this.spawnPiece()
  // ...
}
```

**问题链路：**

1. `useGame` hook 初始化 → `entry.createInstance()` → 字段 `bag = new PieceBag()` 运行（第 1 个 bag）
2. `instance.init()` → `renderFrame()` → 渲染空棋盘
3. `onStateChange` 回调触发 `syncNextPiece()` → `getNextPieceType()` 返回第 1 个 bag 的 peek 值
4. `NextPiecePreview` 组件显示该方块类型 → **用户看到了一个预览方块**
5. 倒计时结束 → `start()` → `this.bag = new PieceBag()` 创建第 2 个 bag
6. `spawnPiece()` 从第 2 个 bag 取方块 → 预览区更新为不同的方块
7. **用户看到预览方块"闪"了一下，换了一个**

## 修复方案

延迟 `PieceBag` 初始化，不在字段声明时创建，改为在 `start()` / `loadState()` 中创建。

### 改动

**`src/games/tetris/TetrisGame.ts`**

```typescript
// 修改前
private bag = new PieceBag()

// 修改后
private bag: PieceBag = null!  // start() / loadState() 中初始化
```

`start()` 中已有 `this.bag = new PieceBag()`，无需改动。
`loadState()` 中已有 `this.bag.deserialize(s.bag)`，需改为先创建再反序列化：

```typescript
this.bag = new PieceBag()
this.bag.deserialize(s.bag)
```

同时确保 `init()` 中的 `renderFrame()` 在 `currentPiece = null` 时不触发 `syncNextPiece`。

## 关联文档

- [docs/design/game-page.md](../../design/game-page.md) — 游戏页面设计
