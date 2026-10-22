import { normalizeTvRemoteKey } from '../../input/tvRemote'
import type { TvKeyLike } from '../../input/tvRemote'
import type { Direction } from './types'
export type SokobanKeyAction = Direction | 'undo' | 'menu'
export function getSokobanKeyAction(event: TvKeyLike): SokobanKeyAction | null {
  const remote = normalizeTvRemoteKey(event)
  if (remote === 'select' || remote === 'back') return 'menu'
  if (remote) return remote
  const key = event.code || event.key || ''
  const keys: Record<string, SokobanKeyAction> = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', KeyZ: 'undo', Backspace: 'undo', w: 'up', s: 'down', a: 'left', d: 'right', z: 'undo' }
  return keys[key] ?? null
}
export function moveLevelFocus(index: number, direction: Direction, count: number): number {
  if (index === count) return direction === 'up' ? count - 1 : index
  if (direction === 'left') return index % 2 === 1 ? index - 1 : index
  if (direction === 'right') return index % 2 === 0 && index + 1 < count ? index + 1 : index
  if (direction === 'up') return index < 2 ? index : index - 2
  return index + 2 < count ? index + 2 : count
}

// 不使用 DAS；即便老遥控漏报 repeat，也要等 keyup 才接受下一个同键。
export class SingleStepInput {
  private held = new Set<string>()
  press(event: TvKeyLike): SokobanKeyAction | null {
    const action = getSokobanKeyAction(event)
    if (!action) return null
    const id = this.id(event)
    if (event.repeat || this.held.has(id)) return null
    this.held.add(id)
    return action
  }
  release(event: TvKeyLike) { this.held.delete(this.id(event)) }
  clear() { this.held.clear() }
  private id(event: TvKeyLike) {
    const code = event.code && event.code !== 'Unidentified' ? event.code : null
    return String(code || event.keyCode || event.key)
  }
}
