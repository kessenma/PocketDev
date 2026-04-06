import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { ExplainerBackdrop } from './ExplainerStage'
import { EXPLAINER_TIMINGS } from './constants'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mapProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

type RepoShapeProps = {
  kind: 'triangle' | 'square'
  x: number
  startY: number
  settledY: number
  size: number
  color: string
  fallProgress: number
  morphProgress: number
}

// Seeded pseudo-random so jitter is stable across renders
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

type DotDef = {
  row: number
  col: number
  count: number
  totalRows: number
  // 0 = lands first (bottom), 1 = lands last (top)
  stagger: number
  jitter: number
}

function buildTriangleDots(rows: number): DotDef[] {
  const dots: DotDef[] = []
  for (let r = 0; r < rows; r++) {
    const count = r + 1
    for (let c = 0; c < count; c++) {
      // Bottom rows land first (inverted row normalized), plus per-dot jitter
      const rowNorm = 1 - r / (rows - 1) // 1 for top, 0 for bottom
      const jitter = seededRandom(r * 13 + c * 7) * 0.12
      dots.push({ row: r, col: c, count, totalRows: rows, stagger: rowNorm * 0.7 + jitter, jitter })
    }
  }
  return dots
}

function buildSquareDots(cols: number, rows: number): DotDef[] {
  const dots: DotDef[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rowNorm = 1 - r / (rows - 1)
      const jitter = seededRandom(r * 17 + c * 11) * 0.12
      dots.push({ row: r, col: c, count: cols, totalRows: rows, stagger: rowNorm * 0.7 + jitter, jitter })
    }
  }
  return dots
}

const TRIANGLE_DOTS = buildTriangleDots(7)
const SQUARE_DOTS = buildSquareDots(6, 6)

function RepoShape({
  kind,
  x,
  startY,
  settledY,
  size,
  color,
  fallProgress,
  morphProgress,
}: RepoShapeProps) {
  const settledCenterX = x + size / 2
  const settledCenterY = settledY + size / 2
  const fallDistance = settledY - startY

  // Dots grow in radius and compress spacing as morph progresses
  const baseDotRadius = size / 18
  const dotRadius = mix(baseDotRadius, baseDotRadius * 1.8, morphProgress)
  const dotOpacity = 1 - clamp(morphProgress / 0.7, 0, 1)
  const solidOpacity = clamp((morphProgress - 0.45) / 0.45, 0, 1)
  const solidScale = mix(0.88, 1, morphProgress)
  const spacingCompress = mix(1, 0.6, morphProgress)

  // For the solid shape, use overall fall progress
  const solidY = mix(startY, settledY, fallProgress)
  const solidCenterX = x + size / 2
  const solidCenterY = solidY + size / 2

  const dots = kind === 'triangle' ? TRIANGLE_DOTS : SQUARE_DOTS

  return (
    <>
      <g opacity={dotOpacity}>
        {dots.map(({ row, col, count, totalRows, stagger, jitter }) => {
          // Each dot's fall is staggered: bottom rows (stagger~0) start first,
          // top rows (stagger~0.7) start later. Dots only appear once their fall begins.
          const fallStart = stagger * 0.5
          const dotFall = clamp((fallProgress - fallStart) / (1 - fallStart), 0, 1)
          // Ease-out for gravity feel
          const easedFall = dotFall < 1 ? 1 - Math.pow(1 - dotFall, 2.2) : 1
          // Dot is invisible until its fall begins
          const dotVisible = fallProgress > fallStart ? 1 : 0

          const baseSpacing = kind === 'triangle' ? size / 6 : size / 5.4
          const spacing = baseSpacing * spacingCompress

          let targetCx: number
          let targetCy: number
          if (kind === 'triangle') {
            const rowOffsetX = -((count - 1) * spacing) / 2
            targetCx = settledCenterX + rowOffsetX + col * spacing
            targetCy = settledY + size * 0.08 + row * spacing
          } else {
            targetCx = settledCenterX + (col - (count - 1) / 2) * spacing
            targetCy = settledCenterY + (row - (totalRows - 1) / 2) * spacing
          }

          // Start position: above the target, with slight horizontal jitter
          const aboveOffset = Math.abs(fallDistance)
          const startCx = targetCx + (jitter - 0.06) * size * 1.2
          const startCy = targetCy - aboveOffset

          const cx = mix(startCx, targetCx, easedFall)
          const cy = mix(startCy, targetCy, easedFall)

          if (!dotVisible) return null

          return (
            <circle
              key={`${kind}-${row}-${col}`}
              cx={cx}
              cy={cy}
              r={dotRadius}
              fill={color}
            />
          )
        })}
      </g>

      {kind === 'triangle' ? (
        <motion.path
          d={`M ${solidCenterX} ${solidY} L ${x + size} ${solidY + size} L ${x} ${solidY + size} Z`}
          fill={color}
          animate={{
            opacity: solidOpacity,
            scale: morphProgress > 0.96 ? [1, 1.04, 1] : solidScale,
          }}
          transition={
            morphProgress > 0.96
              ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.28, ease: 'easeOut' }
          }
          style={{ transformOrigin: `${solidCenterX}px ${solidCenterY}px` }}
        />
      ) : (
        <motion.rect
          x={x}
          y={solidY}
          width={size}
          height={size}
          rx="8"
          fill={color}
          animate={{
            opacity: solidOpacity,
            scale: morphProgress > 0.96 ? [1, 1.04, 1] : solidScale,
          }}
          transition={
            morphProgress > 0.96
              ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.28, ease: 'easeOut' }
          }
          style={{ transformOrigin: `${solidCenterX}px ${solidCenterY}px` }}
        />
      )}
    </>
  )
}

export function RepoCloneStage({
  active,
  progress,
  timelineProgress,
}: {
  active: boolean
  progress?: number
  timelineProgress?: number
}) {
  const reduceMotion = useReducedMotion()
  const scrollProgress = reduceMotion ? 1 : (timelineProgress ?? progress ?? 0)
  const leftFall = mapProgress(scrollProgress, 0.04, 0.32)
  const rightFall = mapProgress(scrollProgress, 0.12, 0.42)
  const connectProgress = mapProgress(scrollProgress, 0.3, 0.58)
  const morphProgress = mapProgress(scrollProgress, 0.42, 0.76)
  const animate = active && !reduceMotion && morphProgress > 0.96

  return (
    <>
      <ExplainerBackdrop hideFrame />

      <motion.circle
        cx="160"
        cy="184"
        r="84"
        fill={palette.bauhaus.yellow}
        animate={{ opacity: morphProgress * 0.08 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />
      <motion.circle
        cx="238"
        cy="124"
        r="52"
        fill={palette.bauhaus.yellow}
        animate={{ opacity: morphProgress * 0.06 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />
      <motion.circle
        cx="82"
        cy="136"
        r="44"
        fill={palette.bauhaus.red}
        animate={{ opacity: morphProgress * 0.04 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />
      <motion.circle
        cx="160"
        cy="184"
        r="42"
        fill={palette.bauhaus.blue}
        animate={
          animate
            ? { scale: [1, 1.04, 1], opacity: [0.95, 1, 0.95] }
            : { scale: 1, opacity: 0.96 }
        }
        transition={
          animate
            ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
        style={{ transformOrigin: '160px 184px' }}
      />

      <motion.path
        d="M 160 148 C 180 112, 208 82, 244 42"
        fill="none"
        stroke={palette.bauhaus.yellow}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        animate={{ opacity: connectProgress, pathLength: connectProgress }}
        transition={{ duration: 0.18, ease: 'linear' }}
      />
      <motion.path
        d="M 160 148 C 138 120, 108 92, 72 54"
        fill="none"
        stroke={palette.bauhaus.red}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        animate={{ opacity: connectProgress, pathLength: connectProgress }}
        transition={{ duration: 0.18, ease: 'linear' }}
      />

      <RepoShape
        kind="triangle"
        x={208}
        startY={-228}
        settledY={8}
        size={92}
        color={palette.bauhaus.yellow}
        fallProgress={leftFall}
        morphProgress={morphProgress}
      />
      <RepoShape
        kind="square"
        x={28}
        startY={-236}
        settledY={34}
        size={86}
        color={palette.bauhaus.red}
        fallProgress={rightFall}
        morphProgress={morphProgress}
      />

      {[0, 1, 2].map((particle) => {
        const px = 148 + particle * 10
        const py = 178 + (particle % 2) * 8
        return (
          <motion.circle
            key={`repo-glow-${particle}`}
            cx={px}
            cy={py}
            r={particle === 1 ? 2 : 1.5}
            fill={particle === 1 ? palette.bauhaus.yellow : 'rgba(255,255,255,0.7)'}
            animate={
              animate
                ? {
                    cx: [px, px + 6, px - 4, px],
                    cy: [py, py - 5, py + 4, py],
                    opacity: [0.18, 0.72, 0.34, 0.18],
                  }
                : { opacity: morphProgress * 0.35 }
            }
            transition={
              animate
                ? {
                    duration: EXPLAINER_TIMINGS.long + particle * 0.18,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
                : undefined
            }
          />
        )
      })}
    </>
  )
}
