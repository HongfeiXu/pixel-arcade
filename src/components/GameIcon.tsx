import type { CSSProperties } from 'react'
import styles from './GameIcon.module.css'

type IconConfig = {
  bg: string
  glow: string
  pixels: string[]
  palette: Record<string, string>
}

const ICONS: Record<string, IconConfig> = {
  'tetris-easy': {
    bg: '#20345f',
    glow: '#7efcff',
    palette: {
      i: '#00E5FF',
      o: '#FFD600',
    },
    pixels: [
      '........',
      '........',
      '.iiii...',
      '........',
      '....oo..',
      '....oo..',
      '........',
      '........',
    ],
  },
  tetris: {
    bg: '#211f4f',
    glow: '#ffd600',
    palette: {
      z: '#FF1744',
      l: '#FF9100',
      o: '#FFD600',
    },
    pixels: [
      '........',
      '..zz....',
      '...zz...',
      '........',
      '........',
      '.l......',
      '.l...oo.',
      '.ll..oo.',
    ],
  },
  'anti-gravity': {
    bg: '#102b3f',
    glow: '#8cffd6',
    palette: {
      t: '#AA00FF',
      s: '#00E676',
      i: '#00E5FF',
    },
    pixels: [
      'ittt.ttt',
      'i.t...t.',
      'i.......',
      'i.......',
      '........',
      '........',
      '..ss....',
      '.ss.....',
    ],
  },
}

const FALLBACK_ICON = ICONS.tetris

type GameIconProps = {
  icon: string
  label: string
}

export default function GameIcon({ icon, label }: GameIconProps) {
  const config = ICONS[icon] ?? FALLBACK_ICON
  const cellSize = 8

  return (
    <svg
      className={styles.icon}
      viewBox="0 0 80 80"
      role="img"
      aria-label={`${label} 图标`}
      style={{ '--icon-glow': config.glow } as CSSProperties}
    >
      <rect className={styles.backdrop} x="2" y="2" width="76" height="76" rx="8" fill={config.bg} />
      <rect className={styles.inner} x="9" y="9" width="62" height="62" rx="3" />
      <g transform="translate(8 8)">
        {config.pixels.flatMap((row, y) =>
          [...row].map((pixel, x) => {
            const fill = config.palette[pixel]
            if (!fill) return null

            return (
              <rect
                key={`${x}-${y}`}
                className={styles.pixel}
                x={x * cellSize + 1}
                y={y * cellSize + 1}
                width="7"
                height="7"
                fill={fill}
              />
            )
          }),
        )}
      </g>
    </svg>
  )
}
