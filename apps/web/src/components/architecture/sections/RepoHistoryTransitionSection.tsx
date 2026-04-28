import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { palette } from '@pocketdev/shared/theme'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { getRepoHistoryPatternPreset } from './repo-history-pattern'

const PAPER = palette.bauhaus.cream
const SUN = palette.bauhaus.yellow
const SUBTEXT_PREFIX = 'giving you the power to traverse your repo\'s timeline as it'

export function RepoHistoryTransitionSection({
  onTransitionProgress,
  onGrowsBadgePosition,
}: {
  onTransitionProgress?: (progress: number) => void
  onGrowsBadgePosition?: (x: number, y: number) => void
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const badgeRef = useRef<HTMLSpanElement | null>(null)
  const onGrowsBadgePositionRef = useRef(onGrowsBadgePosition)
  onGrowsBadgePositionRef.current = onGrowsBadgePosition
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

  // ['start end', 'end start'] gives ~200vh of animation range from a 100vh section —
  // progress 0 when section top hits viewport bottom, 1 when section bottom hits viewport top.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  useLayoutEffect(() => {
    const report = () => {
      const el = badgeRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      onGrowsBadgePositionRef.current?.(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }
    report()
    window.addEventListener('resize', report)
    return () => window.removeEventListener('resize', report)
  }, [])

  useEffect(() => {
    if (!reduceMotion) return
    setProgress(1)
    onTransitionProgress?.(1)
  }, [onTransitionProgress, reduceMotion])

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (reduceMotion) return
    setProgress(latest)
    onTransitionProgress?.(latest)
    const el = badgeRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      onGrowsBadgePositionRef.current?.(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }
  })

  const isDesktopLayout = vpSize.w >= 1024

  // Text enters viewport at ~progress 0.46 — time animations to start just before that.
  // Sun slides in as section enters, fully settled at 0.80.
  const sunReveal = easeOut(segmentProgress(progress, 0.44, 0.80))
  const preset = getRepoHistoryPatternPreset(vpSize.w)
  const patternAsset = `/assets/architecture/repo-history-pattern-${preset.name}.svg`
  const maskAsset = `/assets/architecture/repo-history-mask-${preset.name}.svg`
  const sunRadius = Math.min(vpSize.w, vpSize.h) * (isDesktopLayout ? 0.36 : 0.4)
  const sunCx = mix(vpSize.w + sunRadius * 0.55, vpSize.w * (isDesktopLayout ? 0.75 : 0.72), sunReveal)
  const sunCy = mix(-sunRadius * 1.35, vpSize.h * (isDesktopLayout ? 0.2 : 0.18), sunReveal)
  const textZoneHeight = isDesktopLayout ? '42vh' : '42vh'

  // Blue circle grows while text is in view, exits once text nears the top of viewport.
  const growsReveal = reduceMotion ? 1 : easeOut(segmentProgress(progress, 0.44, 0.78))
  const growsBadgeSize = mix(isDesktopLayout ? 12 : 10, isDesktopLayout ? 68 : 58, growsReveal)
  const cursorTravel = reduceMotion ? 1 : easeOut(segmentProgress(progress, 0.48, 0.78))

  return (
    <section
      ref={sectionRef}
      className="relative overflow-clip"
      style={{
        height: '100vh',
        backgroundColor: PAPER,
      }}
    >
      {/* Normal flow — no sticky. Section scrolls like any other page content. */}
      <div className="relative h-full w-full">
        <div className="absolute inset-x-0 top-0" style={{ bottom: textZoneHeight }}>
          <img
            src={patternAsset}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              maskImage: `url(${maskAsset})`,
              maskPosition: 'center top',
              maskRepeat: 'no-repeat',
              maskSize: 'cover',
              WebkitMaskImage: `url(${maskAsset})`,
              WebkitMaskPosition: 'center top',
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
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[8vh] z-10 flex justify-center px-6">
          <div className="w-full max-w-5xl">
            <div className={isDesktopLayout ? 'max-w-6xl' : 'max-w-3xl'}>
              <div>
                <div
                  className="inline-flex items-center gap-3 border px-4 py-2"
                  style={{
                    borderColor: palette.bauhaus.black,
                    color: palette.bauhaus.black,
                    fontFamily: 'var(--font-mono), monospace',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    fontSize: isDesktopLayout ? '0.78rem' : '0.68rem',
                  }}
                >
                  <span>Repo History</span>
                  <span
                    className="block h-px w-10"
                    style={{ backgroundColor: palette.bauhaus.black }}
                  />
                </div>

                <div className="mt-6">
                  <p
                    className={
                      isDesktopLayout
                        ? 'max-w-none text-pretty text-3xl leading-[0.9] sm:text-4xl lg:text-[4.8rem]'
                        : 'max-w-[11ch] text-pretty text-3xl leading-[0.96] sm:text-4xl'
                    }
                    style={{
                      color: palette.bauhaus.black,
                      fontFamily: 'var(--font-display), var(--font-heading), sans-serif',
                      fontWeight: 700,
                      letterSpacing: '-0.04em',
                    }}
                  >
                    tasks and <span style={{ fontStyle: 'italic' }}>git history</span> are tracked for each repo
                  </p>

                  <div
                    className="mt-3 h-[3px] w-32"
                    style={{ backgroundColor: SUN }}
                  />
                </div>
              </div>

              <div className="mt-5">
                <p
                  className={
                    isDesktopLayout
                      ? 'max-w-4xl text-balance text-base leading-8 sm:text-lg lg:text-xl'
                      : 'max-w-xl text-balance text-base leading-8 sm:text-lg'
                  }
                  style={{
                    color: 'rgba(26,26,26,0.82)',
                    fontFamily: 'var(--font-sans), sans-serif',
                    letterSpacing: '0.01em',
                  }}
                >
                  <span>{SUBTEXT_PREFIX}</span>
                  <span className="inline-flex items-center whitespace-nowrap align-middle">
                    <span
                      ref={badgeRef}
                      className="mx-2 inline-flex items-center justify-center rounded-full"
                      style={{
                        width: `${growsBadgeSize}px`,
                        height: `${growsBadgeSize}px`,
                        transform: `translateY(${mix(0, -2, cursorTravel)}px)`,
                      }}
                    />
                  </span>
                </p>
              </div>
            </div>
          </div>
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
