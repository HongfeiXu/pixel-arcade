# 🎮 Pixel Arcade — 像素游戏厅

一个面向幼儿的经典小游戏合集 PWA，像素风格，移动端优先，并支持大屏 TV 遥控模式。

## 在线体验

https://hongfeixu.github.io/pixel-arcade/

## 游戏列表

| 游戏 | 状态 |
|------|------|
| 俄罗斯方块（简单） | ✅ 已完成 |
| 俄罗斯方块 | ✅ 已完成 |
| 反重力方块 | ✅ 已完成 |
| 贪吃蛇 | 🛠 M4 优化中 |
| 推箱子 | ✅ 24 关已发布；固定格子尺寸优化本地验收完成、待发布 |

## 推箱子

24 关：保留原 1–12 关，13–24 关选用 David W. Skinner 的经典 Microban 小型仓库布局。仅显示关号，无教学提示或儿童叙事；选关按数字范围 1–12 / 13–24 分页，全部开放。没有计时、分数或星级，支持无限撤销、重来和本机自动继续（含撤销历史、旧 version 1 存档）。

界面复用其他 Arcade 游戏的顶栏、暂停菜单、TV 三栏与 D-pad/ABXY：手机方向键单次移动，右侧按钮为撤销/重来/选关/菜单；电脑方向键/WASD 移动、Z/Backspace 撤销、Enter 菜单；TV 每按一次走一步，OK/返回打开菜单，返回逐层退出选关。通关后主动选下一关，也可撤销。

[扩展设计](docs/dev/feature-009-sokoban-expansion.md) · [本地验证与关卡指标](docs/sokoban-expansion-verification.md) · [原版设计](docs/dev/feature-008-sokoban.md)。24 关扩展已完成浏览器验收并发布（7f2c4cd）；Sony/iPhone 真机待验证。新增[固定格子尺寸优化](docs/dev/feature-010-sokoban-cell-size.md)：同一屏幕切关不改变人物和格子大小，小关卡居中留白；该优化目前仅本地完成，尚未发布。

Microban © David W. Skinner（April 2000），作者允许在正确署名的前提下自由分发："These sets may be freely distributed provided they remain properly credited." [作者页面镜像及许可说明](https://onlinespiele-sammlung.de/sokoban/sokobangames/skinner) · [原布局](https://onlinespiele-sammlung.de/sokoban/sokobangames/skinner/m1.txt)。选取原关号 21、2、56、4、1、51、28、9、24、30、31、3，不含其他发行商衍生关。

## 致谢

- 背景音乐 *Pixel Balloons_v2_LoFi* 来自 [SoundImage.org](https://soundimage.org/puzzle-music-8/)

## 文档

[docs/README.md](docs/README.md) — 完整文档索引 · [PLAN.md](docs/PLAN.md) — 路线图 · [PROGRESS.md](docs/PROGRESS.md) — 开发进度
