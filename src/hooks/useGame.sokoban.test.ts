import { afterEach, beforeEach, expect, test, vi } from 'vitest'

// 无 DOM 测试依赖：只替换 React 调度与 Canvas，真实 useGame + 注册表 + 引擎负责行为。
const harness = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  refs: 0,
  updates: [] as object[],
}))
vi.mock('react', () => ({
  useRef: (value: object | null) => ({ current: harness.refs++ === 0 ? { style: {} } : value }),
  useState: (value: object) => [value, (next: object) => harness.updates.push(next)],
  useEffect: (effect: () => void | (() => void)) => { harness.effects.push(effect) },
  useCallback: (callback: object) => callback,
}))
vi.mock('./useSfx', () => ({ useSfx: () => () => {} }))
vi.mock('../games/sokoban/renderer', () => ({ renderBoard: () => {} }))
import { useGame } from './useGame'
import { SokobanGame } from '../games/sokoban/SokobanGame'
import { LEVELS, parseLevel } from '../games/sokoban/levels'

let storage: Map<string, string>
let documentEvents: Map<string, () => void>
let windowEvents: Map<string, () => void>
let cleanups: Array<() => void>
const key = 'pixelarcade_sokoban_state'
function mount() {
  harness.refs = 0; harness.effects = []; harness.updates = []
  const result = useGame('sokoban', { current: { clientWidth: 390, clientHeight: 360 } as HTMLElement })
  cleanups = harness.effects.map(effect => effect()).filter((fn): fn is () => void => typeof fn === 'function')
  return result
}
beforeEach(() => {
  storage = new Map(); documentEvents = new Map(); windowEvents = new Map(); cleanups = []
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k,v), removeItem: (k: string) => storage.delete(k),
  })
  vi.stubGlobal('window', { devicePixelRatio: 2, addEventListener: (k: string, cb: () => void) => windowEvents.set(k,cb), removeEventListener: (k: string) => windowEvents.delete(k) })
  vi.stubGlobal('document', { hidden: true, addEventListener: (k: string, cb: () => void) => documentEvents.set(k,cb), removeEventListener: (k: string) => documentEvents.delete(k) })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => { cleanups.forEach(fn => fn()); vi.unstubAllGlobals() })

test('真实 useGame 每步自动存档、撤销、选关、重来并自动继续', () => {
  const hook = mount(); hook.start(); hook.handleAction('right')
  const won = new SokobanGame(); won.loadState(storage.get(key)!)
  expect(won.getPuzzleStatus().won).toBe(true)
  expect(won.getPuzzleStatus().completed).toEqual([0])
  hook.undoPuzzle()
  const undone = new SokobanGame(); undone.loadState(storage.get(key)!)
  expect(undone.getPuzzleStatus().won).toBe(false)
  hook.selectPuzzleLevel(3); hook.handleAction('left')
  const saved = storage.get(key)!
  cleanups.forEach(fn => fn()); cleanups = []
  const resumed = mount()
  expect(storage.get(key)).toBe(saved)
  resumed.undoPuzzle()
  const restored = new SokobanGame(); restored.loadState(storage.get(key)!)
  expect(restored.getBoard()).toEqual(parseLevel(LEVELS[3]))
  expect(restored.getPuzzleStatus().completed).toEqual([0])
  resumed.handleAction('left'); resumed.restartPuzzle()
  restored.loadState(storage.get(key)!)
  expect(restored.getBoard()).toEqual(parseLevel(LEVELS[3]))
  expect(storage.has('pixelarcade_scores')).toBe(false)
})

test('v1 old save continues into second numeric page; reload and undo retain both completion sets', () => {
  storage.set(key, JSON.stringify({ version: 1, level: 0, completed: [0, 3, 11], history: ['right'] }))
  const hook = mount()
  hook.selectPuzzleLevel(23)
  hook.handleAction('right')
  const saved = storage.get(key)!
  expect(JSON.parse(saved).level).toBe(23)
  expect(JSON.parse(saved).history).toEqual(['right'])
  expect(JSON.parse(saved).completed).toEqual([0, 3, 11])
  cleanups.forEach(fn => fn()); cleanups = []
  const resumed = mount()
  expect(storage.get(key)).toBe(saved)
  resumed.undoPuzzle()
  const restored = new SokobanGame(); restored.loadState(storage.get(key)!)
  expect(restored.getBoard()).toEqual(parseLevel(LEVELS[23]))
  expect(restored.getPuzzleStatus().completed).toEqual([0, 3, 11])
})

test('切后台暂停，pagehide 保存，卸载清理监听器', () => {
  const hook = mount(); hook.start(); hook.selectPuzzleLevel(3)
  documentEvents.get('visibilitychange')!()
  const saved = storage.get(key)
  hook.handleAction('left'); expect(storage.get(key)).toBe(saved)
  hook.resume(); hook.handleAction('left'); expect(storage.get(key)).not.toBe(saved)
  windowEvents.get('pagehide')!()
  cleanups.forEach(fn => fn()); cleanups = []
  expect(documentEvents.size).toBe(0); expect(windowEvents.size).toBe(0)
})

test('损坏存档回退可玩初始关卡；存储不可用也可游玩', () => {
  storage.set(key, '{bad')
  const hook = mount(); hook.handleAction('right')
  const loaded = new SokobanGame(); loaded.loadState(storage.get(key)!)
  expect(loaded.getPuzzleStatus().won).toBe(true)
  cleanups.forEach(fn => fn()); cleanups = []
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('quota') } })
  expect(() => { const offline = mount(); offline.start(); offline.handleAction('right'); offline.undoPuzzle(); offline.pause() }).not.toThrow()
})
