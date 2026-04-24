import { describe, test, expect, beforeEach, vi } from 'vitest'
import { SnakeGame } from '../SnakeGame'
import type { Direction, Point, SnakeSavedState } from '../types'
import { COLS, ROWS } from '../constants'

// 测试中需要读写 SnakeGame 的 private 字段/方法，用类型 cast 作为 test seam
type Internal = {
  segments: Point[]
  food: Point | null
  direction: Direction
  inputQueue: Direction[]
  lastInputTime: number
  holdStartTime: number
  accumulatedTime: number
  state: 'idle' | 'playing' | 'paused' | 'over'
  renderer: { init: () => void; render: () => void }
  tick: () => void
}
const peek = (g: SnakeGame): Internal => g as unknown as Internal

function makeGame(): SnakeGame {
  const game = new SnakeGame()
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
    expect(p.inputQueue).toEqual([])
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

describe('方向输入队列', () => {
  test('onInput 改方向：入队后 tick 开头消费', () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
    expect(peek(g).inputQueue).toEqual(['up'])
    expect(peek(g).direction).toBe('right') // 还未应用
    peek(g).tick()
    expect(peek(g).direction).toBe('up')
    expect(peek(g).inputQueue).toEqual([])
    expect(peek(g).segments[0]).toEqual({ x: 8, y: 6 })
  })

  test('tick 时头前进一格，尾弹出', () => {
    const g = makeGame()
    g.start()
    peek(g).tick()
    const s = peek(g).segments
    expect(s).toHaveLength(3)
    expect(s[0]).toEqual({ x: 9, y: 7 })
    expect(s[2]).toEqual({ x: 7, y: 7 })
  })

  test('连按两次形成 L 形：向上时 右→下 依次应用', () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
    peek(g).tick() // 先正常向上走一格，direction=up
    g.onInput('right') // 合法（up 的非反向）
    g.onInput('down') // 以队尾 right 为基准，down 非反向 → 入队
    expect(peek(g).inputQueue).toEqual(['right', 'down'])
    peek(g).tick()
    expect(peek(g).direction).toBe('right')
    peek(g).tick()
    expect(peek(g).direction).toBe('down')
    expect(peek(g).inputQueue).toEqual([])
  })

  test('DAS 连发同方向被去重（不灌满队列）', () => {
    const g = makeGame()
    g.start()
    for (let i = 0; i < 20; i++) g.onInput('right') // right = 当前 direction
    expect(peek(g).inputQueue).toEqual([])
  })

  test('掉头保护：向右走时按左被忽略', () => {
    const g = makeGame()
    g.start()
    g.onInput('left')
    expect(peek(g).inputQueue).toEqual([])
  })

  test('掉头保护：向上时按下被忽略', () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
    peek(g).tick()
    g.onInput('down')
    expect(peek(g).inputQueue).toEqual([])
  })

  test('掉头保护基于队尾：向上时 右→左 被忽略（左是 right 的反向）', () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
    peek(g).tick()
    g.onInput('right')
    g.onInput('left') // 队尾 right 的反向
    expect(peek(g).inputQueue).toEqual(['right'])
  })

  test('队列上限 MAX_INPUT_QUEUE=3 防止灌满', () => {
    const g = makeGame()
    g.start()
    // 从 right 开始，形成循环方向序列：up → left → down → right → up
    g.onInput('up')
    g.onInput('left')
    g.onInput('down')
    g.onInput('right') // 此时已满 3，应被丢弃
    expect(peek(g).inputQueue).toEqual(['up', 'left', 'down'])
  })

  test('onInput 在非 playing 时被忽略', () => {
    const g = makeGame()
    g.start()
    g.pause()
    g.onInput('up')
    expect(peek(g).inputQueue).toEqual([])
  })
})

describe('穿墙', () => {
  test('右边缘穿到左边缘', () => {
    const g = makeGame()
    g.start()
    for (let i = 0; i < 7; i++) peek(g).tick()
    expect(peek(g).segments[0].x).toBe(0)
  })

  test('上边缘穿到下边缘', () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
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
    peek(g).segments = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ]
    peek(g).direction = 'up'
    peek(g).inputQueue = ['down']
    peek(g).food = null
    peek(g).tick()
    expect(g.getState()).toBe('over')
    expect(finalScore).toBe(0)
  })

  test('紧贴尾部前进不死（非吃食物 tick 排除尾部）', () => {
    const g = makeGame()
    g.start()
    peek(g).segments = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ]
    peek(g).direction = 'up'
    peek(g).inputQueue = ['down']
    peek(g).food = null
    peek(g).tick()
    expect(g.getState()).toBe('playing')
    expect(peek(g).segments[0]).toEqual({ x: 5, y: 6 })
  })

  test('吃食物 tick 时尾巴不排除，会吃到刚好铺满自己的情况', () => {
    const g = makeGame()
    g.start()
    peek(g).segments = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ]
    peek(g).direction = 'up'
    peek(g).inputQueue = ['down']
    peek(g).food = { x: 5, y: 6 }
    peek(g).tick()
    expect(g.getState()).toBe('over')
  })
})

describe('XYAB 方向映射', () => {
  test('y=上, a=下, x=左, b=右（与 tetris 系列对齐）', () => {
    // 初始 direction=right，x/b 与 right 冲突（反向或同向），需先向上转一下
    const cases: Array<{ action: 'y' | 'a' | 'x' | 'b'; dir: Direction; needTurnFirst?: Direction }> = [
      { action: 'x', dir: 'left', needTurnFirst: 'up' },
      { action: 'b', dir: 'right', needTurnFirst: 'up' },
      { action: 'y', dir: 'up' },
      { action: 'a', dir: 'down' },
    ]
    for (const c of cases) {
      const g = makeGame()
      g.start()
      if (c.needTurnFirst) {
        g.onInput(c.needTurnFirst)
        peek(g).tick()
      }
      g.onInput(c.action)
      expect(peek(g).inputQueue[peek(g).inputQueue.length - 1]).toBe(c.dir)
    }
  })
})

describe('长按加速心跳', () => {
  test('任意方向输入（D-pad 或 XYAB）都刷新 lastInputTime', () => {
    const actions: Array<'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y'> = [
      'up', 'down', 'left', 'right', 'a', 'b', 'x', 'y',
    ]
    for (const a of actions) {
      const g = makeGame()
      g.start()
      const before = peek(g).lastInputTime
      g.onInput(a)
      expect(peek(g).lastInputTime).toBeGreaterThan(before)
    }
  })

  test('pause 键不刷新 lastInputTime', () => {
    const g = makeGame()
    g.start()
    const before = peek(g).lastInputTime
    g.onInput('pause')
    expect(peek(g).lastInputTime).toBe(before)
  })

  test('首次方向输入时 holdStartTime = lastInputTime（holdDuration=0）', () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
    expect(peek(g).holdStartTime).toBe(peek(g).lastInputTime)
  })

  test('长时间间隔后再次输入视为新按下：holdStartTime 重置', async () => {
    const g = makeGame()
    g.start()
    g.onInput('up')
    const firstHoldStart = peek(g).holdStartTime
    await new Promise((r) => setTimeout(r, 250))
    g.onInput('up')
    const secondHoldStart = peek(g).holdStartTime
    expect(secondHoldStart).toBeGreaterThan(firstHoldStart)
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
    expect(parsed.score).toBe(0)
    expect(parsed.food).toBeDefined()
  })

  test('saveState → loadState 保真', () => {
    const g1 = makeGame()
    g1.start()
    peek(g1).food = { x: 9, y: 7 }
    peek(g1).tick()
    g1.onInput('up')
    peek(g1).tick()
    const snapshot = g1.saveState()

    const g2 = makeGame()
    g2.loadState(snapshot)
    expect(peek(g2).segments).toEqual(peek(g1).segments)
    expect(peek(g2).direction).toBe(peek(g1).direction)
    expect(peek(g2).food).toEqual(peek(g1).food)
    expect(g2.getScore()).toBe(g1.getScore())
    expect(g2.getState()).toBe('playing')
    // 队列恢复为空（ephemeral 数据，不持久化）
    expect(peek(g2).inputQueue).toEqual([])
  })

  test('loadState 版本号不匹配时丢弃', () => {
    const g = makeGame()
    g.loadState(
      JSON.stringify({
        version: 99,
        segments: [],
        direction: 'up',
        food: null,
        score: 999,
      }),
    )
    expect(g.getState()).toBe('idle')
    expect(g.getScore()).toBe(0)
  })
})
