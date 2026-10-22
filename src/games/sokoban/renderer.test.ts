import { describe, expect, it, vi } from 'vitest'
import { LEVELS, parseLevel } from './levels'
import { getCellSize, STANDARD_CELL_SIZE, getVisibleCells, renderBoard } from './renderer'

const parse = (rows: string[]) => parseLevel({ name: 'render fixture', hint: '', rows })

describe('Sokoban stable cell size', () => {
  it('does not enlarge tiles to fill a large screen', () => {
    expect(getCellSize({ width: 2000, height: 1200 })).toBe(STANDARD_CELL_SIZE)
  })

  it.each([{ width: 288, height: 200 }, { width: 361, height: 520 }, { width: 1000, height: 420 }])(
    'uses identical rendered tile sizes for every level within $width × $height', config => {
      const ctx = {
        setTransform() {}, clearRect() {}, save() {}, restore() {}, translate() {}, scale() {}, fillRect() {},
        beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {},
      }
      const canvas = { width: 0, height: 0, style: { width: '', height: '' }, getContext: () => ctx }
      const sizes = new Set<number>()
      for (const level of LEVELS) {
        const board = parseLevel(level)
        renderBoard(canvas as unknown as HTMLCanvasElement, { ...config, devicePixelRatio: 2, soundEnabled: false }, board)
        const width = Number.parseFloat(canvas.style.width)
        const height = Number.parseFloat(canvas.style.height)
        sizes.add(width / board.width)
        expect(width / board.width).toBe(height / board.height)
        expect(width).toBeLessThanOrEqual(config.width)
        expect(height).toBeLessThanOrEqual(config.height)
        expect(canvas.width).toBe(width * 2)
      }
      expect([...sizes]).toEqual([getCellSize(config)])
      expect(getCellSize(config)).toBeLessThanOrEqual(STANDARD_CELL_SIZE)
    },
  )
})

describe('Sokoban warehouse visibility', () => {
  it('omits Microban 21 exterior leading space and padded walls without changing the board', () => {
    const board = parseLevel(LEVELS[12])
    const before = JSON.stringify({ ...board, walls: [...board.walls], targets: [...board.targets] })
    const visible = getVisibleCells(board)
    expect(LEVELS[12].source?.index).toBe(21)
    expect(visible.has(5 * board.width)).toBe(false)
    expect(visible.has(6)).toBe(false)
    expect(visible.has(board.player)).toBe(true)
    for (const pos of [...board.boxes, ...board.targets]) expect(visible.has(pos)).toBe(true)
    expect(JSON.stringify({ ...board, walls: [...board.walls], targets: [...board.targets] })).toBe(before)
  })

  it('includes empty paths and targets beyond blocking boxes', () => {
    const board = parse(['########', '#@$$  .#', '########'])
    const visible = getVisibleCells(board)
    expect(visible.size).toBe(board.width * board.height)
    expect(getVisibleCells({ ...board, boxes: [] })).toEqual(visible)
    expect(getVisibleCells({ ...board, player: 13, boxes: [9, 10] })).toEqual(visible)
  })

  it('does not wrap flood fill across row edges or show disconnected floor', () => {
    const board = parse(['## ', '@##', '###'])
    expect(getVisibleCells(board).has(2)).toBe(false)
  })

  it('keeps diagonal corner walls and the inner boundary, not thick outer padding', () => {
    const board = parse(['#######', '#######', '##@  ##', '#######', '#######'])
    const visible = getVisibleCells(board)
    const expected = new Set<number>()
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 5; x++) expected.add(y * board.width + x)
    expect(visible).toEqual(expected)
  })

  it.each(LEVELS.slice(0, 12).map((level, index) => ({ level, index: index + 1 })))(
    'keeps every cell of original rectangular level $index', ({ level }) => {
      const board = parseLevel(level)
      expect(getVisibleCells(board)).toEqual(new Set(Array.from({ length: board.width * board.height }, (_, i) => i)))
    },
  )

  it('clears the entire DPR canvas before drawing only visible cells on repeated renders', () => {
    const ctx = {
      setTransform: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
      translate: vi.fn(), scale: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(),
      imageSmoothingEnabled: true, fillStyle: '', strokeStyle: '', lineWidth: 1,
    }
    const canvas = { width: 0, height: 0, style: { width: '', height: '' }, getContext: vi.fn(() => ctx) }
    const config = { width: 144, height: 112, devicePixelRatio: 2, soundEnabled: false }
    const board = parseLevel(LEVELS[12])
    const draw = () => renderBoard(canvas as unknown as HTMLCanvasElement, config, board)
    draw()
    expect(canvas.width).toBe(224)
    expect(canvas.height).toBe(192)
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 112, 96)
    expect(ctx.clearRect.mock.invocationCallOrder[0]).toBeLessThan(ctx.fillRect.mock.invocationCallOrder[0])
    const drawn = new Set(ctx.translate.mock.calls.map(([x, y]) => y / 16 * board.width + x / 16))
    expect(drawn).toEqual(getVisibleCells(board))
    expect(ctx.translate).not.toHaveBeenCalledWith(0, 80)
    expect(ctx.imageSmoothingEnabled).toBe(false)
    draw()
    expect(ctx.clearRect).toHaveBeenCalledTimes(2)
  })
})
