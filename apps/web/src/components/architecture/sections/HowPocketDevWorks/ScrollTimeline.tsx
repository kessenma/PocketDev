import { useEffect, useMemo, useRef, useState } from 'react'
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

export function ScrollTimeline({
  scenes,
  sectionHeight = '1000vh',
  onRailProgress,
  children: headerContent,
}: {
  scenes: SceneConfig[]
  sectionHeight?: string
  onRailProgress?: (progress: number) => void
  children?: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement | null>(null)
  const [railProgress, setRailProgress] = useState(0)
  const [isDesktopLayout, setIsDesktopLayout] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const syncLayout = () => setIsDesktopLayout(mediaQuery.matches)
    syncLayout()
    mediaQuery.addEventListener('change', syncLayout)
    return () => mediaQuery.removeEventListener('change', syncLayout)
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
    <section
      ref={sectionRef}
      className="relative px-6 pt-16 pb-0"
      style={{ height: reduceMotion ? 'auto' : sectionHeight }}
    >
      {/* Section header (passed as children) */}
      {headerContent}

      {reduceMotion ? (
        <ReducedMotionLayout
          scenes={scenes}
          ranges={ranges}
          railProgress={railProgress}
          isDesktopLayout={isDesktopLayout}
        />
      ) : (
        <div className="sticky top-0 h-screen overflow-hidden -mx-6">
          <div className="flex h-screen w-screen items-center overflow-hidden">
            <motion.div
              className="flex h-full flex-row flex-nowrap items-center"
              style={{ width: trackWidth, x: trackX, willChange: 'transform' }}
            >
              {scenes.map((scene, i) => {
                const range = ranges[i]
                const progress = sceneProgress(railProgress, range)
                const active = railProgress >= range.start && railProgress <= range.end

                const renderProps = {
                  progress,
                  active,
                  isDesktopLayout,
                  railProgress,
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

                return (
                  <div
                    key={scene.id}
                    className={`relative flex h-full w-screen shrink-0 items-center justify-center overflow-hidden ${scene.panelClassName ?? ''}`}
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
