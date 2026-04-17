import { useEffect, useRef, useCallback } from 'react'
import type { SfxEvent } from '../games/types'

const STORAGE_PREFIX = 'pixelarcade_'

const SFX_FILES: Record<SfxEvent, string> = {
  move: 'move.wav',
  rotate: 'rotate.wav',
  softDrop: 'soft-drop.wav',
  lineClear: 'line-clear.wav',
  tetris: 'tetris.wav',
  gameOver: 'game-over.wav',
}

/**
 * 短音效播放 hook
 * 用 Web Audio API 预加载 AudioBuffer，支持重叠播放
 * iOS 首次手势后 resume()；soundEnabled 开关动态读取
 */
export function useSfx(): (event: SfxEvent) => void {
  const ctxRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<Partial<Record<SfxEvent, AudioBuffer>>>({})
  const gainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.gain.value = 0.6
    gain.connect(ctx.destination)
    ctxRef.current = ctx
    gainRef.current = gain

    const base = import.meta.env.BASE_URL
    for (const [key, file] of Object.entries(SFX_FILES)) {
      fetch(`${base}audio/sfx/${file}`)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf))
        .then((audio) => {
          buffersRef.current[key as SfxEvent] = audio
        })
        .catch(() => {})
    }

    const unlock = () => {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    }
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('click', unlock, { once: true })

    return () => {
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('click', unlock)
      ctx.close().catch(() => {})
      ctxRef.current = null
      gainRef.current = null
      buffersRef.current = {}
    }
  }, [])

  return useCallback((event: SfxEvent) => {
    if (!getSoundEnabled()) return
    const ctx = ctxRef.current
    const gain = gainRef.current
    const buf = buffersRef.current[event]
    if (!ctx || !gain || !buf) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(gain)
    src.start(0)
  }, [])
}

function getSoundEnabled(): boolean {
  try {
    const settings = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'settings') || '{}')
    return settings.soundEnabled ?? true
  } catch {
    return true
  }
}
