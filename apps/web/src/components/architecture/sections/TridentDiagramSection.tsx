import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent, useScroll } from 'framer-motion'
import { TridentBuildScene } from '../animations/hero-sequence/scenes/04-trident-build'

// Stop at 0.786 — right before the laptop-zoom phase erases the diagram
const MAX_PROGRESS = 0.786

export function TridentDiagramSection({
  onProgress,
  seedX,
  seedY,
}: {
  onProgress?: (progress: number) => void
  seedX?: number
  seedY?: number
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })
  const [isDesktopLayout, setIsDesktopLayout] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktopLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setProgress(latest * MAX_PROGRESS)
    onProgress?.(latest)
  })

  return (
    <section ref={sectionRef} className="relative" style={{ height: '300vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <TridentBuildScene
          progress={progress}
          vpSize={vpSize}
          isDesktopLayout={isDesktopLayout}
          seedX={seedX}
          seedY={seedY}
        />
      </div>
    </section>
  )
}
