import { motion } from 'framer-motion'
import { palette, fontFamilyTokens } from '@pocketdev/shared/theme'
import { BauhausPhone } from '#/components/architecture/sections/HowPocketDevWorks/shared/BauhausPhone'
import { BauhausFace } from '#/components/architecture/sections/HowPocketDevWorks/shared/BauhausFace'
import { architectureTokens } from '#/components/architecture/shared/theme'

const { blue, red, yellow, black } = palette.bauhaus

function mapP(v: number, lo: number, hi: number) {
  return Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
}

// ── Spark rays emanating outward from the blue circle hub ────

const RAY_DIRS = [
  { dx: 0, dy: -1 },
  { dx: 0.7, dy: -0.7 },
  { dx: -0.7, dy: -0.7 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
]

function SparkRays({ cx, cy }: { cx: number; cy: number }) {
  const inner = 50
  const outer = 72
  return (
    <g>
      {RAY_DIRS.map((d, i) => (
        <line key={i}
          x1={cx + d.dx * inner} y1={cy + d.dy * inner}
          x2={cx + d.dx * outer} y2={cy + d.dy * outer}
          stroke={yellow} strokeWidth="1.5" opacity="0.18" strokeLinecap="round"
        />
      ))}
      {RAY_DIRS.map((d, i) => (
        <motion.circle key={i} r={2} fill={yellow}
          animate={{
            cx: [cx + d.dx * inner, cx + d.dx * outer],
            cy: [cy + d.dy * inner, cy + d.dy * outer],
            opacity: [1, 0],
          }}
          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1, ease: 'easeOut', repeatDelay: 0.7 }}
        />
      ))}
    </g>
  )
}

// ── Crawling bug (Lucide Bug icon in 24×24 native space) ──────

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

// ── Dashed arc between two absolute SVG coordinates ──────────

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

// ── Terminal drawings ─────────────────────────────────────────

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
      <motion.rect x={x + 8} y={y + 43} width={7} height={9} rx={1}
        fill="rgba(80,255,100,0.9)"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
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

// ── Main component ────────────────────────────────────────────

type Props = {
  progress: number  // 0–1 across the who-is-it-for scroll phase
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
}

export function WhoIsItForScene({ progress, vpSize, isDesktopLayout }: Props) {
  const { w, h } = vpSize

  const p1Build = mapP(progress, 0.00, 0.28)
  const p1Fade  = mapP(progress, 0.50, 0.65)
  const p1Op    = 1 - p1Fade
  const p2Build = mapP(progress, 0.50, 0.80)
  const p2Op    = mapP(progress, 0.48, 0.63)

  // Hub circle position — matches HeroScene's emergeY during this phase
  const hx = w * 0.5
  const hy = h * 0.5

  // Element positions
  const phoneScale = isDesktopLayout ? 0.75 : 0.58
  const phoneX = isDesktopLayout ? w * 0.16 : w * 0.22
  const phoneY = isDesktopLayout ? h * 0.52 : h * 0.65

  const termW = isDesktopLayout ? 130 : 88
  const termH = isDesktopLayout ? 90 : 64
  const vpsX  = isDesktopLayout ? w * 0.80 : w * 0.72
  const vpsY  = isDesktopLayout ? h * 0.43 : h * 0.30

  const btX   = isDesktopLayout ? w * 0.63 : w * 0.68
  const btY   = isDesktopLayout ? h * 0.28 : h * 0.26
  const faceScale = isDesktopLayout ? 1.8 : 1.2
  const faceX = isDesktopLayout ? w * 0.82 : w * 0.76
  const faceY = isDesktopLayout ? h * 0.60 : h * 0.68

  // Slide offsets — elements glide in from edges
  const phoneSlideX = (1 - p1Build) * -150
  const vpsSlideX   = (1 - p1Build) * 150
  const btSlideY    = (1 - p2Build) * -120
  const faceSlideX  = (1 - p2Build) * 150

  // Actual rendered positions (used for arc endpoints)
  const phoneRX = phoneX + phoneSlideX
  const vpsRX   = vpsX + vpsSlideX
  const btRY    = btY + btSlideY
  const faceRX  = faceX + faceSlideX

  const arcOp1 = mapP(p1Build, 0.4, 0.85)
  const arcOp2 = mapP(p2Build, 0.4, 0.85)
  const bugOp  = mapP(p2Build, 0.55, 0.85)

  const textColor = architectureTokens.colors.text
  const subColor  = architectureTokens.colors.textSecondary
  const monoFont  = `${fontFamilyTokens.mono}, ui-monospace, monospace`
  const displayFont = fontFamilyTokens.display

  const labelY1 = h * 0.82
  const labelY2 = h * 0.82 + (isDesktopLayout ? 22 : 17)
  const label1Op = p1Build * p1Op
  const label2Op = p2Op

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${h}`}
      className="absolute inset-0 block h-full w-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {/* ── Use case 1: Developer on the go ── */}
      <g opacity={p1Op}>
        <SparkRays cx={hx} cy={hy} />

        <g transform={`translate(${phoneSlideX}, 0)`} opacity={p1Build}>
          <BauhausPhone cx={phoneX} cy={phoneY} scale={phoneScale} />
        </g>

        <g transform={`translate(${vpsSlideX}, 0)`} opacity={p1Build}>
          <VpsTerminal cx={vpsX} cy={vpsY} w={termW} h={termH} />
          <text x={vpsX} y={vpsY + termH / 2 + 14} textAnchor="middle"
            fontSize={isDesktopLayout ? 9 : 8} fill={subColor} fontFamily={monoFont}>
            vps
          </text>
        </g>

        <DashedArc x1={phoneRX} y1={phoneY} x2={hx} y2={hy} color={blue} bend={-0.25} opacity={arcOp1} />
        <DashedArc x1={hx} y1={hy} x2={vpsRX} y2={vpsY} color={blue} bend={-0.25} opacity={arcOp1} />
      </g>

      {/* ── Use case 2: Linux admin ── */}
      <g opacity={p2Op}>
        <BauhausPhone cx={phoneX} cy={phoneY} scale={phoneScale} />

        <g transform={`translate(0, ${btSlideY})`} opacity={p2Build}>
          <BrokenTerminal cx={btX} cy={btY} w={termW} h={termH} />
          <text x={btX} y={btY + termH / 2 + 14} textAnchor="middle"
            fontSize={isDesktopLayout ? 9 : 8} fill={subColor} fontFamily={monoFont}>
            server
          </text>
        </g>

        {/* Bugs crawl on the broken terminal, offset with it */}
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
          opacity={p2Build}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BauhausFace cx={faceX} cy={faceY} scale={faceScale} fillColor={black} />
          <text x={faceX} y={faceY + faceScale * 22 + 10} textAnchor="middle"
            fontSize={isDesktopLayout ? 9 : 8} fill={subColor} fontFamily={monoFont}>
            claude
          </text>
        </motion.g>

        <DashedArc x1={phoneX} y1={phoneY} x2={hx} y2={hy} color={blue} bend={-0.25} opacity={arcOp2} />
        <DashedArc x1={hx} y1={hy} x2={btX} y2={btRY} color={yellow} bend={0.3} opacity={arcOp2} />
        <DashedArc x1={hx} y1={hy} x2={faceRX} y2={faceY} color={yellow} bend={-0.25} opacity={arcOp2} />
      </g>

      {/* ── Labels ── */}
      <g opacity={label1Op}>
        <text x={w / 2} y={labelY1} textAnchor="middle"
          fontSize={isDesktopLayout ? 17 : 13} fontWeight="700"
          fill={textColor} fontFamily={displayFont} letterSpacing="-0.03em">
          Built for developers on the go--
        </text>
        <text x={w / 2} y={labelY2} textAnchor="middle"
          fontSize={isDesktopLayout ? 12 : 10} fill={subColor} fontFamily={monoFont}>
          --connect to any cheap Linux server as a control surface for your code and tools.
        </text>
      </g>

      <g opacity={label2Op}>
        <text x={w / 2} y={labelY1} textAnchor="middle"
          fontSize={isDesktopLayout ? 17 : 13} fontWeight="700"
          fill={textColor} fontFamily={displayFont} letterSpacing="-0.03em">
          Or for Linux admins
        </text>
        <text x={w / 2} y={labelY2} textAnchor="middle"
          fontSize={isDesktopLayout ? 12 : 10} fill={subColor} fontFamily={monoFont}>
          who get pinged to fix a broken port @2am ad don't want to get out of bed. 
        </text>
      </g>
    </svg>
  )
}
