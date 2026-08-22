import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gameRegistry } from '../games/registry'
import { useGame } from '../hooks/useGame'
import { useKeyboard, DEFAULT_KEY_MAP } from '../hooks/useKeyboard'
import { useBgm } from '../hooks/useBgm'
import GamePad from '../components/GamePad'
import ScoreBoard from '../components/ScoreBoard'
import ScorePopup from '../components/ScorePopup'
import NextPiecePreview from '../components/NextPiecePreview'
import { isNewRecord as checkIsNewRecord } from './gameRecord'
import styles from './GamePage.module.css'

type PagePhase = 'idle' | 'restore' | 'countdown' | 'playing' | 'paused' | 'over' | 'confirm-exit'

// snake 所有方向键（含 XYAB 映射的 J/K/Z/X/Space）都要支持长按加速，
// 覆盖默认 keyMap 里的 repeat:false
const SNAKE_KEY_MAP = {
  ...DEFAULT_KEY_MAP,
  ArrowUp:   { action: 'up'   as const, repeat: true },
  ArrowDown: { action: 'down' as const, repeat: true },
  KeyW:      { action: 'up'   as const, repeat: true },
  KeyS:      { action: 'down' as const, repeat: true },
  KeyJ:      { action: 'a'    as const, repeat: true },
  KeyZ:      { action: 'a'    as const, repeat: true },
  KeyK:      { action: 'b'    as const, repeat: true },
  KeyX:      { action: 'b'    as const, repeat: true },
  Space:     { action: 'a'    as const, repeat: true },
}

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const entry = gameRegistry.find((e) => e.meta.id === id)

  const canvasAreaRef = useRef<HTMLDivElement>(null)

  const {
    canvasRef, state, score, scoreGain, highScore, nextPiece,
    hasSavedState, savedScore,
    start, pause, resume, restart,
    handleAction, loadSaved, clearSave,
  } = useGame(id || '', canvasAreaRef)

  const [phase, setPhase] = useState<PagePhase>('idle')
  const [countdown, setCountdown] = useState(3)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const roundStartHighScoreRef = useRef(0)

  const captureRecordBaseline = useCallback(() => {
    roundStartHighScoreRef.current = highScore
    setIsNewRecord(false)
  }, [highScore])

  // 游戏状态变化同步到 page phase
  useEffect(() => {
    if (state === 'paused' && phase === 'playing') {
      setPhase('paused')
    }
    if (state === 'over' && phase !== 'over') {
      setIsNewRecord(checkIsNewRecord(score, roundStartHighScoreRef.current))
      setPhase('over')
    }
  }, [state, phase, score])

  const startCountdown = useCallback(() => {
    captureRecordBaseline()
    setPhase('countdown')
    setCountdown(3)

    let count = 3
    const timer = setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        clearInterval(timer)
        setPhase('playing')
        start()
      }
    }, 800)

    return () => clearInterval(timer)
  }, [start, captureRecordBaseline])

  // 检测存档 → 决定初始 phase（等 hasSavedState 从 null 变为确定值后再决策）
  useEffect(() => {
    if (phase !== 'idle' || hasSavedState === null) return
    if (hasSavedState) {
      setPhase('restore')
    } else {
      startCountdown()
    }
  }, [hasSavedState, phase, startCountdown])

  const handleResume = useCallback(() => {
    setPhase('playing')
    resume()
  }, [resume])

  const handleRestart = useCallback(() => {
    captureRecordBaseline()
    restart()
    setPhase('playing')
  }, [restart, captureRecordBaseline])

  const handleBack = useCallback(() => {
    if (state === 'playing') {
      pause()
      setPhase('confirm-exit')
    } else if (state === 'paused') {
      setPhase('confirm-exit')
    } else {
      navigate('/')
    }
  }, [state, pause, navigate])

  const handleConfirmExit = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleCancelExit = useCallback(() => {
    setPhase('playing')
    resume()
  }, [resume])

  const handlePauseBtn = useCallback(() => {
    if (state === 'playing') {
      pause()
      setPhase('paused')
    } else if (state === 'paused') {
      handleResume()
    }
  }, [state, pause, handleResume])

  // 键盘控制（snake 使用专属 keyMap 让上下方向键也支持长按）
  useKeyboard({
    onAction: handleAction,
    onPauseToggle: handlePauseBtn,
    enabled: phase === 'playing',
    keyMap: id === 'snake' ? SNAKE_KEY_MAP : undefined,
  })

  // 背景音乐：倒计时和游戏中播放，其余暂停
  useBgm(phase === 'countdown' || phase === 'playing')

  const handleRestoreLoad = useCallback(() => {
    captureRecordBaseline()
    loadSaved()
    setPhase('playing')
  }, [loadSaved, captureRecordBaseline])

  const handleRestoreNew = useCallback(() => {
    clearSave()
    startCountdown()
  }, [clearSave, startCountdown])

  if (!entry) {
    return (
      <div className={styles.container}>
        <p className={styles.message}>游戏不存在</p>
        <button className={styles.primaryBtn} onClick={() => navigate('/')}>
          返回大厅
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 顶部栏 */}
      <header className={styles.topBar}>
        <button className={styles.iconBtn} onClick={handleBack}>←</button>
        <NextPiecePreview pieceType={nextPiece} />
        <ScoreBoard score={score} highScore={highScore} />
        <button className={styles.iconBtn} onClick={handlePauseBtn}>
          {state === 'paused' ? '▶' : '⏸'}
        </button>
      </header>

      {/* Canvas 游戏区域 */}
      <main className={styles.canvasArea} ref={canvasAreaRef}>
        <canvas ref={canvasRef} />
        {scoreGain && <ScorePopup key={scoreGain.id} points={scoreGain.points} />}
      </main>

      {/* 虚拟手柄 */}
      <footer className={styles.controlArea}>
        <GamePad onAction={handleAction} disabled={phase !== 'playing'} directionRepeat={id === 'snake'} />
      </footer>

      {/* 覆盖层 */}
      {phase === 'restore' && (
        <div className={styles.overlay}>
          <p className={styles.overlayTitle}>⭐ 上次获得 {savedScore} 颗星星</p>
          <button className={styles.primaryBtn} onClick={handleRestoreLoad}>
            继续游戏
          </button>
          <button className={styles.secondaryBtn} onClick={handleRestoreNew}>
            新游戏
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className={styles.overlay}>
          <p className={styles.countdownNumber}>{countdown}</p>
        </div>
      )}

      {phase === 'paused' && (
        <div className={styles.overlay}>
          <p className={styles.overlayTitle}>⏸ 暂停</p>
          <button className={styles.primaryBtn} onClick={handleResume}>
            ▶ 继续
          </button>
          <button className={styles.secondaryBtn} onClick={() => navigate('/')}>
            ↩ 返回大厅
          </button>
        </div>
      )}

      {phase === 'over' && (
        <div className={styles.overlay}>
          <p className={styles.overlayTitle}>游戏结束!</p>
          <p className={styles.overlayScore}>⭐ {score} 颗星星</p>
          {isNewRecord && <p className={styles.newRecord}>🏆 新纪录!</p>}
          <button className={styles.primaryBtn} onClick={handleRestart}>
            再来一局
          </button>
          <button className={styles.secondaryBtn} onClick={() => navigate('/')}>
            返回大厅
          </button>
        </div>
      )}

      {phase === 'confirm-exit' && (
        <div className={styles.overlay}>
          <p className={styles.overlayTitle}>确定退出游戏?</p>
          <p className={styles.overlayHint}>(进度会自动保存)</p>
          <button className={styles.primaryBtn} onClick={handleConfirmExit}>
            退出
          </button>
          <button className={styles.secondaryBtn} onClick={handleCancelExit}>
            继续玩
          </button>
        </div>
      )}
    </div>
  )
}
