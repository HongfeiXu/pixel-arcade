import { useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'pixelarcade_'

/**
 * 背景音乐 hook
 * playing 为 true 时播放，false 时暂停
 */
export function useBgm(playing: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const wantPlayRef = useRef(false)

  // 创建 Audio 元素（仅一次）
  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/bgm-pixel-balloons.ogg`)
    audio.loop = true
    audio.volume = 0.3
    audioRef.current = audio

    // iOS 需要用户手势才能播放，监听首次触摸来恢复被阻止的播放
    const resumeOnGesture = () => {
      if (wantPlayRef.current && audio.paused) {
        audio.play().catch(() => {})
      }
    }
    document.addEventListener('touchstart', resumeOnGesture, { once: true })

    return () => {
      document.removeEventListener('touchstart', resumeOnGesture)
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [])

  // 响应 playing 状态变化
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    wantPlayRef.current = playing

    if (playing && getSoundEnabled()) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [playing])
}

function getSoundEnabled(): boolean {
  try {
    const settings = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'settings') || '{}')
    return settings.soundEnabled ?? true
  } catch {
    return true
  }
}
