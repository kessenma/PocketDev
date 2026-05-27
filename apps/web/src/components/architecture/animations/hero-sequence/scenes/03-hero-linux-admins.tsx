import { motion } from 'framer-motion'
import { palette, fontFamilyTokens } from '@pocketdev/shared/theme'
import { architectureTokens } from '#/components/architecture/shared/theme'

const { blue, red, black } = palette.bauhaus

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

// Center of the head circle in the SVG's 150×150 coordinate space (x≈72, y≈28.6)
const BED_HEAD_SVG_X = 72
const BED_HEAD_SVG_Y = 28.6

function BedLineDrawing({ progress, pinX, pinY, scale, color }: {
  progress: number
  pinX: number  // screen x to align with the SVG head center
  pinY: number  // screen y to align with the SVG head center
  scale: number
  color: string
}) {
  // Head circle removed — the scene's blue circle stands in for it
  const paths = [
    "m23.5 56.8-0.1-44.8c0-5.4 3.2-9.1 9.2-9.1h81.5c4.7 0 8.7 1.2 8.7 8.5l0.1 42.2c-2.2-1.7-3.5-2.6-9.5-3-7.1-0.4-16.9-0.2-21.7-2.2-2.3-0.9-4.1-3.5-5.4-5.1",
    "m24.9 56.7c2.9-2.1 4.7-2.7 12-3.3 7.1-0.6 12.2-0.7 13.9-1.4 2.1-0.6 3.9-5.5 7.3-8.6 1.6-1.5 5.4-3.2 7.7-2.7 2.1 0.8-3.6 2.3-8 2.7-5.6 0.5-7.3 1.4-10.2 2-4.3 1-1.6-1.3-1.1-5.7 0.4-4.6-1.3-7.9-0.3-16.9 0.7-5.7-0.1-8.3-1.2-11.5-0.8-2.2 0.3-1.4 1.7-1 6.4 1.6 10.2 1.1 18.6 0.5 7.4-0.6 13.8-0.3 21.7 0.2 6.4 0.3 9.1-0.6 11-1.1 2.6-0.7 1.3 0.7 0.3 4.8-0.8 3.8 0.7 8.1 0.3 15.8-0.3 5.8-1.2 7.8 0.4 12.3 1.1 3.3 0.1 2.2-3 1.5-2.4-0.7-7.3-1.2-10.3-1l-0.2 0.2",
    "m66.8 40.5c2.8-0.3 9.8-0.7 13.8 0.2 1.9 0.4 4.1 1.3 5.2 2.3",
    "m24.4 63.1c-0.2-1.5 0.3-3.5 0.7-4.7 1.8-2.6 5.4-2 14.6-2.9 9.1-0.9 18.2-4.1 28-6.1 4.1-0.8 14.7-1.8 22.9 0 3.8 0.8 6.5 1.8 10.7 2.4 9.1 1 17.7-0.2 20.2 2.6 1.8 1.7 1.7 4 1.7 6l0.1 77.5c0 5.7-3 9.5-8.8 9.5h-81.9c-5.2 0-9.6-0.5-9.7-8.5v-75.4c0-4.5 1.5-6.1 2.2-6.8",
    "m63.7 64.5c2.9-1 5.9-1.9 11.4-1.9 11.3 0 17 3.8 24.8 7.9 6.4 3.5 14.6 8.1 27.2 9.1-1.3-7.1-1.3-15.5-2.2-19.2-0.8-3.2-2.5-5.8-5-6.6",
  ]
  const n = paths.length
  const p = {
    fill: 'none' as const, stroke: color,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    strokeMiterlimit: 10, strokeWidth: 0.8,
  }
  // Anchor the SVG head-center to (pinX, pinY) on screen
  const tx = pinX - BED_HEAD_SVG_X * scale
  const ty = pinY - BED_HEAD_SVG_Y * scale
  return (
    <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
      {paths.map((d, i) => {
        const segStart = (i / n) * 0.35
        const segEnd   = segStart + 0.65
        const t = clamp((progress - segStart) / (segEnd - segStart), 0, 1)
        return (
          <path key={i} d={d} {...p} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
        )
      })}
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
  heroProgress: number
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
}

export function LinuxAdminScene({ progress, heroProgress, vpSize, isDesktopLayout }: Props) {
  const { w, h } = vpSize
  const settledR = isDesktopLayout ? 54 : 46
  const hx = w * 0.5
  const hy = h * 0.5

  const circleOp = heroProgress >= 0.77 ? 0 : clamp(progress / 0.08, 0, 1)

  const elemBuild = mapP(progress, 0.0, 0.55)
  const sceneOp   = mapP(progress, 0.0, 0.25)
  const bugOp     = mapP(progress, 0.2, 0.55)
  const labelOp   = mapP(progress, 0.35, 0.65)

  const termW      = isDesktopLayout ? 130 : 88
  const termH      = isDesktopLayout ? 90 : 64
  const btX        = isDesktopLayout ? w * 0.63 : w * 0.68
  const btY        = isDesktopLayout ? h * 0.28 : h * 0.26

  const btSlideY   = (1 - elemBuild) * -120

  const bedDrawP = mapP(progress, 0.08, 0.78)
  const bedScale = isDesktopLayout ? 6.0 : 4.0

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
      <rect x={0} y={0} width={w} height={h} fill={palette.bauhaus.cream} opacity={sceneOp} />
      <circle cx={hx} cy={hy} r={settledR} fill={blue} opacity={circleOp} />

      <g opacity={sceneOp}>
        <BedLineDrawing progress={bedDrawP} pinX={hx} pinY={hy} scale={bedScale} color={black} />

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

      </g>

      <g opacity={labelOp}>
        <text x={w / 2} y={labelY1} textAnchor="middle"
          fontSize={isDesktopLayout ? 17 : 13} fontWeight="700"
          fill={textColor} fontFamily={displayFont} letterSpacing="-0.03em">
           And when you get pinged at 2am--
        </text>
        <text x={w / 2} y={labelY2} textAnchor="middle"
          fontSize={isDesktopLayout ? 12 : 10} fill={subColor} fontFamily={monoFont}>
          {isDesktopLayout ? (
            'You can ssh into the prod server and fix the issue with your AI of choice.'
          ) : (
            <>
              <tspan x={w / 2} dy="0">You can ssh into the prod server</tspan>
              <tspan x={w / 2} dy="14">and fix the issue with your AI of choice.</tspan>
            </>
          )}
        </text>
      </g>
    </svg>
  )
}
