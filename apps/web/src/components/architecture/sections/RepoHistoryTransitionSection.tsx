import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { getRepoHistoryPatternPreset } from './repo-history-pattern'

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
  const preset = getRepoHistoryPatternPreset(vpSize.w)
  const patternAsset = `/assets/architecture/repo-history-pattern-${preset.name}.svg`
  const maskAsset = `/assets/architecture/repo-history-mask-${preset.name}.svg`
  const sunRadius = Math.min(vpSize.w, vpSize.h) * (isDesktopLayout ? 0.36 : 0.4)
  const sunCx = mix(vpSize.w + sunRadius * 0.55, vpSize.w * (isDesktopLayout ? 0.75 : 0.72), sunReveal)
  const sunCy = mix(-sunRadius * 1.35, vpSize.h * (isDesktopLayout ? 0.2 : 0.18), sunReveal)

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
        <div className="relative h-full w-full" style={{ backgroundColor: PAPER }}>
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundColor: SUN,
              maskImage: `url(${maskAsset})`,
              maskPosition: 'center',
              maskRepeat: 'no-repeat',
              maskSize: 'cover',
              WebkitMaskImage: `url(${maskAsset})`,
              WebkitMaskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskSize: 'cover',
            }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: `${sunRadius * 2}px`,
                height: `${sunRadius * 2}px`,
                left: `${sunCx - sunRadius}px`,
                top: `${sunCy - sunRadius}px`,
                backgroundColor: SUN,
              }}
            />
          </div>

          <img
            src={patternAsset}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
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
