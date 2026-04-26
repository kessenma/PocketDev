import { motion } from 'framer-motion'
import { palette, fontFamilyTokens } from '@pocketdev/shared/theme'
import { BauhausPhone } from '#/components/architecture/sections/HowPocketDevWorks/shared/BauhausPhone'
import { BauhausFace } from '#/components/architecture/sections/HowPocketDevWorks/shared/BauhausFace'
import { architectureTokens } from '#/components/architecture/shared/theme'

const { blue, red, yellow, black } = palette.bauhaus

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
function mapP(v: number, lo: number, hi: number) {
  return clamp((v - lo) / (hi - lo), 0, 1)
}

function BugPaths({ color, sw }: { color: string; sw: number }) {
  const p = {
    fill: 'none' as const, stroke: color, strokeWidth: sw,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  return (
    <>
      <path d="M12 20v-9" {...p} />
      <path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z" {...p} />
      <path d="M9 7.13V6a3 3 0 1 1 6 0v1.13" {...p} />
      <path d="M14.12 3.88 16 2" {...p} />
      <path d="m8 2 1.88 1.88" {...p} />
      <motion.g animate={{ rotate: [-13, 13] }}
        transition={{ duration: 0.18, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
        <path d="M22 13h-4" {...p} />
        <path d="M21 5a4 4 0 0 1-3.55 3.97" {...p} />
        <path d="M21 21a4 4 0 0 0-3.81-4" {...p} />
      </motion.g>
      <motion.g animate={{ rotate: [13, -13] }}
        transition={{ duration: 0.18, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
        <path d="M6 13H2" {...p} />
        <path d="M3 5a4 4 0 0 0 3.55 3.97" {...p} />
        <path d="M3 21a4 4 0 0 1 3.81-4" {...p} />
      </motion.g>
    </>
  )
}

function CrawlingBug({ xs, ys, duration, delay = 0, color, size = 9, reverse = false }: {
  xs: number[]; ys: number[]; duration: number; delay?: number
  color: string; size?: number; reverse?: boolean
}) {
  const s = size / 24
  return (
    <motion.g animate={{ x: xs, y: ys }}
      transition={{ duration, repeat: Infinity, repeatType: reverse ? 'reverse' : 'loop', ease: 'linear', delay }}>
      <motion.g animate={{ rotate: [-4, 4, -4] }}
        transition={{ duration: 0.28, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '0px 0px' }}>
        <g transform={`translate(${-size / 2} ${-size / 2}) scale(${s})`}>
          <BugPaths color={color} sw={2 / s} />
        </g>
      </motion.g>
    </motion.g>
  )
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

function BrokenTerminal({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const x = cx - w / 2, y = cy - h / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={black} />
      <rect x={x} y={y} width={w} height={14} rx={5} fill="rgba(255,255,255,0.08)" />
      <circle cx={x + 10} cy={y + 7} r={2.5} fill={red} opacity={0.9} />
      <circle cx={x + 18} cy={y + 7} r={2.5} fill="rgba(255,255,255,0.2)" />
      <circle cx={x + 26} cy={y + 7} r={2.5} fill="rgba(255,255,255,0.2)" />
      <rect x={x + 8} y={y + 20} width={w * 0.48} height={3} rx={1.5} fill="rgba(255,255,255,0.4)" />
      <rect x={x + 8} y={y + 27} width={w - 16} height={3} rx={1.5} fill="rgba(255,80,80,0.9)" />
      <rect x={x + 8} y={y + 34} width={w * 0.36} height={3} rx={1.5} fill="rgba(255,255,255,0.3)" />
      <rect x={x + w - 22} y={y + h - 18} width={14} height={12} rx={2} fill={red} />
      <rect x={x + w - 16} y={y + h - 16} width={2} height={5} rx={1} fill="rgba(255,255,255,0.95)" />
      <circle cx={x + w - 15} cy={y + h - 8} r={1} fill="rgba(255,255,255,0.95)" />
    </g>
  )
}

type Props = {
  /** Normalized 0→1, maps to global hero progress 0.50→0.72 */
  progress: number
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
}

export function LinuxAdminScene({ progress, vpSize, isDesktopLayout }: Props) {
  const { w, h } = vpSize
  const settledR = isDesktopLayout ? 54 : 46
  const hx = w * 0.5
  const hy = h * 0.5

  const circleOp = Math.min(
    clamp(progress / 0.08, 0, 1),
    clamp((1 - progress) / 0.08, 0, 1),
  )

  const elemBuild = mapP(progress, 0.0, 0.55)
  const sceneOp   = mapP(progress, 0.0, 0.25)
  const bugOp     = mapP(progress, 0.2, 0.55)
  const arcOp     = mapP(elemBuild, 0.4, 0.85)
  const labelOp   = mapP(progress, 0.35, 0.65)

  const phoneScale = isDesktopLayout ? 0.75 : 0.58
  const phoneX     = isDesktopLayout ? w * 0.16 : w * 0.22
  const phoneY     = isDesktopLayout ? h * 0.52 : h * 0.65
  const termW      = isDesktopLayout ? 130 : 88
  const termH      = isDesktopLayout ? 90 : 64
  const btX        = isDesktopLayout ? w * 0.63 : w * 0.68
  const btY        = isDesktopLayout ? h * 0.28 : h * 0.26
  const faceScale  = isDesktopLayout ? 1.8 : 1.2
  const faceX      = isDesktopLayout ? w * 0.82 : w * 0.76
  const faceY      = isDesktopLayout ? h * 0.60 : h * 0.68

  const btSlideY   = (1 - elemBuild) * -120
  const faceSlideX = (1 - elemBuild) * 150
  const btRY       = btY + btSlideY
  const faceRX     = faceX + faceSlideX

  const labelY1 = h * 0.82
  const labelY2 = labelY1 + (isDesktopLayout ? 22 : 17)

  const subColor    = architectureTokens.colors.textSecondary
  const textColor   = architectureTokens.colors.text
  const monoFont    = `${fontFamilyTokens.mono}, ui-monospace, monospace`
  const displayFont = fontFamilyTokens.display

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${h}`}
      className="absolute inset-0 block h-full w-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <circle cx={hx} cy={hy} r={settledR} fill={blue} opacity={circleOp} />

      <g opacity={sceneOp}>
        <BauhausPhone cx={phoneX} cy={phoneY} scale={phoneScale} />

        <g transform={`translate(0, ${btSlideY})`} opacity={elemBuild}>
          <BrokenTerminal cx={btX} cy={btY} w={termW} h={termH} />
          <text x={btX} y={btY + termH / 2 + 14} textAnchor="middle"
            fontSize={isDesktopLayout ? 9 : 8} fill={subColor} fontFamily={monoFont}>
            server
          </text>
        </g>

        <g transform={`translate(0, ${btSlideY})`} opacity={bugOp}>
          <CrawlingBug
            xs={[btX - termW / 2 + 4, btX + termW / 2 - 4]}
            ys={[btY - termH / 2 - 3, btY - termH / 2 - 3]}
            duration={3.2} color={red} size={8} reverse
          />
          <CrawlingBug
            xs={[btX + termW / 2 + 3, btX + termW / 2 + 3]}
            ys={[btY - termH / 2 + 8, btY + termH / 2 - 8]}
            duration={2.4} delay={0.9} color={red} size={8} reverse
          />
        </g>

        <motion.g
          transform={`translate(${faceSlideX}, 0)`}
          opacity={elemBuild}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BauhausFace cx={faceX} cy={faceY} scale={faceScale} fillColor={black} />
          <text x={faceX} y={faceY + faceScale * 22 + 10} textAnchor="middle"
            fontSize={isDesktopLayout ? 9 : 8} fill={subColor} fontFamily={monoFont}>
            claude
          </text>
        </motion.g>

        <DashedArc x1={phoneX} y1={phoneY} x2={hx} y2={hy} color={blue} bend={-0.25} opacity={arcOp} />
        <DashedArc x1={hx} y1={hy} x2={btX} y2={btRY} color={yellow} bend={0.3} opacity={arcOp} />
        <DashedArc x1={hx} y1={hy} x2={faceRX} y2={faceY} color={yellow} bend={-0.25} opacity={arcOp} />
      </g>

      <g opacity={labelOp}>
        <text x={w / 2} y={labelY1} textAnchor="middle"
          fontSize={isDesktopLayout ? 17 : 13} fontWeight="700"
          fill={textColor} fontFamily={displayFont} letterSpacing="-0.03em">
          Or for Linux admins
        </text>
        <text x={w / 2} y={labelY2} textAnchor="middle"
          fontSize={isDesktopLayout ? 12 : 10} fill={subColor} fontFamily={monoFont}>
          who get pinged to fix a broken port at 2am and don't want to get out of bed.
        </text>
      </g>
    </svg>
  )
}
