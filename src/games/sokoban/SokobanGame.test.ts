import { describe, expect, test } from 'vitest'
import { SokobanGame } from './SokobanGame'
import { LEVELS, parseLevel } from './levels'
import type { Direction } from './types'
import { SingleStepInput, getSokobanKeyAction, moveLevelFocus } from './input'

const directions: Direction[] = ['up', 'down', 'left', 'right']
// 独立 BFS：直接读地图和坐标，不调用引擎移动方法，避免同一个 bug 自证。
function solve(index: number): Direction[] | null {
  const board = parseLevel(LEVELS[index])
  const key = (p: number, b: number[]) => `${p}:${[...b].sort((a,b) => a-b).join(',')}`
  const queue = [{ p: board.player, b: board.boxes, path: [] as Direction[] }]
  const seen = new Set([key(board.player, board.boxes)])
  for (let head = 0; head < queue.length && head < 300000; head++) {
    const { p, b, path } = queue[head]
    if (b.every(pos => board.targets.has(pos))) return path
    for (const direction of directions) {
      const [dx,dy] = direction === 'up' ? [0,-1] : direction === 'down' ? [0,1] : direction === 'left' ? [-1,0] : [1,0]
      const x = p % board.width + dx, y = Math.floor(p / board.width) + dy
      if (x < 0 || x >= board.width || y < 0 || y >= board.height) continue
      const next = y * board.width + x
      if (board.walls.has(next)) continue
      const boxes = [...b], box = boxes.indexOf(next)
      if (box >= 0) {
        const bx = x + dx, by = y + dy, beyond = by * board.width + bx
        if (bx < 0 || bx >= board.width || by < 0 || by >= board.height || board.walls.has(beyond) || boxes.includes(beyond)) continue
        boxes[box] = beyond
      }
      const id = key(next, boxes)
      if (!seen.has(id)) { seen.add(id); queue.push({ p: next, b: boxes, path: [...path, direction] }) }
    }
  }
  return null
}

describe('手工关卡独立求解并通过真实引擎回放', () => {
  test.each(LEVELS.map((level,index) => [index,level.name] as const))('第 %i 关 %s', index => {
    const board = parseLevel(LEVELS[index])
    expect(board.boxes.length).toBe(board.targets.size)
    expect(board.player).toBeGreaterThanOrEqual(0)
    expect(LEVELS[index].rows.every(row => row.length === board.width)).toBe(true)
    const solution = solve(index)
    expect(solution).not.toBeNull()
    const game = new SokobanGame(); game.selectLevel(index)
    for (const direction of solution!) game.onInput(direction)
    expect(game.getPuzzleStatus().won).toBe(true)
    expect(game.getPuzzleStatus().completed).toContain(index)
    console.info(`关卡 ${index + 1} ${LEVELS[index].name}：BFS 最短 ${solution!.length} 步，回放通关`)
    for (let i = 0; i < solution!.length; i++) game.undo()
    expect(game.getBoard()).toEqual(board)
    expect(game.getPuzzleStatus().canUndo).toBe(false)
  })
})

test('一步通关、完成后不再移动、撤销通关、重来不清完成记录', () => {
  const game = new SokobanGame(); game.start(); const initial = game.getBoard()
  game.onInput('up'); expect(game.getBoard()).toEqual(initial)
  expect(game.getPuzzleStatus().canUndo).toBe(false)
  game.onInput('right'); expect(game.getPuzzleStatus().won).toBe(true)
  const won = game.getBoard(); game.onInput('right'); expect(game.getBoard()).toEqual(won)
  game.undo(); expect(game.getBoard()).toEqual(initial)
  expect(game.getPuzzleStatus().won).toBe(false)
  game.onInput('right'); game.restartLevel()
  expect(game.getBoard()).toEqual(initial); expect(game.getPuzzleStatus().completed).toEqual([0])
})

test('走路不推箱、墙后不能推、两个箱子不能一起推', () => {
  const game = new SokobanGame(); game.selectLevel(3)
  const boxes = game.getBoard().boxes
  game.onInput('left'); expect(game.getBoard().boxes).toEqual(boxes)
  game.restartLevel(); game.onInput('up'); game.onInput('left')
  const atWall = game.getBoard(); game.onInput('left'); expect(game.getBoard()).toEqual(atWall)
  // 有效历史重放构造相邻两箱：第七关把下面箱子向上推到上面箱子下。
  game.selectLevel(6); game.onInput('up'); game.onInput('up')
  const adjacent = game.getBoard(); game.onInput('up'); expect(game.getBoard()).toEqual(adjacent)
  game.selectLevel(1); game.onInput('right'); game.onInput('right'); game.onInput('right')
  expect(game.getPuzzleStatus().won).toBe(true)
})

test('暂停不接受移动，切关清本关历史，无限撤销超过常见上限', () => {
  const game = new SokobanGame(); game.selectLevel(3)
  const initial = game.getBoard(); game.pause(); game.onInput('left'); expect(game.getBoard()).toEqual(initial)
  game.resume()
  for (let i = 0; i < 300; i++) { game.onInput('left'); game.onInput('right') }
  for (let i = 0; i < 600; i++) game.undo()
  expect(game.getBoard()).toEqual(initial); expect(game.getPuzzleStatus().canUndo).toBe(false)
  game.selectLevel(2); expect(game.getBoard()).toEqual(parseLevel(LEVELS[2]))
  game.selectLevel(-1); game.selectLevel(999); expect(game.getPuzzleStatus().level).toBe(2)
})

test('存档保留完成关卡、所选关卡及所有撤销历史', () => {
  const game = new SokobanGame(); game.start(); game.onInput('right'); game.selectLevel(3); game.onInput('left'); game.pause()
  const restored = new SokobanGame(); restored.loadState(game.saveState())
  expect(restored.getState()).toBe('playing'); expect(restored.getBoard()).toEqual(game.getBoard())
  expect(restored.getPuzzleStatus()).toEqual(game.getPuzzleStatus())
  restored.undo(); expect(restored.getBoard()).toEqual(parseLevel(LEVELS[3]))
  game.selectLevel(0); game.onInput('right'); restored.loadState(game.saveState())
  expect(restored.getPuzzleStatus().won).toBe(true); restored.undo(); expect(restored.getPuzzleStatus().won).toBe(false)
})

test.each(['{', 'null', '{}', '{"version":99}', '{"version":1,"level":99,"completed":[],"history":[]}', '{"version":1,"level":0,"completed":[],"history":["up"]}', '{"version":1,"level":0,"completed":[],"history":["right","left"]}'])('损坏存档不改变当前状态 %s', saved => {
  const game = new SokobanGame(); game.start(); const before = game.saveState(); game.loadState(saved)
  expect(game.saveState()).toBe(before)
})

test('选关两列焦点不穿行，底部返回菜单可达', () => {
  expect(moveLevelFocus(0, 'left', 12)).toBe(0)
  expect(moveLevelFocus(0, 'right', 12)).toBe(1)
  expect(moveLevelFocus(1, 'right', 12)).toBe(1)
  expect(moveLevelFocus(1, 'down', 12)).toBe(3)
  expect(moveLevelFocus(10, 'down', 12)).toBe(12)
  expect(moveLevelFocus(12, 'up', 12)).toBe(11)
})

test('遥控器与桌面单步：忽略 repeat、漏标 repeat、keyup 后再次可走', () => {
  const input = new SingleStepInput()
  expect(input.press({ keyCode: 39 })).toBe('right')
  expect(input.press({ keyCode: 39 })).toBeNull()
  expect(input.press({ keyCode: 39, repeat: true })).toBeNull()
  input.release({ keyCode: 39 }); expect(input.press({ keyCode: 39 })).toBe('right')
  input.clear(); expect(input.press({ code: 'KeyZ' })).toBe('undo')
  input.clear(); expect(input.press({ code: 'Unidentified', keyCode: 37 })).toBe('left')
  expect(input.press({ code: 'Unidentified', keyCode: 38 })).toBe('up')
  expect(getSokobanKeyAction({ keyCode: 23 })).toBe('menu')
  expect(getSokobanKeyAction({ keyCode: 4 })).toBe('menu')
  expect(getSokobanKeyAction({ key: 'Backspace' })).toBe('undo')
})
