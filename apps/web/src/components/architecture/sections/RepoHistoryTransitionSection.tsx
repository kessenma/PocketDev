import { useEffect, useMemo, useRef, useState } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { architectureTokens, blendHexColors } from '../shared/theme'

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
  const paperReveal = easeOut(segmentProgress(progress, 0.08, 0.84))
  const dotReveal = easeOut(segmentProgress(progress, 0.18, 0.78))
  const sunReveal = easeOut(segmentProgress(progress, 0.26, 0.86))
  const sectionBg = blendHexColors(architectureTokens.colors.blue, PAPER, paperReveal)
  const dotColor = architectureTokens.colors.blue
  const cols = isDesktopLayout ? 17 : 11
  const rows = isDesktopLayout ? 13 : 15
  const dotGap = vpSize.w / (cols + 2.8)
  const dotRadius = dotGap * (isDesktopLayout ? 0.26 : 0.23)
  const dotGridWidth = dotGap * (cols - 1)
  const dotOriginX = (vpSize.w - dotGridWidth) / 2
  const dotOriginY = vpSize.h * (isDesktopLayout ? 0.12 : 0.16)
  const dotFieldOffsetY = mix(vpSize.h * 0.08, -vpSize.h * 0.04, dotReveal)
  const sunRadius = Math.min(vpSize.w, vpSize.h) * (isDesktopLayout ? 0.34 : 0.38)
  const sunCx = vpSize.w * (isDesktopLayout ? 0.74 : 0.64)
  const sunCy = mix(-sunRadius * 0.42, vpSize.h * (isDesktopLayout ? 0.27 : 0.22), sunReveal)
  const dots = useMemo(() => {
    return Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      return {
        key: `${row}-${col}`,
        x: dotOriginX + col * dotGap + (row % 2 === 0 ? 0 : dotGap * 0.5),
        y: dotOriginY + row * dotGap + dotFieldOffsetY,
        opacity: (0.24 + (1 - row / rows) * 0.54) * (0.35 + dotReveal * 0.65),
      }
    })
  }, [cols, dotFieldOffsetY, dotGap, dotOriginX, dotOriginY, dotReveal, rows])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-clip"
      style={{
        height: reduceMotion ? '100vh' : '240vh',
        backgroundColor: architectureTokens.colors.blue,
      }}
    >
      <div className={reduceMotion ? 'relative h-screen' : 'sticky top-0 h-screen'}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
          className="block h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ backgroundColor: sectionBg }}
        >
          <defs>
            <linearGradient id="repo-history-paper-fade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={PAPER} stopOpacity={0} />
              <stop offset="34%" stopColor={PAPER} stopOpacity={0.28 + paperReveal * 0.22} />
              <stop offset="100%" stopColor={PAPER} stopOpacity={0.98} />
            </linearGradient>
            <radialGradient id="repo-history-sun-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.18 + sunReveal * 0.2} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="100%" height="100%" fill={architectureTokens.colors.blue} />
          <rect width="100%" height="100%" fill={PAPER} opacity={paperReveal} />
          <rect width="100%" height="100%" fill="url(#repo-history-paper-fade)" />

          <circle
            cx={sunCx}
            cy={sunCy}
            r={sunRadius * 1.08}
            fill="url(#repo-history-sun-glow)"
            opacity={0.45 + sunReveal * 0.3}
          />
          <circle
            cx={sunCx}
            cy={sunCy}
            r={sunRadius}
            fill={SUN}
            opacity={0.18 + sunReveal * 0.82}
          />

          <g opacity={0.12 + dotReveal * 0.88}>
            {dots.map((dot) => (
              <circle
                key={dot.key}
                cx={dot.x}
                cy={dot.y}
                r={dotRadius}
                fill={dotColor}
                opacity={dot.opacity}
              />
            ))}
          </g>

          <rect
            x="0"
            y="0"
            width="100%"
            height={vpSize.h * 0.16}
            fill={`url(#repo-history-paper-fade)`}
            opacity={0.22 + paperReveal * 0.3}
            transform={`scale(1,-1) translate(0,-${vpSize.h * 0.16})`}
          />
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
