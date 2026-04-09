import { useEffect, useMemo, useRef, useState } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { architectureTokens } from '../shared/theme'

const PAPER = '#f7f1e3'
const SUN = '#f59e0b'

export function RepoHistoryTransitionSection({
  onTransitionProgress,
}: {
  onTransitionProgress?: (progress: number) => void
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const reduceMotion = useReducedMotion()
  const [progress, setProgress] = useState(reduceMotion ? 1 : 0)
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  useEffect(() => {
    if (!reduceMotion) return
    setProgress(1)
    onTransitionProgress?.(1)
  }, [onTransitionProgress, reduceMotion])

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (reduceMotion) return
    setProgress(latest)
    onTransitionProgress?.(latest)
  })

  const isDesktopLayout = vpSize.w >= 1024
  const sunReveal = easeOut(segmentProgress(progress, 0.18, 0.76))
  const dotColor = architectureTokens.colors.blue
  const rows = isDesktopLayout ? 11 : 12
  const baseY = vpSize.h * (isDesktopLayout ? 0.12 : 0.1)
  const sunRadius = Math.min(vpSize.w, vpSize.h) * (isDesktopLayout ? 0.36 : 0.4)
  const sunCx = mix(vpSize.w + sunRadius * 0.55, vpSize.w * (isDesktopLayout ? 0.75 : 0.72), sunReveal)
  const sunCy = mix(-sunRadius * 1.35, vpSize.h * (isDesktopLayout ? 0.2 : 0.18), sunReveal)
  const dots = useMemo(() => {
    const dotsList: Array<{ key: string; x: number; y: number; radius: number }> = []
    const maxCols = isDesktopLayout ? 15 : 10
    const minCols = isDesktopLayout ? 10 : 7
    const topRadius = vpSize.w * (isDesktopLayout ? 0.038 : 0.062)
    const bottomRadius = vpSize.w * (isDesktopLayout ? 0.028 : 0.046)
    const rowGapTop = vpSize.h * (isDesktopLayout ? 0.06 : 0.055)
    const rowGapBottom = vpSize.h * (isDesktopLayout ? 0.118 : 0.108)

    for (let row = 0; row < rows; row++) {
      const rowT = row / (rows - 1)
      const colsForRow = Math.round(mix(maxCols, minCols, rowT ** 1.05))
      const radius = mix(topRadius, bottomRadius, rowT ** 0.95)
      const usableWidth = vpSize.w + radius * 1.6
      const spacing = usableWidth / Math.max(1, colsForRow - 1)
      const rowWidth = spacing * Math.max(0, colsForRow - 1)
      const originX = (vpSize.w - rowWidth) / 2
      const y = baseY + cumulativeGap(
        row,
        rows,
        rowGapTop,
        rowGapBottom,
      )

      for (let col = 0; col < colsForRow; col++) {
        const x = originX + col * spacing

        dotsList.push({
          key: `${row}-${col}`,
          x,
          y,
          radius,
        })
      }
    }

    return dotsList
  }, [baseY, isDesktopLayout, rows, vpSize.h, vpSize.w])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-clip"
      style={{
        height: reduceMotion ? '100vh' : '220vh',
        backgroundColor: PAPER,
      }}
    >
      <div className={reduceMotion ? 'relative h-screen' : 'sticky top-0 h-screen'}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
          className="block h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ backgroundColor: PAPER }}
        >
          <rect width="100%" height="100%" fill={PAPER} />

          <circle
            cx={sunCx}
            cy={sunCy}
            r={sunRadius}
            fill={SUN}
          />

          <g>
            {dots.map((dot) => (
              <circle
                key={dot.key}
                cx={dot.x}
                cy={dot.y}
                r={dot.radius}
                fill={dotColor}
              />
            ))}
          </g>
        </svg>
      </div>
    </section>
  )
}

function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function segmentProgress(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0
  return Math.max(0, Math.min(1, (value - start) / (end - start)))
}

function easeOut(value: number) {
  return 1 - (1 - value) ** 3
}

function cumulativeGap(row: number, rows: number, topGap: number, bottomGap: number) {
  let total = 0
  for (let index = 0; index < row; index++) {
    const t = rows <= 1 ? 0 : index / (rows - 1)
    total += mix(topGap, bottomGap, t ** 1.2)
  }
  return total
}
