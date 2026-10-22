# 推箱子扩展与 Arcade 界面统一

## 最终批准范围（实施前修订）

用户在实施中调整方向：以经典关卡和游戏厅一致性优先，取消儿童叙事、教学提示、关卡标题和命名分组。前 12 关地图/顺序/metadata 原样保留以兼容 version 1 历史存档，但 UI 仅显示“第 N 关”。新增 13–24 关直接选用 David W. Skinner 的 Microban 原布局，不再使用自创的教学关卡。经典目标仍为绕行、让路、临停、顺序；不硬套原先每三关教学分段。

## 关卡来源与版权

Microban（155 关，April 2000）作者 David W. Skinner。作者页面镜像明确："These sets may be freely distributed provided they remain properly credited." 本地从该镜像 m1.txt 与 GitHub raw 交叉核对；这不是根据 GitHub 托管推断许可证。仅选早期关卡，不选注明衍生其他发行商的 148–151、153。

- 作者页面镜像：https://onlinespiele-sammlung.de/sokoban/sokobangames/skinner
- 作者关卡镜像：https://onlinespiele-sammlung.de/sokoban/sokobangames/skinner/m1.txt
- 交叉来源：https://raw.githubusercontent.com/davidjoffe/sokoban/main/data/sokoban/levels/microban.txt

选关底部保留简短“13–24: Microban · David W. Skinner”署名，README 和验收记录保留来源、原关号及分发条件。原始行（包括前导空格、非矩形行）不改；引擎现有缺列按墙处理不影响封闭仓库的可达性。无需迁移存档。

## 界面和操作

- 复用 GamePage.module.css 的容器、顶栏、Canvas、暂停覆盖层、主/次按钮以及 TV 三栏布局，不复制独立儿童应用外观。
- 复用 GamePad D-pad/ABXY，新增可选 singleStep 与 actionLabels；只有 Sokoban 开启，旧游戏默认 repeat 不变。方向单步，X 撤销、Y 重来、B 选关、A 菜单（按钮直接显示中文操作）。
- 数字范围 1–12 / 13–24，两层选择，组内只有 12 个数字关卡。打开时显示当前关所在页并聚焦当前关；返回范围保留当前页焦点；返回菜单聚焦选关。
- 触屏点击、键盘方向/OK/返回与正常 Tab；TV 方向每按一次走一步，不改变共享旧游戏输入。无限撤销、自动存档、完成记录、主动下一关不变。
- 无计时、分数、星级、解锁、新机制或解答提示。通关只显示“第 N 关完成”。

## 验收

- [x] 独立 BFS 全部 24 关可解；实际引擎回放、存储恢复、完整撤销。
- [x] 独立推箱 BFS，记录新关最少推动、最短步数、来源原号及解法，分析经典布局的实际顺序/临停约束。
- [x] 固定旧声明字节快照与 12 个 version 1 历史存档，保留完成记录。
- [x] 数字页聚焦、边缘导航、OK/返回和当前页恢复自动化覆盖。
- [x] npm run test:run、npm run build、git diff --check。
- [ ] 父代理独立浏览器手机/TV 验收（本子任务不启动服务器）；Sony/iPhone 真机仍待验证。

仅本地实施，不提交、不推送、不发布、不改 Godot、不增加依赖。
