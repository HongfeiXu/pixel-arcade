export type TvRemoteAction = 'left' | 'right' | 'up' | 'down' | 'select' | 'back'

export interface TvKeyLike {
  key?: string
  code?: string
  keyCode?: number
  repeat?: boolean
}

const KEY_ACTIONS: Readonly<Record<string, TvRemoteAction>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Enter: 'select',
  Escape: 'back',
  BrowserBack: 'back',
  GoBack: 'back',
}

const CODE_ACTIONS: Readonly<Record<string, TvRemoteAction>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Enter: 'select',
  NumpadEnter: 'select',
  Escape: 'back',
  BrowserBack: 'back',
}

const LEGACY_KEY_CODE_ACTIONS: Readonly<Record<number, TvRemoteAction>> = {
  4: 'back',
  13: 'select',
  23: 'select',
  27: 'back',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  461: 'back',
}

export function normalizeTvRemoteKey(event: TvKeyLike): TvRemoteAction | null {
  if (event.key) {
    const byKey = KEY_ACTIONS[event.key]
    if (byKey) return byKey
  }

  if (event.code) {
    const byCode = CODE_ACTIONS[event.code]
    if (byCode) return byCode
  }

  return event.keyCode == null ? null : LEGACY_KEY_CODE_ACTIONS[event.keyCode] ?? null
}

export function shouldHandleTvRemoteKey(event: TvKeyLike, action: TvRemoteAction): boolean {
  return !event.repeat || action === 'left' || action === 'right' || action === 'up' || action === 'down'
}

export const SYNTHETIC_SELECT_CLICK_WINDOW_MS = 750

export function shouldSuppressSyntheticSelectClick(detail: number, elapsedMs: number): boolean {
  return detail === 0 && elapsedMs >= 0 && elapsedMs <= SYNTHETIC_SELECT_CLICK_WINDOW_MS
}
