import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MotionValue } from 'framer-motion'
import { useMotionValueEvent, useScroll } from 'framer-motion'
import { ReactLenis, useLenis } from 'lenis/react'
import type Lenis from 'lenis'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScrollSegment = {
  /** Unique name for this segment (e.g. "hero", "howItWorks") */
  name: string
  /** Relative weight — higher = more scroll budget. Default 1. */
  weight?: number
}

export type ScrollSegmentRange = {
  /** Global scroll progress where this segment begins (0–1) */
  start: number
  /** Global scroll progress where this segment ends (0–1) */
  end: number
}

type ScrollContextValue = {
  /** Global 0–1 scroll progress for the entire page */
  progress: MotionValue<number>
  /** Current progress as a plain number (for non-motion consumers) */
  progressValue: number
  /** Look up the computed range for a named segment */
  getSegmentRange: (name: string) => ScrollSegmentRange | undefined
  /** All registered segment ranges, keyed by name */
  segmentRanges: Map<string, ScrollSegmentRange>
  /** The Lenis instance (for imperative control like scrollTo) */
  lenis: Lenis | null
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ScrollContext = createContext<ScrollContextValue | null>(null)

// ---------------------------------------------------------------------------
// Segment math
// ---------------------------------------------------------------------------

function computeSegmentRanges(
  segments: ScrollSegment[],
): Map<string, ScrollSegmentRange> {
  const totalWeight = segments.reduce(
    (sum, seg) => sum + (seg.weight ?? 1),
    0,
  )

  const ranges = new Map<string, ScrollSegmentRange>()
  let cursor = 0

  for (const seg of segments) {
    const w = (seg.weight ?? 1) / totalWeight
    ranges.set(seg.name, { start: cursor, end: cursor + w })
    cursor += w
  }

  return ranges
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type ArchitectureScrollProviderProps = {
  /**
   * Ordered list of page segments. The provider divides the total scroll
   * range (0–1) among them proportionally by weight.
   */
  segments: ScrollSegment[]
  /**
   * Lenis smooth-scroll options. Sensible defaults are provided.
   * Set `smoothScroll: false` to disable Lenis lerping (keeps the
   * unified tracker but uses native scroll).
   */
  smoothScroll?: boolean
  /** Lenis lerp factor — lower = smoother/slower. Default 0.1. */
  lerp?: number
  /** Lenis duration for programmatic scrollTo. Default 1.2s. */
  duration?: number
  children: React.ReactNode
}

export function ArchitectureScrollProvider({
  segments,
  smoothScroll = true,
  lerp = 0.1,
  duration = 1.2,
  children,
}: ArchitectureScrollProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progressValue, setProgressValue] = useState(0)
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null)

  // Compute segment ranges from the ordered config
  const segmentRanges = useMemo(
    () => computeSegmentRanges(segments),
    [segments],
  )

  // Single page-level scroll tracker
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', setProgressValue)

  // Capture the Lenis instance
  useLenis((lenis: Lenis) => {
    if (!lenisInstance) setLenisInstance(lenis)
  })

  const getSegmentRange = useCallback(
    (name: string) => segmentRanges.get(name),
    [segmentRanges],
  )

  const ctx = useMemo<ScrollContextValue>(
    () => ({
      progress: scrollYProgress,
      progressValue,
      getSegmentRange,
      segmentRanges,
      lenis: lenisInstance,
    }),
    [scrollYProgress, progressValue, getSegmentRange, segmentRanges, lenisInstance],
  )

  const content = (
    <ScrollContext.Provider value={ctx}>
      <div ref={containerRef}>{children}</div>
    </ScrollContext.Provider>
  )

  if (!smoothScroll) return content

  return (
    <ReactLenis
      root
      options={{
        lerp,
        duration,
        smoothWheel: true,
        touchMultiplier: 1.5,
      }}
    >
      {content}
    </ReactLenis>
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Access the full scroll context. Throws if used outside the provider. */
export function useArchitectureScroll(): ScrollContextValue {
  const ctx = useContext(ScrollContext)
  if (!ctx) {
    throw new Error(
      'useArchitectureScroll must be used within <ArchitectureScrollProvider>',
    )
  }
  return ctx
}
