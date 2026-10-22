import { describe, expect, test } from 'vitest'
import levelSource from './levels.ts?raw'
import { LEVELS, parseLevel } from './levels'
import { SokobanGame } from './SokobanGame'
import type { Direction } from './types'
import legacy from './legacy-v1.fixture.json'
import microban from './microban.fixture.json'
import metrics from '../../../docs/sokoban-expansion-solutions.json'

const directions = [['U', 0, -1], ['D', 0, 1], ['L', -1, 0], ['R', 1, 0]] as const
const actions: Record<string, Direction> = { U: 'up', D: 'down', L: 'left', R: 'right' }
// Independent push BFS: read raw characters, flood walking space; each edge is exactly one push.
// Neither parseLevel nor SokobanGame participates in finding a solution or the minimum push count.
function pushSolve(rows: readonly string[], options: { frozen?: number; monotone?: boolean } = {}) {
  const width = Math.max(...rows.map(row => row.length))
  const floor = new Set<number>(), targets = new Set<number>(), boxes: number[] = []
  let player = -1
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    const pos = y * width + x
    if (cell !== '#') floor.add(pos)
    if ('.*+'.includes(cell)) targets.add(pos)
    if ('$*'.includes(cell)) boxes.push(pos)
    if ('@+'.includes(cell)) player = pos
  }))
  const queue = [{ player, boxes: boxes.sort((a,b) => a-b), pushes: 0, path: '' }]
  const seen = new Set<string>()
  const distance = (pos: number) => Math.min(...[...targets].map(target => Math.abs(pos % width - target % width) + Math.abs(Math.floor(pos / width) - Math.floor(target / width))))
  for (let head = 0; head < queue.length; head++) {
    if (head > 100000) throw new Error('Push BFS budget exceeded; not proof of unsolvability')
    const state = queue[head]
    if (state.boxes.every(box => targets.has(box))) return state
    const reachable = new Map([[state.player, '']])
    const walk = [state.player]
    for (let i = 0; i < walk.length; i++) for (const [letter, dx, dy] of directions) {
      const pos = walk[i], next = pos + dx + dy * width
      if (Math.abs(next % width - pos % width) > 1 || !floor.has(next) || state.boxes.includes(next) || reachable.has(next)) continue
      reachable.set(next, reachable.get(pos)! + letter); walk.push(next)
    }
    const id = `${Math.min(...walk)}:${state.boxes.join(',')}`
    if (seen.has(id)) continue
    seen.add(id)
    for (const box of state.boxes) for (const [letter, dx, dy] of directions) {
      const next = box + dx + dy * width, behind = box - dx - dy * width
      if (box === options.frozen || !reachable.has(behind) || !floor.has(next) || state.boxes.includes(next)) continue
      if (Math.abs(next % width - box % width) > 1) continue
      if (options.monotone && distance(next) > distance(box)) continue
      const updated = state.boxes.map(pos => pos === box ? next : pos).sort((a,b) => a-b)
      queue.push({ player: box, boxes: updated, pushes: state.pushes + 1, path: state.path + reachable.get(behind)! + letter })
    }
  }
  return null
}

test('24 levels; first twelve declarations remain byte-identical to 5be4364', () => {
  expect(LEVELS).toHaveLength(24)
  const declaration = legacy.declaration.slice(legacy.declaration.indexOf('export const'), legacy.declaration.lastIndexOf('\n]'))
  expect(levelSource).toContain(declaration)
  expect(LEVELS.slice(0, 12)).toEqual(legacy.levels.map(({ name, hint, rows }) => ({ name, hint, rows })))
})

test.each(legacy.levels.map((entry, index) => [index, entry] as const))('legacy v1 history %i restores without losing old completed states', (index, entry) => {
  const game = new SokobanGame()
  game.loadState(JSON.stringify(entry.saved))
  expect(game.getPuzzleStatus().level).toBe(index)
  expect(game.getPuzzleStatus().completed).toEqual([0, 3, 11])
  expect(JSON.parse(game.saveState()).history).toEqual(entry.saved.history)
  for (let n = 0; n < entry.saved.history.length; n++) game.undo()
  expect(game.getBoard()).toEqual(parseLevel(LEVELS[index]))
  expect(game.getPuzzleStatus().canUndo).toBe(false)
  expect(game.getPuzzleStatus().completed).toEqual([0, 3, 11])
})

describe('credited Microban layouts, independently measured and replayed', () => {
  test.each(metrics)('level $level = Microban $sourceIndex: $minimumPushes pushes, $shortestSteps moves', metric => {
    const index = metric.level - 1, level = LEVELS[index]
    expect(level.rows).toEqual(microban.levels.find(entry => entry.index === metric.sourceIndex)!.rows)
    expect(level.rows).toEqual(metric.rows)
    expect(level.source).toEqual({ pack: 'Microban', index: metric.sourceIndex })
    const solution = pushSolve(level.rows)
    expect(solution?.pushes).toBe(metric.minimumPushes)
    for (const path of [solution!.path, metric.shortestSolution, metric.minimumPushSolution]) {
      const game = new SokobanGame(); game.selectLevel(index)
      const middle = Math.floor(path.length / 2)
      for (const letter of path.slice(0, middle)) game.onInput(actions[letter])
      const partial = new SokobanGame(); partial.loadState(game.saveState())
      expect(partial.getBoard()).toEqual(game.getBoard())
      for (let n = 0; n < middle; n++) partial.undo()
      expect(partial.getBoard()).toEqual(parseLevel(level))
      for (const letter of path.slice(middle)) game.onInput(actions[letter])
      expect(game.getPuzzleStatus().won).toBe(true)
      const restored = new SokobanGame(); restored.loadState(game.saveState())
      expect(restored.getBoard()).toEqual(game.getBoard())
      expect(restored.getPuzzleStatus().completed).toContain(index)
      for (let n = 0; n < path.length; n++) restored.undo()
      expect(restored.getBoard()).toEqual(parseLevel(level))
      expect(restored.getPuzzleStatus().canUndo).toBe(false)
      expect(restored.getPuzzleStatus().completed).toContain(index)
    }
    expect(metric.shortestSolution).toHaveLength(metric.shortestSteps)
  })
})

test.each([14, 15, 16, 17, 18])('level %i requires moving initially placed boxes, not merely solving independent deliveries', number => {
  const level = LEVELS[number - 1], width = Math.max(...level.rows.map(row => row.length))
  const parked = level.rows.flatMap((row, y) => [...row].flatMap((cell, x) => cell === '*' ? [y * width + x] : []))
  expect(parked.length).toBeGreaterThan(0)
  for (const pos of parked) expect(pushSolve(level.rows, { frozen: pos })).toBeNull()
})

test.each([13, 15, 16, 17, 18, 19, 20, 21, 23, 24])('level %i needs a temporary move away from the nearest target (exhaustive constrained BFS)', number => {
  expect(pushSolve(LEVELS[number - 1].rows, { monotone: true })).toBeNull()
})
