# 音频资源

## BGM

| 文件 | 曲名 | 来源 | 用途 |
|------|------|------|------|
| `public/audio/bgm-pixel-balloons.ogg` | Pixel Balloons_v2_LoFi | [SoundImage.org](https://soundimage.org/puzzle-music-8/) | 游戏中背景音乐 |

## 音效

| 文件 | 事件 | 用途 |
|------|------|------|
| `public/audio/sfx/move.wav` | `move` | 左右移动 |
| `public/audio/sfx/rotate.wav` | `rotate` | 方块旋转 |
| `public/audio/sfx/soft-drop.wav` | `softDrop` | 标准版软降 / 反重力版速升 |
| `public/audio/sfx/line-clear.wav` | `lineClear` | 消除 1-3 行 |
| `public/audio/sfx/tetris.wav` | `tetris` | 消除 4 行 |
| `public/audio/sfx/game-over.wav` | `gameOver` | 游戏结束 |

音效由 `useSfx` 使用 Web Audio API 预加载为 `AudioBuffer`，游戏实例只通过 `onSfx` 抛出语义事件，不直接读写音频资源。
