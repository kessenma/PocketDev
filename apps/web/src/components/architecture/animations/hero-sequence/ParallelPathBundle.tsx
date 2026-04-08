import { motion } from 'framer-motion'

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

/**
 * Renders a bundle of parallel strokes along a single SVG path,
 * staggered draw-on, inspired by Bauhaus parallel-line motifs.
 *
 * Uses strokeWidth offsets to create parallel lines — each line in the
 * bundle is the same path but with increasing strokeWidth and alternating
 * clip to create a visual spread effect. For true parallel offset we
 * render N copies with perpendicular translation via a filter offset.
 */
export function ParallelPathBundle({
  d,
  lineCount = 7,
  spacing = 3.5,
  strokeColor = '#1a1a1a',
  strokeWidth = 1.5,
  drawProgress = 0,
  staggerPerLine = 0.04,
  opacity = 1,
  activeAnimation,
  reverseDrawProgress,
}: {
  /** SVG path data string */
  d: string
  /** Number of parallel lines (odd numbers center nicely) */
  lineCount?: number
  /** Pixel spacing between each line */
  spacing?: number
  /** Stroke color */
  strokeColor?: string
  /** Width of each individual line */
  strokeWidth?: number
  /** 0-1 overall draw progress */
  drawProgress?: number
  /** Progress delay between each line's draw-on */
  staggerPerLine?: number
  /** Overall opacity */
  opacity?: number
  /** Optional framer-motion animate props for post-draw animation */
  activeAnimation?: {
    pulseColor?: string
    duration?: number
    delay?: number
  }
  /** 0-1 reverse draw progress (lines retract from end to start) */
  reverseDrawProgress?: number
}) {
  const halfSpread = ((lineCount - 1) * spacing) / 2

  return (
    <g opacity={opacity}>
      {Array.from({ length: lineCount }, (_, i) => {
        const offset = -halfSpread + i * spacing
        // Each line draws on slightly after the previous
        const lineProgress = clamp(
          (drawProgress - i * staggerPerLine) / (1 - (lineCount - 1) * staggerPerLine),
          0,
          1,
        )

        // Reverse draw: stagger from outer lines inward (reverse index order)
        const reverseI = lineCount - 1 - i
        const lineReverseProgress = reverseDrawProgress != null
          ? clamp(
              (reverseDrawProgress - reverseI * staggerPerLine) / (1 - (lineCount - 1) * staggerPerLine),
              0,
              1,
            )
          : 0

        // Effective visible length: drawn on minus retracted
        const visibleLength = clamp(lineProgress - lineReverseProgress, 0, 1)

        // Fade outer lines slightly for depth
        const distFromCenter = Math.abs(i - (lineCount - 1) / 2)
        const lineOpacity = 1 - distFromCenter * 0.08

        return (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={1 - visibleLength}
              opacity={lineOpacity}
              transform={`translate(0, ${offset})`}
            />
            {/* Pulse overlay per center line */}
            {activeAnimation && i === Math.floor(lineCount / 2) && lineProgress >= 1 && (
              <motion.path
                d={d}
                fill="none"
                stroke={activeAnimation.pulseColor ?? strokeColor}
                strokeWidth={strokeWidth + 1}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="0.08 1"
                initial={{ strokeDashoffset: 1, opacity: 0 }}
                animate={{
                  strokeDashoffset: 0,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: activeAnimation.duration ?? 2.2,
                  delay: activeAnimation.delay ?? 0,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                  ease: 'easeInOut',
                }}
                transform={`translate(0, ${offset})`}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}
