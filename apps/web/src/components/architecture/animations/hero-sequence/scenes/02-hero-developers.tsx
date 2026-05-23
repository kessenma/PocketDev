import { motion } from 'framer-motion'
import { palette, fontFamilyTokens } from '@pocketdev/shared/theme'
import { BauhausPhone } from '#/components/architecture/sections/HowPocketDevWorks/shared/BauhausPhone'
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

  // ── Phase boundaries ──────────────────────────────────────────
  const ENTRY_END = 0.50  // train finishes driving in
  const HOLD_END  = 0.65  // cinematic pause ends, exit begins

  // ── Entry easing (0 → ENTRY_END) ──────────────────────────────
  const entryT = clamp(progress / ENTRY_END, 0, 1)
  const entryEased = entryT < 0.5
    ? 2 * entryT * entryT
    : 1 - Math.pow(-2 * entryT + 2, 2) / 2

  // ── Exit easing (HOLD_END → 1.0), ease-in so train accelerates ─
  const exitT = mapP(progress, HOLD_END, 1.0)
  const exitEased = exitT * exitT

  const scaleEnd   = settledR / TRAIN_WINDOW_R
  const scaleStart = isDesktopLayout ? 1.0 : 0.75
  const scaleExit  = scaleStart  // zooms back out to entry scale

  const trainLeft0 = -(2192 + w * 0.3) * scaleStart
  const trainLeft1 = w / 2 - TRAIN_WINDOW_CX * scaleEnd
  // Exit: SVG left edge moves off-screen right, window zooms out
  const trainLeft2 = w + 100

  let currentScale: number
  let trainLeft: number

  if (progress <= ENTRY_END) {
    currentScale = scaleStart + (scaleEnd - scaleStart) * entryEased
    trainLeft    = trainLeft0 + (trainLeft1 - trainLeft0) * entryEased
  } else if (progress <= HOLD_END) {
    currentScale = scaleEnd
    trainLeft    = trainLeft1
  } else {
    currentScale = scaleEnd + (scaleExit - scaleEnd) * exitEased
    trainLeft    = trainLeft1 + (trainLeft2 - trainLeft1) * exitEased
  }

  const trainTop = h / 2 - TRAIN_WINDOW_CY * currentScale

  // Hub circle fades in at start, fades out before train settles
  const circleOp = Math.min(
    clamp(progress / 0.08, 0, 1),
    clamp((ENTRY_END - 0.06 - progress) / 0.08, 0, 1),
  )

  // ── Phone + VPS — build in during hold, fade out early in exit ──
  const elemBuild = mapP(progress, ENTRY_END, HOLD_END)
  // Start fading as soon as exit begins, gone by 0.88
  const elemFade  = mapP(progress, HOLD_END + 0.04, 0.88)
  const elemOp    = elemBuild * (1 - elemFade)
  const arcOp     = mapP(elemBuild, 0.55, 0.95)

  // Phone: below + right of the circle
  const phoneScale  = isDesktopLayout ? 0.62 : 0.52
  const phoneX      = isDesktopLayout ? hx + 85 : hx + 60
  const phoneY      = isDesktopLayout ? hy + 100 : hy + 80
  const phoneSlideY = (1 - elemBuild) * -20

  // VPS: upper right, slides in from right
  const termW     = isDesktopLayout ? 120 : 82
  const termH     = isDesktopLayout ? 84 : 60
  const vpsX      = isDesktopLayout ? w * 0.82 : w * 0.78
  const vpsY      = isDesktopLayout ? h * 0.28 : h * 0.22
  const vpsSlideX = (1 - elemBuild) * 70

  const phoneCX = phoneX
  const phoneCY = phoneY + phoneSlideY
  const vpsCX   = vpsX + vpsSlideX
  const vpsCY   = vpsY

  const monoFont = `${fontFamilyTokens.mono}, ui-monospace, monospace`

  // Scene headline — slides in from left alongside phone + VPS
  const textSlideX = (1 - elemBuild) * -25
  const textX = isDesktopLayout ? w * 0.36 : w * 0.10
  const textY = isDesktopLayout ? h * 0.26 : h * 0.27
  const textFs = 16
  const textLh = textFs + 6

  return (
    <>
      {/* Hub circle — fades out before train settles */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 block h-full w-full"
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <circle cx={hx} cy={hy} r={settledR} fill={blue} opacity={circleOp} />
      </svg>

      {/* Train — exits via rightward motion + zoom-out, never fades */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: 2400,
          height: 200,
          transform: `translate(${trainLeft}px, ${trainTop}px) scale(${currentScale})`,
          transformOrigin: '0 0',
          willChange: 'transform',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <TrainSideSvg width={2400} height={200} />
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
          </g>

          {/* Direct straight line: phone → vps */}
          <DashedArc x1={phoneCX} y1={phoneCY} x2={vpsCX} y2={vpsCY}
            color={blue} bend={0} opacity={arcOp} />

          {/* Scene headline */}
          <g transform={`translate(${textSlideX}, 0)`} opacity={elemBuild}>
            <text x={textX} y={textY} textAnchor="start" fontSize={textFs}
              fill={black} fontFamily={monoFont} fontWeight="500">
              So you can build
            </text>
            <text x={textX} y={textY + textLh} textAnchor="start" fontSize={textFs}
              fill={black} fontFamily={monoFont} fontWeight="500">
              wherever and whenever
            </text>
            <text x={textX} y={textY + textLh * 2} textAnchor="start" fontSize={textFs}
              fill={black} fontFamily={monoFont} fontWeight="500">
              ideas come
            </text>
          </g>
        </g>


      </svg>
    </>
  )
}
