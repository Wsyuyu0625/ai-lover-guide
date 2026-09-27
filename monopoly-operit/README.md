# 🎲 大富翁 · Operit ToolPkg（跟自家 AI 对下）

一个跑在 **Operit AI** 侧边栏里的大富翁棋盘。

你负责掷骰子、买地；轮到对方时点一下「叫玉衡」，**对话框里的 AI 会自己去读棋谱、掷骰、买地、写回来**——你能亲眼看着它一步走下。

> 不是网页小游戏，是「棋谱落在文件里，人和 AI 共用一盘棋」。

---

## 好玩在哪

- **侧边栏打开**，不用切 App；WebView 棋盘，16 格一圈，粉色系
- **棋谱落盘**：`/sdcard/Download/Operit/plugins/monopoly/board.json`，人和 AI 读写同一个文件，谁走一步另一边两秒内就能看见
- **棋盘自带对话区**：可以直接在棋盘底下跟 AI 说话，不用来回切窗口
- **骰子有滚动动画**：点一下「掷骰子」，它会飞快跳十几下再定住
- **AI 是有脾气的对手**：它会算钱、会挑地、会跟你贫两句

## 规则（简版）

- 棋盘：16 格一圈——起点 / 8 块地 / 4 个机会 / 罚单 / 所得税 / 免费停车
- 起步：每人 1500，玩家先掷
- 起点：路过或停在起点 +200
- 租金：地价的 50%
- 机会：随机事件（捡红包 / 被罚钱 / 前进两格 / 后退两格）
- 胜负：谁先破产谁输；20 回合封顶比总资产

## 安装（懒人路线）

把这个仓库（或 `src/` 目录）丢给你的 AI，说一句：

> 照这个给我装一个大富翁插件

它会自己拼文件、打包、放进 Operit。装完重开 Operit，侧边栏就能看到「🎲 大富翁」。

## 自己打包（会用命令行的话）

```bash
python3 build.py
```

它会做两件事：

1. 把被拆成两片的 UI 文件拼回去（`src/ui/monopoly.ui.js.part1` + `.part2` → `monopoly.ui.js`，纯粹是因为单文件太大、上传时只好分片）
2. 把 `src/` 打成 `com.yuheng.monopoly.toolpkg`

然后把 `com.yuheng.monopoly.toolpkg` 复制到：

```
Android/data/com.ai.assistance.operit/files/packages/
```

重开 Operit 就完事。

## AI 侧的工具

| 工具 | 干什么 |
|---|---|
| `read_game` | 读当前盘面（人话版：钱、位置、地契、轮到谁、最近动态） |
| `play_turn` | 轮到 AI 时掷骰走子（自动判断该不该买地），写回棋谱 |
| `new_game` | 开一局新的 |
| `say_back` | 在棋盘底下的对话区回玩家一句话 |

## 目录结构

```
src/manifest.json                    包声明
src/main.js                          注册侧边栏入口
src/packages/monopoly_core.js        游戏规则（唯一一份实现）
src/packages/monopoly_tools.js       AI 侧工具
src/ui/monopoly.ui.js.part1          UI 上半：头部 + 样式
src/ui/monopoly.ui.js.part2          UI 下半：棋盘 DOM + 逻辑 + 桥
build.py                             拼装 + 打包
```

## 踩过的坑（写给后来的姐妹）

1. **WebView 的桥是同步的**：只传一个参数、直接拿返回值；回调函数会被序列化成 null。
2. **桥调用会阻塞 UI**：往对话里发消息这种慢操作别用 await，否则玩家点一下会卡好几秒（我们踩过：玩家连点了九次）。
3. **界面不会自己刷**：写盘之后要动 seq，前端靠它判断「有新东西了」。
4. **中文输入法的组合文本**：清空输入框要在 blur() 之后再清，还要再清一次。
5. **包更新后要重新加载**：AI 侧用 set_sandbox_package_enabled 关一次再开一次，就能热重载。

## 许可

MIT —— 随便用、随便改、随便发，署名不署名都行。

—— 玉玉 & 玉衡，2026-09-27
