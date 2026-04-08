import { useMemo } from 'react'
import { useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { useArchitectureScroll } from './scroll-provider'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScrollSegmentResult = {
  /** 0–1 progress within this segment's scroll range */
  progress: MotionValue<number>
  /** Plain number version of progress (for non-motion consumers) */
  progressValue: number
  /** Whether the global scroll is currently within this segment's range */
  active: boolean
  /** The segment's start position in global scroll (0–1) */
  start: number
  /** The segment's end position in global scroll (0–1) */
  end: number
  /** Raw global scroll progress MotionValue */
  globalProgress: MotionValue<number>
  /** Raw global scroll progress as plain number */
  globalProgressValue: number
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribe to a named scroll segment's local 0–1 progress.
 *
 * ```tsx
 * function HeroSection() {
 *   const { progress, active } = useScrollSegment('hero')
 *   // progress is a MotionValue<number> from 0 to 1
 *   // active is true when the user is scrolled into this segment
 * }
 * ```
 */
export function useScrollSegment(segmentName: string): ScrollSegmentResult {
  const { progress: globalProgress, progressValue: globalProgressValue, getSegmentRange } =
    useArchitectureScroll()

  const range = getSegmentRange(segmentName)
  const start = range?.start ?? 0
  const end = range?.end ?? 1

  // Map global 0–1 progress → segment-local 0–1 progress
  const localProgress = useTransform(globalProgress, [start, end], [0, 1], {
    clamp: true,
  })

  // Compute plain number values
  const duration = end - start
  const localProgressValue =
    duration > 0
      ? Math.max(0, Math.min(1, (globalProgressValue - start) / duration))
      : globalProgressValue >= end
        ? 1
        : 0

  const active = globalProgressValue >= start && globalProgressValue <= end

  return useMemo(
    () => ({
      progress: localProgress,
      progressValue: localProgressValue,
      active,
      start,
      end,
      globalProgress,
      globalProgressValue,
    }),
    [localProgress, localProgressValue, active, start, end, globalProgress, globalProgressValue],
  )
}
