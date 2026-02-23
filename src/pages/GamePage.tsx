import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gameRegistry } from '../games/registry'
import { useGame } from '../hooks/useGame'
import GamePad from '../components/GamePad'
import ScoreBoard from '../components/ScoreBoard'
import NextPiecePreview from '../components/NextPiecePreview'
import styles from './GamePage.module.css'

type PagePhase = 'idle' | 'restore' | 'countdown' | 'playing' | 'paused' | 'over' | 'confirm-exit'

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const entry = gameRegistry.find((e) => e.meta.id === id)

  const canvasAreaRef = useRef<HTMLDivElement>(null)

  const {
    canvasRef, state, score, nextPiece,
    hasSavedState, savedScore,
    start, pause, resume, restart,
    handleAction, loadSaved, clearSave,
  } = useGame(id || '', canvasAreaRef)

  const [phase, setPhase] = useState<PagePhase>('idle')
  const [countdown, setCountdown] = useState(3)
  const [isNewRecord, setIsNewRecord] = useState(false)

  // 检测存档 → 决定初始 phase
  useEffect(() => {
    if (hasSavedState) {
      setPhase('restore')
    } else {
      startCountdown()
    }
  }, [hasSavedState])

  // 游戏状态变化同步到 page phase
  useEffect(() => {
    if (state === 'paused' && phase === 'playing') {
      setPhase('paused')
    }
    if (state === 'over' && phase !== 'over') {
      // 检查是否新纪录
      const scoresJson = localStorage.getItem('pixelarcade_scores')
      const scores = scoresJson ? JSON.parse(scoresJson) : {}
      setIsNewRecord(scores[id!] === score && score > 0)
      setPhase('over')
    }
  }, [state, phase, id, score])

  const startCountdown = useCallback(() => {
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
  }, [start])

  const handleResume = useCallback(() => {
    setPhase('playing')
    resume()
  }, [resume])

  const handleRestart = useCallback(() => {
    restart()
    setPhase('playing')
  }, [restart])

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

  const handleRestoreLoad = useCallback(() => {
    loadSaved()
    setPhase('playing')
  }, [loadSaved])

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
        <ScoreBoard score={score} />
        <button className={styles.iconBtn} onClick={handlePauseBtn}>
          {state === 'paused' ? '▶' : '⏸'}
        </button>
      </header>

      {/* Canvas 游戏区域 */}
      <main className={styles.canvasArea} ref={canvasAreaRef}>
        <canvas ref={canvasRef} />
      </main>

      {/* 虚拟手柄 */}
      <footer className={styles.controlArea}>
        <GamePad onAction={handleAction} disabled={phase !== 'playing'} />
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
