import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../hooks/useGame'
import { useTvMode } from '../hooks/useTvMode'
import { useSpatialFocus } from '../hooks/useSpatialFocus'
import { moveLinearFocus } from '../hooks/spatialFocus'
import { LEVELS } from '../games/sokoban/levels'
import { getSokobanKeyAction, moveLevelFocus, SingleStepInput } from '../games/sokoban/input'
import type { Direction } from '../games/sokoban/types'
import styles from './SokobanPage.module.css'

type Panel = 'menu' | 'levels' | null
export default function SokobanPage() {
  const navigate = useNavigate()
  const tv = useTvMode()
  const rootRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLElement>(null)
  const inputRef = useRef(new SingleStepInput())
  const { canvasRef, puzzle, state, hasSavedState, start, pause, resume, handleAction, undoPuzzle, restartPuzzle, selectPuzzleLevel } = useGame('sokoban', areaRef)
  const [panel, setPanel] = useState<Panel>(null)
  const level = puzzle?.level ?? 0
  const won = puzzle?.won ?? false
  const openMenu = useCallback(() => { pause(); setPanel('menu') }, [pause])
  const closePanel = useCallback(() => { setPanel(null); resume(); rootRef.current?.focus() }, [resume])
  useEffect(() => {
    if (hasSavedState !== null && state === 'idle') start()
  }, [hasSavedState, state, start])
  useEffect(() => { if (state === 'paused' && panel === null) setPanel('menu') }, [state, panel])
  const chooseLevel = useCallback((index: number) => {
    selectPuzzleLevel(index); setPanel(null); rootRef.current?.focus()
  }, [selectPuzzleLevel])
  const menuActions = [closePanel, () => { undoPuzzle(); closePanel() }, () => { restartPuzzle(); closePanel() }, () => setPanel('levels'), () => navigate('/')]
  const itemCount = panel === 'levels' ? LEVELS.length + 1 : panel === 'menu' ? menuActions.length : 0
  useSpatialFocus({
    containerRef: rootRef, enabled: tv && panel !== null, itemCount,
    move: (index, direction) => panel === 'levels' ? moveLevelFocus(index, direction, LEVELS.length) : moveLinearFocus(index, direction, itemCount),
    onSelect: index => panel === 'levels' ? (index < LEVELS.length ? chooseLevel(index) : setPanel('menu')) : (index === 0 && won ? chooseLevel((level + 1) % LEVELS.length) : menuActions[index]?.()),
    onBack: panel === 'levels' ? () => setPanel('menu') : closePanel,
  })
  useEffect(() => {
    const input = inputRef.current
    // 切面板时保留 held，防止同一次 OK 的后续事件穿透新面板。
    const down = (event: KeyboardEvent) => {
      if (panel !== null || !getSokobanKeyAction(event)) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
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
  const direction = (action: Direction, label: string, symbol: string) => (
    <button className={styles[action]} aria-label={label} disabled={won || state !== 'playing'} onClick={() => handleAction(action)}>{symbol}</button>
  )
  return (
    <div ref={rootRef} tabIndex={-1} className={`${styles.page} ${tv ? styles.tv : ''}`}>
      <header className={styles.header}>
        <button onClick={openMenu} aria-label="打开游戏菜单">☰ 菜单</button>
        <div><h1>推箱子</h1><p>第 {level + 1} 关 · {LEVELS[level].name}</p></div>
        <button onClick={() => { pause(); setPanel('levels') }}>选关</button>
      </header>
      <p className={styles.hint}>{LEVELS[level].hint}</p>
      <main ref={areaRef} className={styles.board}>
        <canvas ref={canvasRef} role="img" aria-label={`第 ${level + 1} 关推箱子棋盘，方向键移动，Z 撤销`} />
      </main>
      <div className={styles.feedback} aria-live="polite">
        {won ? <div className={styles.success} key={level}><strong>{level === LEVELS.length - 1 ? '所有礼物都到家啦！' : '箱子到家啦！'}</strong><button onClick={() => chooseLevel((level + 1) % LEVELS.length)}>{level === LEVELS.length - 1 ? '再玩第一关' : '下一关 →'}</button></div> : <span>◇ 目标　▧ 木箱　✓ 已到位</span>}
      </div>
      <footer className={styles.controls}>
        <div className={styles.actions}><button onClick={undoPuzzle} disabled={!puzzle?.canUndo}>↶ 撤销</button><button onClick={restartPuzzle}>↻ 重来</button></div>
        <div className={styles.dpad} aria-label="方向控制">{direction('up','向上','▲')}{direction('left','向左','◀')}{direction('down','向下','▼')}{direction('right','向右','▶')}</div>
        <p className={styles.help}>{tv ? '方向键走一步 · OK / 返回打开菜单' : '方向键 / WASD 移动 · Z 撤销 · Enter 菜单'}</p>
        {tv && <button onClick={openMenu}>OK 打开菜单 / 下一关</button>}
      </footer>
      {panel && <section className={styles.overlay} role="dialog" aria-modal="true" aria-label={panel === 'levels' ? '选择关卡' : '游戏菜单'}>
        <div className={styles.dialog}>
          <h2>{panel === 'levels' ? '想玩哪一关？' : '休息一下'}</h2>
          {panel === 'menu' ? <>
            <button data-tv-focus-index={0} onClick={won ? () => chooseLevel((level + 1) % LEVELS.length) : closePanel}>{won ? (level === LEVELS.length - 1 ? '再玩第一关' : '下一关 →') : '继续游戏'}</button>
            <button data-tv-focus-index={1} onClick={menuActions[1]}>↶ 撤销一步{!puzzle?.canUndo ? '（还没走动）' : ''}</button>
            <button data-tv-focus-index={2} onClick={menuActions[2]}>↻ 重来本关</button>
            <button data-tv-focus-index={3} onClick={() => setPanel('levels')}>选择关卡</button>
            <button data-tv-focus-index={4} onClick={() => navigate('/')}>返回大厅（自动保存）</button>
          </> : <>
            <div className={styles.levels}>{LEVELS.map((entry, index) => <button key={entry.name} aria-current={index === level ? 'step' : undefined} data-tv-focus-index={index} onClick={() => chooseLevel(index)}>{puzzle?.completed.includes(index) ? '✓ ' : ''}{index + 1} · {entry.name}</button>)}</div>
            <button data-tv-focus-index={LEVELS.length} onClick={() => setPanel('menu')}>返回菜单</button>
          </>}
          <p>慢慢想，随时撤销。进度自动保存在这台设备。</p>
        </div>
      </section>}
    </div>
  )
}
