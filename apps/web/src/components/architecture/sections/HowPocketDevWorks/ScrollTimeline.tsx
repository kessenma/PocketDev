import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import type { SceneConfig } from './timeline-types'
import { buildTrackKeyframes, computeSceneRanges, sceneProgress } from './timeline-utils'
import { ExplainerStage } from './explainers/ExplainerStage'
import { PersistentTransitionOverlay, shouldHideLaptop, shouldHideBlueCircle, shouldHidePhone, shouldHideDoor } from './shared/PersistentTransitionOverlay'

export function ScrollTimeline({
  scenes,
  sectionHeight = '1000vh',
  onRailProgress,
  externalSectionRef,
  children: headerContent,
}: {
  scenes: SceneConfig[]
  sectionHeight?: string
  onRailProgress?: (progress: number) => void
  externalSectionRef?: React.RefObject<HTMLElement | null>
  children?: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()
  // Stable ref object for useScroll; callback ref below keeps it + externalSectionRef in sync
  const sectionRef = useRef<HTMLElement | null>(null)
  const setSectionNode = useCallback(
    (node: HTMLElement | null) => {
      sectionRef.current = node
      if (externalSectionRef) {
        ;(externalSectionRef as { current: HTMLElement | null }).current = node
      }
    },
    [externalSectionRef],
  )
  const [railProgress, setRailProgress] = useState(0)
  const [isDesktopLayout, setIsDesktopLayout] = useState(false)
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })
  const [stickyActive, setStickyActive] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const syncLayout = () => setIsDesktopLayout(mediaQuery.matches)
    syncLayout()
    mediaQuery.addEventListener('change', syncLayout)
    return () => mediaQuery.removeEventListener('change', syncLayout)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncSticky = () => {
      const section = sectionRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      setStickyActive(rect.top <= 0)
    }

    syncSticky()
    window.addEventListener('scroll', syncSticky, { passive: true })
    window.addEventListener('resize', syncSticky)
    return () => {
      window.removeEventListener('scroll', syncSticky)
      window.removeEventListener('resize', syncSticky)
    }
  }, [])

  const ranges = useMemo(() => computeSceneRanges(scenes), [scenes])
  const keyframes = useMemo(() => buildTrackKeyframes(scenes), [scenes])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setRailProgress(latest)
    onRailProgress?.(latest)
  })

  const trackX = useTransform(scrollYProgress, keyframes.input, keyframes.output)
  const trackWidth = `${scenes.length * 100}vw`

  return (
    <>
      {/* Section header lives outside the scroll-tracked section so it doesn't
          consume scroll budget — railProgress=0 now aligns with the sticky
          animation track actually entering the viewport. */}
      <div className="px-6 pt-16 pb-0">
        {headerContent}
      </div>

      <section
        ref={setSectionNode}
        className="relative"
        style={{ height: reduceMotion ? 'auto' : sectionHeight }}
      >
        {reduceMotion ? (
          <ReducedMotionLayout
            scenes={scenes}
            ranges={ranges}
            railProgress={railProgress}
            isDesktopLayout={isDesktopLayout}
          />
        ) : (
          <div
            className="sticky top-0 h-screen overflow-hidden"
            style={{ opacity: stickyActive ? 1 : 0 }}
          >
          {/* Persistent asset overlay — sits above the sliding track so shared
              elements (laptop, circle) stay visually fixed during panel slides */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <PersistentTransitionOverlay
              railProgress={railProgress}
              ranges={ranges}
              vpSize={vpSize}
              isDesktopLayout={isDesktopLayout}
            />
          </div>
          <div className="flex h-screen w-screen items-center overflow-hidden">
            <motion.div
              className="flex h-full flex-row flex-nowrap items-center"
              style={{ width: trackWidth, x: trackX, willChange: 'transform' }}
            >
              {scenes.map((scene, i) => {
                const range = ranges[i]
                const progress = sceneProgress(railProgress, range)
                const active = railProgress >= range.start && railProgress <= range.end

                // Scene 3 (PortSecurity, index 2): preroll the door starting at the same moment
                // scene 2's text begins sliding down (scene2 p=0.82), not at holdEnd.
                // This way the door is ~94% dropped before the horizontal slide even starts,
                // making the 2→3 transition feel vertical rather than diagonal.
                // Stays clamped at 1 once scene 2 ends.
                const r1 = ranges[1]
                const doorPreviewStart = r1 ? r1.start + 0.82 * (r1.end - r1.start) : 0
                const doorPreviewDuration = r1 ? r1.end - doorPreviewStart : 1
                const doorPreviewProgress =
                  i === 2 && r1 && doorPreviewDuration > 0
                    ? Math.min(1, Math.max(0, (railProgress - doorPreviewStart) / doorPreviewDuration))
                    : 0

                // PortSecurity (i=2): overlay ends exactly at r1.end when the panel is centred,
                // so scene assets can appear at full opacity immediately — no ramp needed.
                const assetsRevealP = 1

                const renderProps = {
                  progress,
                  active,
                  isDesktopLayout,
                  railProgress,
                  hideLaptop: shouldHideLaptop(i, railProgress, ranges),
                  hideBlueCircle: shouldHideBlueCircle(i, railProgress, ranges),
                  hidePhone: shouldHidePhone(i, railProgress, ranges),
                  hideDoor: shouldHideDoor(i, railProgress, ranges),
                  doorPreviewProgress,
                  assetsRevealP,
                }

                if (scene.kind === 'explainer' && scene.explainer) {
                  return (
                    <div
                      key={scene.id}
                      className={`flex h-full w-screen shrink-0 items-center justify-center px-6 ${scene.panelClassName ?? ''}`}
                    >
                      <ExplainerStage
                        {...scene.explainer}
                        activeOverride={active}
                        progressOverride={progress}
                      >
                        {() => scene.render(renderProps)}
                      </ExplainerStage>
                    </div>
                  )
                }

                // Port-security panel (i=2): hide during preroll/slide so the cream background
                // doesn't flash in from the right. The overlay owns all visible elements then.
                // Panel snaps to visible at active=true (range2.start = r1.end) when centred.
                const hideDuringTransition = i === 2 && doorPreviewProgress > 0 && !active

                return (
                  <div
                    key={scene.id}
                    className={`relative flex h-full w-screen shrink-0 items-center justify-center overflow-hidden ${scene.panelClassName ?? ''}`}
                    style={hideDuringTransition ? { opacity: 0 } : undefined}
                  >
                    {scene.render(renderProps)}
                  </div>
                )
              })}
            </motion.div>
          </div>
        </div>
      )}
    </section>
    </>
  )
}

function ReducedMotionLayout({
  scenes,
  ranges,
  railProgress,
  isDesktopLayout,
}: {
  scenes: SceneConfig[]
  ranges: ReturnType<typeof computeSceneRanges>
  railProgress: number
  isDesktopLayout: boolean
}) {
  const fullBleedStyle = {
    width: '100vw' as const,
    marginLeft: 'calc(50% - 50vw)',
    marginRight: 'calc(50% - 50vw)',
    marginBottom: '-1px',
  }

  return (
    <div className="mx-auto mt-8 flex max-w-6xl flex-col px-6">
      {scenes.map((scene, i) => {
        const range = ranges[i]
        const progress = sceneProgress(railProgress, range)
        const active = railProgress >= range.start && railProgress <= range.end

        const renderProps = {
          progress: scene.kind === 'takeover' ? 1 : progress,
          active: scene.kind === 'takeover' ? true : active,
          isDesktopLayout,
          railProgress,
        }

        if (scene.kind === 'explainer' && scene.explainer) {
          return (
            <ExplainerStage
              key={scene.id}
              {...scene.explainer}
              cardClassName="mb-4"
            >
              {({ active: hookActive, progress: hookProgress }) =>
                scene.render({
                  ...renderProps,
                  active: hookActive,
                  progress: hookProgress,
                })
              }
            </ExplainerStage>
          )
        }

        if (scene.reducedMotionFullBleed) {
          return (
            <div
              key={scene.id}
              className="mt-0 min-h-screen overflow-hidden"
              style={fullBleedStyle}
            >
              {scene.render(renderProps)}
            </div>
          )
        }

        return (
          <div key={scene.id} className="mt-4">
            {scene.render(renderProps)}
          </div>
        )
      })}
    </div>
  )
}
