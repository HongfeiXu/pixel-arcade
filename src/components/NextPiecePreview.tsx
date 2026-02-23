import { PIECE_COLORS } from '../games/tetris/constants'
import { getShape } from '../games/tetris/pieces'
import type { PieceType } from '../games/tetris/types'
import styles from './NextPiecePreview.module.css'

interface NextPiecePreviewProps {
  pieceType: string | null
}

const CELL = 10 // px per mini-cell

export default function NextPiecePreview({ pieceType }: NextPiecePreviewProps) {
  if (!pieceType) return <div className={styles.container} />

  const type = pieceType as PieceType
  const shape = getShape(type, 0)
  const colors = PIECE_COLORS[type]
  if (!colors) return <div className={styles.container} />

  return (
    <div className={styles.container}>
      {shape.map((row, ri) => (
        <div key={ri} className={styles.row}>
          {row.map((filled, ci) => (
            <div
              key={ci}
              className={styles.cell}
              style={{
                width: CELL,
                height: CELL,
                background: filled ? colors.main : 'transparent',
                boxShadow: filled
                  ? `inset 2px 2px 0 ${colors.light}, inset -2px -2px 0 ${colors.dark}`
                  : 'none',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
