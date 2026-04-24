import { describe, test, expect, beforeEach, vi } from 'vitest'
import { SnakeGame } from '../SnakeGame'
import type { Direction, Point, SnakeSavedState } from '../types'
import { COLS, ROWS } from '../constants'

// 测试中需要读写 SnakeGame 的 private 字段/方法，用类型 cast 作为 test seam
type Internal = {
  segments: Point[]
  food: Point | null
  direction: Direction
  pendingDirection: Direction
  lastAccelTime: number
  accumulatedTime: number
  state: 'idle' | 'playing' | 'paused' | 'over'
  renderer: { init: () => void; render: () => void }
  tick: () => void
}
const peek = (g: SnakeGame): Internal => g as unknown as Internal

function makeGame(): SnakeGame {
  const game = new SnakeGame()
  // 替换 renderer 为无操作 stub，绕开 canvas 依赖
  peek(game).renderer = { init: () => {}, render: () => {} }
  return game
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

describe('初始状态', () => {
  test('start() 后蛇 3 节朝右居中', () => {
    const g = makeGame()
    g.start()
    const p = peek(g)
    expect(p.segments).toHaveLength(3)
    expect(p.segments[0]).toEqual({ x: 8, y: 7 })
    expect(p.segments[1]).toEqual({ x: 7, y: 7 })
    expect(p.segments[2]).toEqual({ x: 6, y: 7 })
    expect(p.direction).toBe('right')
    expect(g.getScore()).toBe(0)
    expect(g.getState()).toBe('playing')
  })

  test('start() 后食物存在且不在蛇身上', () => {
    const g = makeGame()
    g.start()
    const p = peek(g)
    expect(p.food).not.toBeNull()
    const bodyKeys = new Set(p.segments.map((s) => `${s.x},${s.y}`))
    expect(bodyKeys.has(`${p.food!.x},${p.food!.y}`)).toBe(false)
  })
})

describe('方向与 tick', () => {
  test('tick 时头前进一格，尾弹出', () => {
    const g = makeGame()
    g.start()
    peek(g).tick()
    const s = peek(g).segments
    expect(s).toHaveLength(3)
    expect(s[0]).toEqual({ x: 9, y: 7 })
    expect(s[2]).toEqual({ x: 7, y: 7 })
  })

  test('onInput 改方向：pendingDirection 先写入，tick 开头才应用', () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
    expect(peek(g).pendingDirection).toBe('up')
    expect(peek(g).direction).toBe('right')
    peek(g).tick()
    expect(peek(g).direction).toBe('up')
    expect(peek(g).segments[0]).toEqual({ x: 8, y: 6 })
  })

  test('掉头保护：向右走时按左被忽略', () => {
    const g = makeGame()
    g.start()
    g.onInput('left')
    expect(peek(g).pendingDirection).toBe('right')
  })

  test('掉头保护：向上时按下被忽略', () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
    peek(g).tick()
    g.onInput('down')
    expect(peek(g).pendingDirection).toBe('up')
  })

  test('onInput 在非 playing 时被忽略', () => {
    const g = makeGame()
    g.start()
    g.pause()
    g.onInput('up')
    expect(peek(g).pendingDirection).toBe('right')
  })
})

describe('穿墙', () => {
  test('右边缘穿到左边缘', () => {
    const g = makeGame()
    g.start()
    // 头 x=8，走 7 步后应 x=(8+7)%15=0
    for (let i = 0; i < 7; i++) peek(g).tick()
    expect(peek(g).segments[0].x).toBe(0)
  })

  test('上边缘穿到下边缘', () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
    // 头 y=7，每 tick y-1；走 8 步后应 y=(7-8+15)%15=14
    for (let i = 0; i < 8; i++) peek(g).tick()
    expect(peek(g).segments[0].y).toBe(ROWS - 1)
  })
})

describe('食物与计分', () => {
  test('吃到食物：分 +1、蛇 +1 节、新食物生成', () => {
    const g = makeGame()
    g.start()
    peek(g).food = { x: 9, y: 7 }
    peek(g).tick()
    expect(g.getScore()).toBe(1)
    expect(peek(g).segments).toHaveLength(4)
    expect(peek(g).food).not.toBeNull()
    expect(peek(g).food).not.toEqual({ x: 9, y: 7 })
  })

  test('onScoreChange 回调被触发', () => {
    const g = makeGame()
    let score = -1
    g.onScoreChange = (s) => { score = s }
    g.start()
    peek(g).food = { x: 9, y: 7 }
    peek(g).tick()
    expect(score).toBe(1)
  })

  test('连续吃 10 次，新食物始终不在蛇身上', () => {
    const g = makeGame()
    g.start()
    for (let i = 0; i < 10; i++) {
      // 把食物强行放在蛇头前方
      const head = peek(g).segments[0]
      peek(g).food = { x: (head.x + 1) % COLS, y: head.y }
      peek(g).tick()
      const bodyKeys = new Set(peek(g).segments.map((s) => `${s.x},${s.y}`))
      expect(bodyKeys.has(`${peek(g).food!.x},${peek(g).food!.y}`)).toBe(false)
    }
    expect(g.getScore()).toBe(10)
  })
})

describe('碰撞判定', () => {
  test('撞自己触发 Game Over + onGameOver 回调', () => {
    const g = makeGame()
    let finalScore = -1
    g.onGameOver = (s) => { finalScore = s }
    g.start()
    // 手摆 5 节蛇，让下一 tick 头进入非尾的身段
    peek(g).segments = [
      { x: 5, y: 5 }, // head
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 }, // 这里是 head 下一步要去的位置（非尾）
      { x: 6, y: 6 }, // tail
    ]
    peek(g).direction = 'up'
    peek(g).pendingDirection = 'down'
    peek(g).food = null
    peek(g).tick()
    expect(g.getState()).toBe('over')
    expect(finalScore).toBe(0)
  })

  test('紧贴尾部前进不死（非吃食物 tick 排除尾部）', () => {
    const g = makeGame()
    g.start()
    // 4 节蛇围成 2×2，头下移一格正好踩在旧尾上
    peek(g).segments = [
      { x: 5, y: 5 }, // head
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 }, // tail，这是 head 下一步要去的位置
    ]
    peek(g).direction = 'up'
    peek(g).pendingDirection = 'down'
    peek(g).food = null
    peek(g).tick()
    expect(g.getState()).toBe('playing')
    expect(peek(g).segments[0]).toEqual({ x: 5, y: 6 })
  })

  test('吃食物 tick 时尾巴不排除，会吃到刚好铺满自己的情况', () => {
    const g = makeGame()
    g.start()
    // 4 节蛇围成 2×2，食物摆在尾部位置，吃食物 tick 不弹尾 → 撞自己
    peek(g).segments = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ]
    peek(g).direction = 'up'
    peek(g).pendingDirection = 'down'
    peek(g).food = { x: 5, y: 6 } // = 当前尾部，触发 willEat=true
    peek(g).tick()
    expect(g.getState()).toBe('over')
  })
})

describe('加速心跳', () => {
  test('a/b/x/y 按下时 lastAccelTime 被刷新', () => {
    const g = makeGame()
    g.start()
    const before = peek(g).lastAccelTime
    g.onInput('a')
    expect(peek(g).lastAccelTime).toBeGreaterThan(before)
  })

  test('所有 4 个加速键都有效', () => {
    const actions: Array<'a' | 'b' | 'x' | 'y'> = ['a', 'b', 'x', 'y']
    for (const a of actions) {
      const g = makeGame()
      g.start()
      const before = peek(g).lastAccelTime
      g.onInput(a)
      expect(peek(g).lastAccelTime).toBeGreaterThan(before)
    }
  })
})

describe('存档序列化', () => {
  test('saveState 产出 version:1 及完整快照', () => {
    const g = makeGame()
    g.start()
    const parsed = JSON.parse(g.saveState()) as SnakeSavedState
    expect(parsed.version).toBe(1)
    expect(parsed.segments).toHaveLength(3)
    expect(parsed.direction).toBe('right')
    expect(parsed.pendingDirection).toBe('right')
    expect(parsed.score).toBe(0)
    expect(parsed.food).toBeDefined()
  })

  test('saveState → loadState 保真', () => {
    const g1 = makeGame()
    g1.start()
    peek(g1).food = { x: 9, y: 7 }
    peek(g1).tick() // 吃，分变 1，长变 4
    g1.onInput('up')
    peek(g1).tick() // 拐上
    const snapshot = g1.saveState()

    const g2 = makeGame()
    g2.loadState(snapshot)
    expect(peek(g2).segments).toEqual(peek(g1).segments)
    expect(peek(g2).direction).toBe(peek(g1).direction)
    expect(peek(g2).pendingDirection).toBe(peek(g1).pendingDirection)
    expect(peek(g2).food).toEqual(peek(g1).food)
    expect(g2.getScore()).toBe(g1.getScore())
    expect(g2.getState()).toBe('playing')
  })

  test('loadState 版本号不匹配时丢弃', () => {
    const g = makeGame()
    g.loadState(
      JSON.stringify({
        version: 99,
        segments: [],
        direction: 'up',
        pendingDirection: 'up',
        food: null,
        score: 999,
      }),
    )
    expect(g.getState()).toBe('idle')
    expect(g.getScore()).toBe(0)
  })
})
