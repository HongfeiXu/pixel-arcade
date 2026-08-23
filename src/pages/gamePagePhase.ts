export type PagePhase = 'idle' | 'restore' | 'countdown' | 'playing' | 'paused' | 'over' | 'confirm-exit'

export type TvBackCommand = 'pause' | 'lobby' | 'resume' | 'none'
export type TvCountdownCommand = 'consume' | 'lobby'

export function getTvCountdownCommand(action: 'left' | 'right' | 'up' | 'down' | 'select' | 'back', repeat = false): TvCountdownCommand {
  return action === 'back' && !repeat ? 'lobby' : 'consume'
}

export function getTvBackCommand(phase: PagePhase): TvBackCommand {
  if (phase === 'playing') return 'pause'
  if (phase === 'confirm-exit') return 'resume'
  if (phase === 'restore' || phase === 'countdown' || phase === 'paused' || phase === 'over') {
    return 'lobby'
  }
  return 'none'
}
