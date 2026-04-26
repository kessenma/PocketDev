import { motion } from 'framer-motion'
import { palette, fontFamilyTokens } from '@pocketdev/shared/theme'
import { BauhausPhone } from '#/components/architecture/sections/HowPocketDevWorks/shared/BauhausPhone'
import { architectureTokens } from '#/components/architecture/shared/theme'
import { TrainSideSvg, TRAIN_WINDOW_CX, TRAIN_WINDOW_CY, TRAIN_WINDOW_R } from './TrainSideSvg'

const { blue, red, yellow, black } = palette.bauhaus

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
function mapP(v: number, lo: number, hi: number) {
  return clamp((v - lo) / (hi - lo), 0, 1)
}

function DashedArc({ x1, y1, x2, y2, color, bend = 0.25, opacity = 1 }: {
  x1: number; y1: number; x2: number; y2: number
  color: string; bend?: number; opacity?: number
}) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const d = `M ${x1} ${y1} Q ${mx - dy * bend} ${my + dx * bend} ${x2} ${y2}`
  return (
    <g opacity={opacity}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="5 3" opacity={0.7} />
      <path d={d} fill="none" stroke={color} strokeWidth="0.8" strokeDasharray="5 3" opacity={0.35} />
    </g>
  )
}

function VpsTerminal({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const x = cx - w / 2, y = cy - h / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={black} />
      <rect x={x} y={y} width={w} height={14} rx={5} fill="rgba(255,255,255,0.08)" />
      <circle cx={x + 10} cy={y + 7} r={2.5} fill={red} opacity={0.8} />
      <circle cx={x + 18} cy={y + 7} r={2.5} fill={yellow} opacity={0.8} />
      <circle cx={x + 26} cy={y + 7} r={2.5} fill={blue} opacity={0.8} />
      <rect x={x + 8} y={y + 20} width={w * 0.50} height={3} rx={1.5} fill="rgba(80,255,100,0.7)" />
      <rect x={x + 8} y={y + 27} width={w * 0.33} height={3} rx={1.5} fill="rgba(80,255,100,0.5)" />
      <rect x={x + 8} y={y + 34} width={w * 0.42} height={3} rx={1.5} fill="rgba(80,255,100,0.4)" />
      <motion.rect
        x={x + 8} y={y + 43} width={7} height={9} rx={1}
        fill="rgba(80,255,100,0.9)"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </g>
  )
}

type Props = {
  /** Normalized 0→1, maps to global hero progress 0.22→0.58 */
  progress: number
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
}

export function DevOnTheGoScene({ progress, vpSize, isDesktopLayout }: Props) {
  const { w, h } = vpSize
  const settledR = isDesktopLayout ? 54 : 46
  const hx = w * 0.5
  const hy = h * 0.5

  // Circle visible early, fades out before train fully settles
  const circleOp = Math.min(
    clamp(progress / 0.08, 0, 1),
    clamp((0.55 - progress) / 0.08, 0, 1),
  )

  // ── Train drive-by ────────────────────────────────────────────
  const scaleEnd = settledR / TRAIN_WINDOW_R
  const scaleStart = isDesktopLayout ? 1.0 : 0.75
  const rawT = clamp(progress / 0.75, 0, 1)
  const eased = rawT < 0.5
    ? 2 * rawT * rawT
    : 1 - Math.pow(-2 * rawT + 2, 2) / 2
  const currentScale = scaleStart + (scaleEnd - scaleStart) * eased
  const svgW = 2400 * currentScale
  const svgH = 200 * currentScale
  const trainLeft0 = -(2192 + w * 0.3) * scaleStart
  const trainLeft1 = w / 2 - TRAIN_WINDOW_CX * scaleEnd
  const trainLeft = trainLeft0 + (trainLeft1 - trainLeft0) * eased
  const trainTop = h / 2 - TRAIN_WINDOW_CY * currentScale
  const trainOp = clamp((0.95 - progress) / 0.08, 0, 1)

  // ── Phone + VPS — appear after person is visible in train ─────
  // Train finishes settling at rawT=1 (progress ≈ 0.75), elements build in after
  const elemBuild = mapP(progress, 0.72, 0.90)
  const elemFade  = mapP(progress, 0.93, 1.0)
  const elemOp    = elemBuild * (1 - elemFade)
  const arcOp     = mapP(elemBuild, 0.55, 0.95)

  // Phone: below + right of the circle (person looking down at phone, side profile)
  const phoneScale = isDesktopLayout ? 0.62 : 0.52
  const phoneX     = isDesktopLayout ? hx + 85 : hx + 60
  const phoneY     = isDesktopLayout ? hy + 100 : hy + 80
  const phoneSlideY = (1 - elemBuild) * -20  // drops down into hands

  // VPS: upper right, slides in from right
  const termW    = isDesktopLayout ? 120 : 82
  const termH    = isDesktopLayout ? 84 : 60
  const vpsX     = isDesktopLayout ? w * 0.82 : w * 0.78
  const vpsY     = isDesktopLayout ? h * 0.28 : h * 0.22
  const vpsSlideX = (1 - elemBuild) * 70

  // Actual endpoint positions (used for arc)
  const phoneCX = phoneX
  const phoneCY = phoneY + phoneSlideY
  const vpsCX   = vpsX + vpsSlideX
  const vpsCY   = vpsY

  const labelOp = mapP(elemBuild, 0.7, 1.0) * (1 - elemFade)
  const labelY1 = h * 0.82
  const labelY2 = labelY1 + (isDesktopLayout ? 22 : 17)

  const subColor    = architectureTokens.colors.textSecondary
  const textColor   = architectureTokens.colors.text
  const monoFont    = `${fontFamilyTokens.mono}, ui-monospace, monospace`
  const displayFont = fontFamilyTokens.display

  return (
    <>
      {/* Hub circle — sits behind train, fades before person is revealed */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 block h-full w-full"
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <circle cx={hx} cy={hy} r={settledR} fill={blue} opacity={circleOp} />
      </svg>

      {/* Train — in front of hub circle */}
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

      {/* Phone in person's hands + VPS + direct connection */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 block h-full w-full"
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <g opacity={elemOp}>
          <g transform={`translate(0, ${phoneSlideY})`} opacity={elemBuild}>
            <BauhausPhone cx={phoneX} cy={phoneY} scale={phoneScale} />
          </g>

          <g transform={`translate(${vpsSlideX}, 0)`} opacity={elemBuild}>
            <VpsTerminal cx={vpsX} cy={vpsY} w={termW} h={termH} />
            <text x={vpsX} y={vpsY + termH / 2 + 14} textAnchor="middle"
              fontSize={isDesktopLayout ? 9 : 8} fill={subColor} fontFamily={monoFont}>
              vps
            </text>
          </g>

          {/* Direct straight line: phone → vps */}
          <DashedArc x1={phoneCX} y1={phoneCY} x2={vpsCX} y2={vpsCY}
            color={blue} bend={0} opacity={arcOp} />
        </g>

        <g opacity={labelOp}>
          <text x={w / 2} y={labelY1} textAnchor="middle"
            fontSize={isDesktopLayout ? 17 : 13} fontWeight="700"
            fill={textColor} fontFamily={displayFont} letterSpacing="-0.03em">
            Built for developers on the go
          </text>
          <text x={w / 2} y={labelY2} textAnchor="middle"
            fontSize={isDesktopLayout ? 12 : 10} fill={subColor} fontFamily={monoFont}>
            connect to any cheap Linux server as a control surface for your code and tools.
          </text>
        </g>
      </svg>
    </>
  )
}
