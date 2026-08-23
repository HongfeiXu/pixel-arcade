import { useEffect, useState } from 'react'

export const TV_MEDIA_QUERY = '(min-width: 960px) and (orientation: landscape) and (min-aspect-ratio: 8/5)'

export function getTvModeOverride(search: string): boolean | null {
  const value = new URLSearchParams(search).get('tv')
  if (value === '1') return true
  if (value === '0') return false
  return null
}

function getInitialTvMode(): boolean {
  const override = getTvModeOverride(window.location.search)
  return override ?? window.matchMedia(TV_MEDIA_QUERY).matches
}

export function useTvMode(): boolean {
  const [isTvMode, setIsTvMode] = useState(getInitialTvMode)

  useEffect(() => {
    const override = getTvModeOverride(window.location.search)
    if (override != null) {
      setIsTvMode(override)
      return
    }

    const media = window.matchMedia(TV_MEDIA_QUERY)
    const sync = () => setIsTvMode(media.matches)
    const compatibleMedia = media as {
      addEventListener?: (type: 'change', listener: () => void) => void
      removeEventListener?: (type: 'change', listener: () => void) => void
      addListener: (listener: () => void) => void
      removeListener: (listener: () => void) => void
    }
    sync()
    if (compatibleMedia.addEventListener && compatibleMedia.removeEventListener) {
      compatibleMedia.addEventListener('change', sync)
      return () => compatibleMedia.removeEventListener?.('change', sync)
    }
    compatibleMedia.addListener(sync)
    return () => compatibleMedia.removeListener(sync)
  }, [])

  return isTvMode
}
