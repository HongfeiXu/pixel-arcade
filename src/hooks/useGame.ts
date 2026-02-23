import { useRef, useState, useEffect, useCallback } from 'react'
import type { GameAction, GameState, GameInstance } from '../games/types'
import { gameRegistry } from '../games/registry'

const STORAGE_PREFIX = 'pixelarcade_'

export function useGame(gameId: string, containerRef: React.RefObject<HTMLElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<GameInstance | null>(null)
  const [state, setState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [nextPiece, setNextPiece] = useState<string | null>(null)
  const [hasSavedState, setHasSavedState] = useState(false)
  const [savedScore, setSavedScore] = useState(0)

  // 初始化
  useEffect(() => {
    const entry = gameRegistry.find((e) => e.meta.id === gameId)
    const container = containerRef.current
    if (!entry || !canvasRef.current || !container) return

    const instance = entry.createInstance()
    instanceRef.current = instance

    const syncNextPiece = () => {
      setNextPiece(instance.getNextPieceType?.() ?? null)
    }

    // 注册回调
    instance.onScoreChange = (s) => { setScore(s); syncNextPiece() }
    instance.onGameOver = (finalScore) => {
      setState('over')
      // 更新最高分
      const scoresJson = localStorage.getItem(STORAGE_PREFIX + 'scores')
      const scores = scoresJson ? JSON.parse(scoresJson) : {}
      if (!scores[gameId] || finalScore > scores[gameId]) {
        scores[gameId] = finalScore
        localStorage.setItem(STORAGE_PREFIX + 'scores', JSON.stringify(scores))
      }
      // 清除存档
      localStorage.removeItem(STORAGE_PREFIX + gameId + '_state')
    }
    instance.onStateChange = (s) => { setState(s); syncNextPiece() }

    // 计算 GameConfig — 使用容器的实际可用尺寸
    const config = {
      width: container.clientWidth,
      height: container.clientHeight,
      devicePixelRatio: window.devicePixelRatio,
      soundEnabled: getSoundEnabled(),
    }

    instance.init(canvasRef.current, config)

    // 检查存档
    const savedData = localStorage.getItem(STORAGE_PREFIX + gameId + '_state')
    if (savedData) {
      setHasSavedState(true)
      try {
        const parsed = JSON.parse(savedData)
        setSavedScore(parsed.score ?? 0)
      } catch {
        setSavedScore(0)
      }
    }

    // visibilitychange 监听
    const onVisibilityChange = () => {
      if (document.hidden && instance.getState() === 'playing') {
        instance.pause()
        saveGameState(instance, gameId)
      }
    }

    const onPageHide = () => {
      if (instance.getState() === 'playing' || instance.getState() === 'paused') {
        saveGameState(instance, gameId)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      instance.destroy()
      instanceRef.current = null
    }
  }, [gameId, containerRef])

  const start = useCallback(() => {
    instanceRef.current?.start()
    setNextPiece(instanceRef.current?.getNextPieceType?.() ?? null)
  }, [])

  const pause = useCallback(() => {
    const instance = instanceRef.current
    if (instance && instance.getState() === 'playing') {
      instance.pause()
      saveGameState(instance, gameId)
    }
  }, [gameId])

  const resume = useCallback(() => {
    instanceRef.current?.resume()
  }, [])

  const restart = useCallback(() => {
    localStorage.removeItem(STORAGE_PREFIX + gameId + '_state')
    setHasSavedState(false)
    setScore(0)
    instanceRef.current?.start()
  }, [gameId])

  const handleAction = useCallback((action: GameAction) => {
    instanceRef.current?.onInput(action)
  }, [])

  const loadSaved = useCallback(() => {
    const instance = instanceRef.current
    if (!instance) return
    const savedData = localStorage.getItem(STORAGE_PREFIX + gameId + '_state')
    if (savedData) {
      instance.loadState(savedData)
      setHasSavedState(false)
      const parsed = JSON.parse(savedData)
      setScore(parsed.score ?? 0)
      setNextPiece(instance.getNextPieceType?.() ?? null)
    }
  }, [gameId])

  const clearSave = useCallback(() => {
    localStorage.removeItem(STORAGE_PREFIX + gameId + '_state')
    setHasSavedState(false)
  }, [gameId])

  return {
    canvasRef,
    state,
    score,
    nextPiece,
    hasSavedState,
    savedScore,
    start,
    pause,
    resume,
    restart,
    handleAction,
    loadSaved,
    clearSave,
  }
}

function saveGameState(instance: GameInstance, gameId: string): void {
  try {
    const data = instance.saveState()
    localStorage.setItem(STORAGE_PREFIX + gameId + '_state', data)
  } catch {
    // 序列化失败时静默处理
  }
}

function getSoundEnabled(): boolean {
  try {
    const settings = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'settings') || '{}')
    return settings.soundEnabled ?? true
  } catch {
    return true
  }
}
