import type { SceneConfig, SceneRange } from './timeline-types'

const DEFAULT_WEIGHT = 1
const DEFAULT_HOLD_RATIO = 0.6

/**
 * Compute the scroll range for each scene based on weights.
 * Each scene gets a proportional slice of 0–1 scroll progress.
 */
export function computeSceneRanges(scenes: SceneConfig[]): SceneRange[] {
  const totalWeight = scenes.reduce((sum, sc) => sum + (sc.weight ?? DEFAULT_WEIGHT), 0)

  let cursor = 0
  return scenes.map((sc) => {
    const w = (sc.weight ?? DEFAULT_WEIGHT) / totalWeight
    const holdRatio = sc.holdRatio ?? DEFAULT_HOLD_RATIO
    const start = cursor
    const end = cursor + w
    const holdEnd = start + w * holdRatio
    cursor = end
    return { start, end, holdEnd }
  })
}

/**
 * Build the input/output arrays for framer-motion's useTransform.
 * Maps vertical scroll progress → horizontal track translateX.
 *
 * Each panel is `100vw` in an `N * 100vw` track.
 * Panel i centers at `-(i / N) * 100%`.
 *
 * For each scene we add two keyframes:
 *   1. At `start` → arrive at this panel's position
 *   2. At `holdEnd` → still at this panel's position (hold phase)
 * The interpolation between holdEnd of scene i and start of scene i+1
 * produces the sliding animation.
 */
export function buildTrackKeyframes(scenes: SceneConfig[]): {
  input: number[]
  output: string[]
} {
  const ranges = computeSceneRanges(scenes)
  const N = scenes.length
  const input: number[] = []
  const output: string[] = []

  for (let i = 0; i < N; i++) {
    const panelX = `${-((i / N) * 100)}%`
    const { start, holdEnd } = ranges[i]

    // Arrive at this panel
    input.push(start)
    output.push(panelX)

    // Hold at this panel (only if holdEnd > start to keep strictly increasing)
    if (holdEnd > start + 0.001) {
      input.push(holdEnd)
      output.push(panelX)
    }
  }

  // Ensure we hold the last panel through the end of scroll
  const lastPanel = `${-(((N - 1) / N) * 100)}%`
  if (input[input.length - 1] < 1) {
    input.push(1)
    output.push(lastPanel)
  }

  return { input, output }
}

/**
 * Compute a scene's local 0–1 progress from the overall rail progress.
 */
export function sceneProgress(railProgress: number, range: SceneRange): number {
  const duration = range.end - range.start
  if (duration <= 0) return railProgress >= range.end ? 1 : 0
  return Math.max(0, Math.min(1, (railProgress - range.start) / duration))
}
