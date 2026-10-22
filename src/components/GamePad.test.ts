import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { GameAction } from '../games/types'

vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useRef: (value: object | null) => ({ current: value }),
  useCallback: (callback: object) => callback,
}))
import GamePad from './GamePad'

interface ElementProps { children?: ReactNode; action?: GameAction; onPointerDown?: () => void; onPointerUp?: () => void; onPointerCancel?: () => void; onClick?: (event: { detail: number }) => void }
function actionButtons(node: ReactNode): ReactElement<ElementProps>[] {
  if (!isValidElement<ElementProps>(node)) return []
  if (node.props.action) return [node]
  return (Array.isArray(node.props.children) ? node.props.children : [node.props.children]).flatMap(child => actionButtons(child))
}
function renderButton(element: ReactElement<ElementProps>) {
  return (element.type as (props: ElementProps) => ReactElement<ElementProps>)(element.props)
}
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('Sokoban shared pad: all eight controls single-step, hold never repeats, keyboard click works once', () => {
  const onAction = vi.fn()
  const pad = GamePad({ onAction, singleStep: true, actionLabels: { x: '撤销', y: '重来', b: '选关', a: '菜单' } })
  const buttons = actionButtons(pad)
  expect(buttons).toHaveLength(8)
  for (const element of buttons) {
    onAction.mockClear()
    const button = renderButton(element)
    button.props.onPointerDown!()
    vi.advanceTimersByTime(1000)
    expect(onAction).toHaveBeenCalledExactlyOnceWith(element.props.action)
    button.props.onClick!({ detail: 1 })
    expect(onAction).toHaveBeenCalledTimes(1)
    button.props.onClick!({ detail: 0 })
    expect(onAction).toHaveBeenCalledTimes(2)
  }
})

test('old games keep default side-button repeat and snake keeps all-direction repeat', () => {
  for (const directionRepeat of [false, true]) {
    const onAction = vi.fn()
    for (const element of actionButtons(GamePad({ onAction, directionRepeat }))) {
      onAction.mockClear()
      const button = renderButton(element)
      button.props.onPointerDown!(); vi.advanceTimersByTime(450)
      const shouldRepeat = directionRepeat || ['left', 'right', 'x', 'b'].includes(element.props.action!)
      expect(onAction).toHaveBeenCalledTimes(shouldRepeat ? 4 : 1)
      button.props.onPointerUp?.(); vi.advanceTimersByTime(450)
      expect(onAction).toHaveBeenCalledTimes(shouldRepeat ? 4 : 1)
    }
  }
})

test('disabled Sokoban pad ignores pointer and keyboard actions', () => {
  const onAction = vi.fn()
  for (const element of actionButtons(GamePad({ onAction, singleStep: true, disabled: true }))) {
    const button = renderButton(element)
    button.props.onPointerDown!(); button.props.onClick!({ detail: 0 })
  }
  vi.advanceTimersByTime(1000)
  expect(onAction).not.toHaveBeenCalled()
})
