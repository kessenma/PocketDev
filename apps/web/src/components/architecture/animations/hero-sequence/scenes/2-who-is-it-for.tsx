import { palette } from '@pocketdev/shared/theme'
import { WhoIsItForScene } from '../WhoIsItForScene'
import { TrainSideSvg, TRAIN_WINDOW_CX, TRAIN_WINDOW_CY, TRAIN_WINDOW_R } from './TrainSideSvg'

const { blue } = palette.bauhaus

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

type Props = {
  /** Normalized 0→1, maps to global hero progress 0.28→0.72 */
  progress: number
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
}

export function WhoIsItForScrollScene({ progress, vpSize, isDesktopLayout }: Props) {
  const settledR = isDesktopLayout ? 54 : 46

  // Fade in over first 8% of scene, fade out over last 8%
  const circleOp = Math.min(
    clamp(progress / 0.08, 0, 1),
    clamp((1 - progress) / 0.08, 0, 1),
  )

  // ── Train drive-by with zoom ─────────────────────────────────
  // scaleEnd: window circle matches hub circle exactly (r = settledR)
  const scaleEnd = settledR / TRAIN_WINDOW_R
  // scaleStart: zoomed-out view showing the front section of the train
  const scaleStart = isDesktopLayout ? 1.0 : 0.75

  const rawT = clamp(progress / 0.65, 0, 1)
  // Ease in-out: smooth start and end
  const eased = rawT < 0.5
    ? 2 * rawT * rawT
    : 1 - Math.pow(-2 * rawT + 2, 2) / 2

  const currentScale = scaleStart + (scaleEnd - scaleStart) * eased

  const svgW = 2400 * currentScale
  const svgH = 200 * currentScale

  // State 0: entire train off-screen left (nose 30% viewport-width past left edge)
  // State 1: window (TRAIN_WINDOW_CX) lands at viewport center — aligned with hub circle
  const trainLeft0 = -(2192 + vpSize.w * 0.3) * scaleStart
  const trainLeft1 = vpSize.w / 2 - TRAIN_WINDOW_CX * scaleEnd
  const trainLeft = trainLeft0 + (trainLeft1 - trainLeft0) * eased

  // Keep window vertically pinned to hub circle center throughout
  const trainTop = vpSize.h / 2 - TRAIN_WINDOW_CY * currentScale

  // No fade-in — position controls when the train appears (peeks in from left edge)
  // Small fade-out at the end as use-case-1 transitions away
  const trainOp = clamp((0.65 - progress) / 0.06, 0, 1)

  return (
    <>
      {/* Hub circle — sits behind train so it shows through the transparent window */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
        className="absolute inset-0 block h-full w-full"
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <circle cx={vpSize.w / 2} cy={vpSize.h / 2} r={settledR} fill={blue} opacity={circleOp} />
      </svg>

      {/* Train — in front of hub circle, windows are transparent so circle shows through */}
      <div
        className="absolute"
        style={{
          left: trainLeft,
          top: trainTop,
          width: svgW,
          height: svgH,
          opacity: trainOp,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <TrainSideSvg width={svgW} height={svgH} />
      </div>

      <div className="absolute inset-0" style={{ opacity: circleOp }}>
        <WhoIsItForScene progress={progress} vpSize={vpSize} isDesktopLayout={isDesktopLayout} />
      </div>
    </>
  )
}
