import { useEffect, useRef, useState } from 'react'
import { palette } from '@pocketdev/shared/theme'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { getRepoHistoryPatternPreset } from './repo-history-pattern'

const PAPER = '#f7f1e3'
const SUN = palette.bauhaus.yellow
const SUBTEXT_PREFIX = 'giving you the power to traverse your repo\'s timeline as it'

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
  const textZoneHeight = isDesktopLayout ? '42vh' : '42vh'
  const headerReveal = easeOut(segmentProgress(progress, 0.38, 0.72))
  const headerOpacity = reduceMotion ? 1 : headerReveal
  const headerTranslateY = reduceMotion ? 0 : mix(40, 0, headerReveal)
  const accentScaleX = reduceMotion ? 1 : headerReveal
  const subtextReveal = reduceMotion ? 1 : easeOut(segmentProgress(progress, 0.48, 0.82))
  const subtextTyped = reduceMotion ? SUBTEXT_PREFIX : revealByProgress(SUBTEXT_PREFIX, subtextReveal)
  const cursorTravel = reduceMotion ? 1 : easeOut(segmentProgress(progress, 0.52, 0.82))
  const growsReveal = reduceMotion ? 1 : easeOut(segmentProgress(progress, 0.74, 0.92))
  const growsBadgeSize = mix(isDesktopLayout ? 12 : 10, isDesktopLayout ? 68 : 58, growsReveal)
  const growsTextOpacity = reduceMotion ? 1 : growsReveal
  const cursorVisible = subtextTyped.length < SUBTEXT_PREFIX.length || growsReveal > 0
  const subtextOpacity = reduceMotion ? 1 : Math.max(0.9, subtextReveal)

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
            <div
              className="w-full max-w-5xl"
            >
              <div className={isDesktopLayout ? 'max-w-6xl' : 'max-w-3xl'}>
                <div
                  style={{
                    opacity: headerOpacity,
                    transform: `translateY(${headerTranslateY}px)`,
                  }}
                >
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
                    className="block h-px w-10 origin-left"
                    style={{
                      backgroundColor: palette.bauhaus.black,
                      transform: `scaleX(${accentScaleX})`,
                    }}
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
                      className="mt-3 h-[3px] w-32 origin-left"
                      style={{
                        backgroundColor: SUN,
                        transform: `scaleX(${accentScaleX})`,
                      }}
                    />
                  </div>
                </div>

                <div
                  className="mt-5"
                  style={{
                    opacity: subtextOpacity,
                  }}
                >
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
                    <span>{subtextTyped}</span>
                    {(cursorVisible || growsReveal > 0) && (
                      <span className="inline-flex items-center whitespace-nowrap align-middle">
                        <span
                          className="mx-2 inline-flex items-center justify-center rounded-full"
                          style={{
                            width: `${growsBadgeSize}px`,
                            height: `${growsBadgeSize}px`,
                            backgroundColor: palette.bauhaus.blue,
                            color: PAPER,
                            fontFamily: 'var(--font-sans), sans-serif',
                            fontSize: isDesktopLayout ? '0.95rem' : '0.82rem',
                            fontWeight: 600,
                            letterSpacing: growsReveal > 0.75 ? '0.01em' : '0em',
                            transform: `translateY(${mix(0, -2, cursorTravel)}px)`,
                          }}
                        >
                          <span style={{ opacity: growsTextOpacity }}>grows</span>
                        </span>
                      </span>
                    )}
                  </p>
                </div>
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

function revealByProgress(text: string, progress: number) {
  const count = Math.round(Math.max(0, Math.min(1, progress)) * text.length)
  return text.slice(0, count)
}
