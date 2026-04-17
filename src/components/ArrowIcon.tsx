interface ArrowIconProps {
  direction: 'up' | 'down' | 'left' | 'right'
  size?: number
}

const ROTATIONS = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
}

// 向上箭头的像素点阵 (7x7)
const PIXELS: Array<[number, number]> = [
  [3, 0],
  [2, 1], [3, 1], [4, 1],
  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
  [3, 3],
  [3, 4],
  [3, 5],
  [3, 6],
]

export default function ArrowIcon({ direction, size = 24 }: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 7 7"
      style={{ transform: `rotate(${ROTATIONS[direction]}deg)` }}
      shapeRendering="crispEdges"
    >
      {PIXELS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  )
}
