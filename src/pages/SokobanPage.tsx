import PixelReward from '../components/PixelReward'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../hooks/useGame'
import { useTvMode } from '../hooks/useTvMode'
import { useSpatialFocus } from '../hooks/useSpatialFocus'
import GamePad from '../components/GamePad'
import { LEVELS } from '../games/sokoban/levels'
import { getSokobanKeyAction, SingleStepInput } from '../games/sokoban/input'
import { backPanel, LEVEL_PAGE_SIZE, LEVEL_RANGES, moveSelectionFocus, openLevelPanel, openRange, panelItemCount } from '../games/sokoban/selection'
import type { SelectionPanel } from '../games/sokoban/selection'
import type { PuzzleStatus } from '../games/sokoban/types'
import type { GameAction } from '../games/types'
import shared from './GamePage.module.css'
import styles from './SokobanPage.module.css'

export default function SokobanPage() {
  const navigate = useNavigate()
  const tv = useTvMode()
  const rootRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLElement>(null)
  const inputRef = useRef(new SingleStepInput())
  const { canvasRef, reward, puzzle, state, hasSavedState, start, pause, resume, handleAction, undoPuzzle, restartPuzzle, selectPuzzleLevel } = useGame('sokoban', areaRef)
  const [panel, setPanel] = useState<SelectionPanel | null>(null)
  const level = puzzle?.level ?? 0
  const won = puzzle?.won ?? false
  const openMenu = useCallback(() => { pause(); setPanel({ kind: 'menu', page: Math.floor(level / LEVEL_PAGE_SIZE), initial: 0 }) }, [pause, level])
  const openLevels = useCallback(() => { pause(); setPanel(openLevelPanel(level)) }, [pause, level])
  const closePanel = useCallback(() => { setPanel(null); resume(); rootRef.current?.focus() }, [resume])
  useEffect(() => { if (hasSavedState !== null && state === 'idle') start() }, [hasSavedState, state, start])
  useEffect(() => { if (state === 'paused' && panel === null) openMenu() }, [state, panel, openMenu])
  const chooseLevel = useCallback((index: number) => {
    selectPuzzleLevel(index); setPanel(null); rootRef.current?.focus()
  }, [selectPuzzleLevel])
  const nextLevel = () => chooseLevel((level + 1) % LEVELS.length)
  const back = () => {
    if (!panel) return
    const previous = backPanel(panel)
    if (previous) setPanel(previous)
    else closePanel()
  }
  const menuActions = [won ? nextLevel : closePanel, () => { undoPuzzle(); closePanel() }, () => { restartPuzzle(); closePanel() }, openLevels, () => navigate('/')]
  const padAction = (action: GameAction) => {
    if (action === 'x') undoPuzzle()
    else if (action === 'y') restartPuzzle()
    else if (action === 'b') openLevels()
    else if (action === 'a') openMenu()
    else handleAction(action)
  }
  useEffect(() => {
    const input = inputRef.current
    const down = (event: KeyboardEvent) => {
      if (panel !== null || !getSokobanKeyAction(event)) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLElement && event.target.closest('button')) return
      event.preventDefault(); event.stopImmediatePropagation()
      const action = input.press(event)
      if (!action) return
      if (action === 'menu') openMenu()
      else if (action === 'undo') undoPuzzle()
      else handleAction(action)
    }
    const up = (event: KeyboardEvent) => input.release(event)
    const blur = () => input.clear()
    window.addEventListener('keydown', down, true); window.addEventListener('keyup', up, true); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); window.removeEventListener('blur', blur) }
  }, [panel, openMenu, undoPuzzle, handleAction])
  return (
    <div ref={rootRef} tabIndex={-1} className={`${shared.container} ${styles.page} ${tv ? shared.tvMode : ''}`}>
      <header className={shared.topBar}>
        <button className={shared.iconBtn} onClick={openMenu} aria-label="打开游戏菜单">←</button>
        <div className={shared.tvGameTitle}>推箱子</div>
        <div className={styles.status}><h1>第 {level + 1} 关</h1><span>{puzzle?.completed.length ?? 0} / {LEVELS.length}</span></div>
        <div className={shared.tvStatus}>{won ? '已完成' : state === 'paused' ? '已暂停' : '游戏中'}</div>
        <button className={shared.iconBtn} onClick={openMenu} aria-label="暂停">⏸</button>
      </header>
      <main ref={areaRef} className={shared.canvasArea}>
        <canvas ref={canvasRef} role="img" aria-label={`第 ${level + 1} 关推箱子棋盘，方向键移动，Z 撤销`} />
        {reward && <PixelReward key={reward.id} kind={reward.kind} />}
        {won && <div className={styles.completed} aria-live="polite"><p>第 {level + 1} 关完成</p><button className={shared.primaryBtn} onClick={nextLevel}>{level === LEVELS.length - 1 ? '返回第 1 关' : '下一关'}</button><button className={shared.secondaryBtn} onClick={undoPuzzle}>撤销</button></div>}
      </main>
      <footer className={shared.controlArea}>
        <GamePad singleStep actionLabels={{ x: '撤销', y: '重来', b: '选关', a: '菜单' }} onAction={padAction} disabled={state !== 'playing'} />
      </footer>
      <aside className={shared.tvHelp} aria-label="遥控器操作提示">
        <p className={shared.tvHelpTitle}>遥控器</p><p>方向键：走一步</p><p>OK / 返回：菜单</p><p>Z：撤销</p>
      </aside>
      {panel && <SelectionOverlay key={`${panel.kind}-${panel.page}`} panel={panel} level={level} puzzle={puzzle} won={won} menuActions={menuActions} chooseLevel={chooseLevel} setPanel={setPanel} back={back} />}
    </div>
  )
}

interface OverlayProps {
  panel: SelectionPanel
  level: number
  puzzle: PuzzleStatus | null
  won: boolean
  menuActions: Array<() => void>
  chooseLevel: (index: number) => void
  setPanel: (panel: SelectionPanel) => void
  back: () => void
}
export function SelectionOverlay({ panel, level, puzzle, won, menuActions, chooseLevel, setPanel, back }: OverlayProps) {
  const ref = useRef<HTMLElement>(null)
  const select = (index: number) => {
    if (panel.kind === 'menu') menuActions[index]?.()
    else if (panel.kind === 'ranges') {
      if (index < LEVEL_RANGES.length) setPanel(openRange(index, level))
      else back()
    } else if (index < LEVEL_PAGE_SIZE) chooseLevel(panel.page * LEVEL_PAGE_SIZE + index)
    else back()
  }
  const focus = useSpatialFocus({ containerRef: ref, enabled: true, itemCount: panelItemCount(panel), initialIndex: panel.initial,
    move: (index, direction) => moveSelectionFocus(panel, index, direction), onSelect: select, onBack: back })
  const button = (index: number, label: string, primary = false) => <button key={index} className={primary ? shared.primaryBtn : shared.secondaryBtn} data-tv-focus-index={index} onFocus={() => focus.focusIndex(index)} onClick={() => select(index)}>{label}</button>
  return (
    <section ref={ref} className={`${shared.overlay} ${styles.selection}`} role="dialog" aria-modal="true" aria-label={panel.kind === 'menu' ? '游戏菜单' : '选择关卡'}>
      <div className={styles.dialog}>
        <h2 className={shared.overlayTitle}>{panel.kind === 'menu' ? '⏸ 暂停' : panel.kind === 'ranges' ? '选择范围' : `选择关卡 · ${LEVEL_RANGES[panel.page]}`}</h2>
        {panel.kind === 'menu' ? <>
          {button(0, won ? (level === LEVELS.length - 1 ? '返回第 1 关' : '下一关') : '▶ 继续', true)}
          {button(1, '↶ 撤销')}{button(2, '↻ 重来')}{button(3, '选择关卡')}{button(4, '↩ 返回大厅')}
        </> : panel.kind === 'ranges' ? <>
          {LEVEL_RANGES.map((range, index) => button(index, range, index === panel.page))}{button(2, '返回菜单')}
        </> : <>
          <div className={styles.levels}>{LEVELS.slice(panel.page * LEVEL_PAGE_SIZE, (panel.page + 1) * LEVEL_PAGE_SIZE).map((_, index) => {
            const absolute = panel.page * LEVEL_PAGE_SIZE + index
            return <button key={absolute} className={shared.secondaryBtn} aria-current={absolute === level ? 'step' : undefined} data-tv-focus-index={index} onFocus={() => focus.focusIndex(index)} onClick={() => chooseLevel(absolute)}>{puzzle?.completed.includes(absolute) ? '✓ ' : ''}第 {absolute + 1} 关</button>
          })}</div>
          {button(LEVEL_PAGE_SIZE, '返回范围')}
        </>}
        {panel.kind !== 'menu' && <small className={styles.credit}>13–24: Microban · David W. Skinner</small>}
      </div>
    </section>
  )
}
