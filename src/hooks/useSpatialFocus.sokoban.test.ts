import { afterEach, expect, test, vi } from 'vitest'
import { openLevelPanel, backPanel, panelItemCount, moveSelectionFocus } from '../games/sokoban/selection'
import type { SelectionPanel } from '../games/sokoban/selection'

const harness = vi.hoisted(() => ({ effects: [] as Array<() => void | (() => void)> }))
vi.mock('react', () => ({
  useRef: (value: object | null) => ({ current: value }),
  useState: (value: number) => [value, () => {}],
  useCallback: (callback: object) => callback,
  useEffect: (effect: () => void | (() => void)) => harness.effects.push(effect),
}))
import { useSpatialFocus } from './useSpatialFocus'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
test.each([0, 11, 12, 23])('real focus hook: page current %i, arrows/OK/back, repeat OK ignored', level => {
  vi.useFakeTimers()
  const listeners = new Map<string, (event: KeyboardEvent) => void>()
  vi.stubGlobal('window', { addEventListener: (key: string, cb: (event: KeyboardEvent) => void) => listeners.set(key, cb), removeEventListener: (key: string) => listeners.delete(key) })
  const selections: number[] = [], backs: Array<SelectionPanel | null> = []
  let active = -1
  function mount(panel: SelectionPanel) {
    harness.effects = []
    const elements = Array.from({ length: panelItemCount(panel) }, (_, index) => ({
      dataset: {} as Record<string, string>, focus: () => { active = index }, scrollIntoView: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }))
    const container = {
      querySelectorAll: () => elements,
      querySelector: (selector: string) => elements[Number(selector.match(/"(\d+)"/)![1])],
    }
    useSpatialFocus({ containerRef: { current: container as never }, enabled: true, itemCount: elements.length, initialIndex: panel.initial,
      move: (index, direction) => moveSelectionFocus(panel, index, direction),
      onSelect: index => selections.push(panel.page * 12 + index), onBack: () => backs.push(backPanel(panel)),
    })
    const cleanups = harness.effects.map(effect => effect()).filter((cleanup): cleanup is () => void => typeof cleanup === 'function')
    return () => cleanups.forEach(cleanup => cleanup())
  }
  const press = (keyCode: number, repeat = false) => {
    const event = { keyCode, repeat, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() }
    listeners.get('keydown')!(event as never)
    if (!repeat) expect(event.preventDefault).toHaveBeenCalled()
  }
  const panel = openLevelPanel(level), cleanup = mount(panel)
  expect(active).toBe(level % 12)
  press(23); expect(selections).toEqual([level])
  press(23, true); expect(selections).toEqual([level])
  press(37); expect(active).toBe(level % 12 % 2 ? level % 12 - 1 : level % 12)
  press(40); expect(active).toBe(moveSelectionFocus(panel, level % 12 % 2 ? level % 12 - 1 : level % 12, 'down'))
  press(4); expect(backs).toEqual([backPanel(panel)])
  cleanup()
  // A keyed overlay remount restores the page/range focus, not a stale index with the same count.
  const ranges = backPanel(panel)!, cleanupRanges = mount(ranges)
  expect(active).toBe(panel.page)
  press(4); expect(backs.at(-1)).toEqual(backPanel(ranges))
  cleanupRanges()
  expect(listeners.size).toBe(0)
})
