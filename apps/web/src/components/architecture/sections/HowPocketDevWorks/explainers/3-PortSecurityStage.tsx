import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens, architectureFonts } from '../../../shared/theme'
import { BauhausPhone } from '../shared/BauhausPhone'

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function mapP(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// ── Door geometry in local coords (pre-scale) ─────────────────────────────────
// Front door = port 4388 (always open wake server)
const FD = { x: -90, y: -118, w: 180, h: 206 }
// Back door = port 4387 (shape-locked, blocks main agent port)
const BD = { x: -48, y: -76, w: 96, h: 106 }

// Tunnel / depth lines connecting front door inner edges to back door edges
const TUNNEL_LINES: [number, number, number, number][] = [
  [FD.x,        FD.y,        BD.x,        BD.y       ],
  [FD.x + FD.w, FD.y,        BD.x + BD.w, BD.y       ],
  [FD.x + FD.w, FD.y + FD.h, BD.x + BD.w, BD.y + FD.h],
  [FD.x,        FD.y + FD.h, BD.x,        BD.y + FD.h],
]

// Shape slots — represent the Ed25519 "key" combination
const SLOT_Y = BD.y + BD.h * 0.54 // slot row y-center in local coords
const SLOT_SIZE = 14
const SHAPES = [
  { kind: 'circle'   as const, color: palette.bauhaus.blue,   dx: -26 },
  { kind: 'triangle' as const, color: palette.bauhaus.yellow,  dx:   0 },
  { kind: 'square'   as const, color: palette.bauhaus.red,     dx:  26 },
]

function ShapeOutline({ kind, size }: { kind: typeof SHAPES[number]['kind']; size: number }) {
  const s = size
  if (kind === 'circle') {
    return (
      <circle r={s / 2} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
    )
  }
  if (kind === 'triangle') {
    const pts = `0,${-s / 2} ${s * 0.5},${s / 2} ${-s * 0.5},${s / 2}`
    return (
      <polygon points={pts} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
    )
  }
  const h = s / 2
  return (
    <rect x={-h} y={-h} width={s} height={s} rx={2} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
  )
}

function ShapeFill({ kind, color, size }: { kind: typeof SHAPES[number]['kind']; color: string; size: number }) {
  const s = size
  if (kind === 'circle') return <circle r={s / 2} fill={color} />
  if (kind === 'triangle') {
    const pts = `0,${-s / 2} ${s * 0.5},${s / 2} ${-s * 0.5},${s / 2}`
    return <polygon points={pts} fill={color} />
  }
  const h = s / 2
  return <rect x={-h} y={-h} width={s} height={s} rx={2} fill={color} />
}

// Same helper used for flying shapes in transit
function FlyingShape({ kind, color, size }: { kind: typeof SHAPES[number]['kind']; color: string; size: number }) {
  const s = size
  if (kind === 'circle') return <circle r={s / 2} fill={color} />
  if (kind === 'triangle') {
    const pts = `0,${-s / 2} ${s * 0.5},${s / 2} ${-s * 0.5},${s / 2}`
    return <polygon points={pts} fill={color} />
  }
  const h = s / 2
  return <rect x={-h} y={-h} width={s} height={s} rx={2} fill={color} />
}

export function PortSecurityStage({
  progress,
  isDesktopLayout,
  hideBlueCircle = false,
  hidePhone = false,
}: {
  progress: number
  active?: boolean
  isDesktopLayout: boolean
  hideBlueCircle?: boolean
  hidePhone?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const p = reduceMotion ? 1 : progress

  const [vpSize, setVpSize] = useState({ w: 840, h: 1280 })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const viewBox = `0 0 ${vpSize.w} ${vpSize.h}`
  const scale = Math.min(vpSize.w, vpSize.h) / 320
  const animCenterX = vpSize.w / 2
  const animCenterY = vpSize.h * (isDesktopLayout ? 0.42 : 0.40)

  // ── Animation timeline ────────────────────────────────────────────────────
  const circleGrowP = mapP(p, 0.00, 0.18)  // circle grows from phone screen token to full
  const corridorP   = mapP(p, 0.06, 0.26)  // door frames + tunnel lines draw in
  const labelsP     = mapP(p, 0.14, 0.32)  // text labels fade in

  // Three shapes fly to their slots sequentially
  const flyBase = mapP(p, 0.42, 0.70)
  const fly0    = mapP(flyBase, 0.00, 0.46) // blue circle
  const fly1    = mapP(flyBase, 0.27, 0.73) // yellow triangle
  const fly2    = mapP(flyBase, 0.54, 1.00) // red square
  const fillPs  = [fly0, fly1, fly2]
  const allFilled = fly2 >= 1

  const doorOpenP = mapP(p, 0.70, 0.84)  // back door panel disappears
  const connP     = mapP(p, 0.78, 0.94)  // connection line + circle moves to door

  // ── Phone layout ──────────────────────────────────────────────────────────
  const phoneCx    = isDesktopLayout ? -152 : -112
  const phoneCy    = isDesktopLayout ?    0 :   22
  const phoneW     = 44
  const phoneScale = phoneW / 60
  // Shape launch origin = phone screen center
  const shotX = phoneCx
  const shotY = phoneCy - 6

  // ── Text layout ───────────────────────────────────────────────────────────
  const titleX  = vpSize.w / 2
  const titleY  = vpSize.h * (isDesktopLayout ? 0.12 : 0.08)
  const titleSz = isDesktopLayout
    ? Math.min(vpSize.w * 0.04, 56)
    : Math.min(vpSize.w * 0.068, 36)
  const subSz = isDesktopLayout
    ? Math.min(vpSize.w * 0.015, 20)
    : Math.min(vpSize.w * 0.04, 18)
  const subLH = Math.round(subSz * 1.55)
  const subY  = vpSize.h * (isDesktopLayout ? 0.88 : 0.80)
  const subX  = isDesktopLayout ? vpSize.w * 0.06 : vpSize.w * 0.07

  // Brief blue glow on back door at unlock moment
  const unlockGlow = allFilled ? Math.max(0, 0.5 - doorOpenP) * 0.75 : 0

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      className="block h-full w-full"
      style={{ backgroundColor: architectureTokens.colors.paper }}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="100%" height="100%" fill={architectureTokens.colors.paper} />

      {/* Title */}
      <text
        x={titleX}
        y={titleY}
        fill={architectureTokens.colors.text}
        fontFamily={architectureFonts.body}
        fontSize={titleSz}
        fontWeight="700"
        letterSpacing="-0.03em"
        textAnchor="middle"
        opacity={labelsP}
      >
        Invisible by default
      </text>

      {/* Subtitle */}
      <text
        x={subX}
        y={subY}
        fill={architectureTokens.colors.textSecondary}
        fontFamily={architectureFonts.body}
        fontSize={subSz}
        opacity={labelsP}
      >
        {isDesktopLayout ? (
          <>
            <tspan x={subX} dy="0">
              Port 4387 can be blocked at the iptables level — invisible to scanners.
            </tspan>
            <tspan x={subX} dy={subLH}>
              Port 4388 accepts only your signed wake requests, then reopens 4387 for your session.
            </tspan>
          </>
        ) : (
          <>
            <tspan x={subX} dy="0">Port 4387 can be blocked at the</tspan>
            <tspan x={subX} dy={subLH}>iptables level — invisible to scanners.</tspan>
            <tspan x={subX} dy={subLH}>Port 4388 accepts only signed</tspan>
            <tspan x={subX} dy={subLH}>wake requests to reopen it.</tspan>
          </>
        )}
      </text>

      {/* ── Main animation group (all local coords, scaled to viewport) ─── */}
      <g transform={`translate(${animCenterX} ${animCenterY}) scale(${scale})`}>

        {/* Perspective / tunnel lines showing depth between doors */}
        {TUNNEL_LINES.map(([x1, y1, x2, y2], i) => (
          <line
            key={`tl-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={architectureTokens.colors.textSecondary}
            strokeWidth="0.7"
            opacity={corridorP * 0.2}
          />
        ))}

        {/* ── Front door — PORT 4388 (always open) ────────────────────── */}

        {/* Door frame outline, draws in with pathLength */}
        <motion.rect
          x={FD.x} y={FD.y} width={FD.w} height={FD.h}
          rx={3}
          fill="none"
          stroke={palette.bauhaus.black}
          strokeWidth="5"
          pathLength={1}
          animate={{ pathLength: corridorP }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />

        {/* Door leaf edge — thin sliver on right showing door is open */}
        <rect
          x={FD.x + FD.w - 5}
          y={FD.y + 2}
          width={5}
          height={FD.h - 4}
          rx={2}
          fill={palette.bauhaus.black}
          opacity={corridorP * 0.6}
        />

        {/* Hinge marks */}
        {[0.22, 0.78].map((frac, i) => (
          <circle
            key={`hinge-${i}`}
            cx={FD.x + FD.w - 2.5}
            cy={FD.y + FD.h * frac}
            r={2}
            fill={architectureTokens.colors.border}
            opacity={corridorP * 0.65}
          />
        ))}

        {/* PORT 4388 label */}
        <text
          x={FD.x + FD.w / 2}
          y={FD.y - 10}
          textAnchor="middle"
          fontFamily={architectureFonts.mono}
          fontSize="10"
          fontWeight="600"
          letterSpacing="0.06em"
          fill={architectureTokens.colors.textSecondary}
          opacity={labelsP * 0.75}
        >
          PORT 4388
        </text>

        {/* "always open" subtitle under front door */}
        <text
          x={FD.x + FD.w / 2}
          y={FD.y + FD.h + 16}
          textAnchor="middle"
          fontFamily={architectureFonts.body}
          fontSize="8"
          fill={architectureTokens.colors.textSecondary}
          opacity={labelsP * 0.45}
        >
          wake server · always open
        </text>

        {/* ── Back door — PORT 4387 (shape-locked) ────────────────────── */}

        {/* Dark closed fill — fades out as door unlocks */}
        <motion.rect
          x={BD.x} y={BD.y} width={BD.w} height={BD.h}
          rx={3}
          fill={palette.bauhaus.black}
          animate={{ opacity: corridorP * 0.6 * (1 - doorOpenP) }}
        />

        {/* Blue flash at moment of unlock */}
        {unlockGlow > 0 && (
          <rect
            x={BD.x} y={BD.y} width={BD.w} height={BD.h}
            rx={3}
            fill={palette.bauhaus.blue}
            opacity={unlockGlow}
          />
        )}

        {/* Door frame outline */}
        <motion.rect
          x={BD.x} y={BD.y} width={BD.w} height={BD.h}
          rx={3}
          fill="none"
          stroke={palette.bauhaus.black}
          strokeWidth="3.5"
          pathLength={1}
          animate={{ pathLength: corridorP }}
          transition={{ duration: 0.28, ease: 'linear' }}
        />

        {/* PORT 4387 label */}
        <text
          x={BD.x + BD.w / 2}
          y={BD.y - 8}
          textAnchor="middle"
          fontFamily={architectureFonts.mono}
          fontSize="8"
          fontWeight="600"
          letterSpacing="0.06em"
          fill={architectureTokens.colors.textSecondary}
          opacity={labelsP * 0.75}
        >
          PORT 4387
        </text>

        {/* ── Shape lock slots ─────────────────────────────────────────── */}
        {SHAPES.map((shape, i) => {
          const filled = fillPs[i] >= 1
          return (
            <g
              key={`slot-${i}`}
              transform={`translate(${shape.dx} ${SLOT_Y})`}
              opacity={corridorP}
            >
              {/* Empty slot outline */}
              <ShapeOutline kind={shape.kind} size={SLOT_SIZE} />
              {/* Filled color when shape has arrived */}
              {filled && <ShapeFill kind={shape.kind} color={shape.color} size={SLOT_SIZE} />}
              {/* Soft glow halo */}
              {filled && (
                <circle r={SLOT_SIZE * 0.85} fill={shape.color} opacity={0.18} />
              )}
            </g>
          )
        })}

        {/* ── Flying shapes — arc from phone screen to each slot ───────── */}
        {SHAPES.map((shape, i) => {
          const t = fillPs[i]
          if (t <= 0 || t >= 1) return null

          const endX = shape.dx
          const endY = SLOT_Y
          // Quadratic bezier control point — arcs up and through the front door opening
          const ctrlX = mix(shotX, endX, 0.5)
          const ctrlY = Math.min(shotY, endY) - 30

          const qx = (1 - t) * (1 - t) * shotX + 2 * (1 - t) * t * ctrlX + t * t * endX
          const qy = (1 - t) * (1 - t) * shotY + 2 * (1 - t) * t * ctrlY + t * t * endY
          const fadeOut = t > 0.86 ? mix(1, 0, (t - 0.86) / 0.14) : 1

          return (
            <g key={`fly-${i}`} transform={`translate(${qx} ${qy})`} opacity={fadeOut}>
              <FlyingShape kind={shape.kind} color={shape.color} size={10} />
            </g>
          )
        })}

        {/* ── Pre-fly shapes on phone screen — triangle + square visible before launch ── */}
        {/* (Circle is handled separately with grow animation above) */}
        {!hidePhone && !hideBlueCircle && (() => {
          const preFadeIn = mapP(p, 0.05, 0.22)
          const preFadeOut = clamp(fly0 * 3, 0, 1)
          const opacity = preFadeIn * (1 - preFadeOut)
          if (opacity <= 0) return null
          const sy = phoneCy - 10  // phone screen center y
          return (
            <>
              {/* Yellow triangle at screen center — matches ConnectStage */}
              <g transform={`translate(${phoneCx} ${sy})`} opacity={opacity}>
                <FlyingShape kind="triangle" color={palette.bauhaus.yellow} size={8} />
              </g>
              {/* Red square at screen right — matches ConnectStage */}
              <g transform={`translate(${phoneCx + 12} ${sy})`} opacity={opacity}>
                <FlyingShape kind="square" color={palette.bauhaus.red} size={8} />
              </g>
            </>
          )
        })()}

        {/* ── Blue circle — grows from phone screen token, then moves right of doors ── */}
        {!hideBlueCircle && (() => {
          // Phase 1: grow from screen token (r=8, on phone screen) to full size (r=26, behind phone)
          const startCx = phoneCx - 12
          const startCy = phoneCy - 10
          const fullCx = phoneCx + 20
          const fullCy = phoneCy
          const growCx = mix(startCx, fullCx, circleGrowP)
          const growCy = mix(startCy, fullCy, circleGrowP)
          const growR  = mix(8, 26, circleGrowP)
          // Phase 2: move right of doors after unlock
          const circleEndX = BD.x + BD.w + 30  // 78
          const circleEndY = BD.y + BD.h / 2   // -23
          const cx = mix(growCx, circleEndX, connP)
          const cy = mix(growCy, circleEndY, connP)
          const r  = mix(growR, 26, connP)
          return (
            <circle cx={cx} cy={cy} r={r} fill={palette.bauhaus.blue} opacity={0.96} />
          )
        })()}

        {/* ── Phone — renders above circle so circle is behind it ── */}
        <g opacity={hidePhone ? 0 : 1}>
          <BauhausPhone cx={phoneCx} cy={phoneCy} scale={phoneScale}>
            <></>
          </BauhausPhone>
        </g>

        {/* ── Dashed connection line after unlock ──────────────────────── */}
        {connP > 0 && (
          <motion.line
            x1={phoneCx + phoneW / 2}
            y1={phoneCy}
            x2={BD.x + BD.w + 22}
            y2={BD.y + BD.h / 2}
            stroke={palette.bauhaus.blue}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 4"
            animate={{
              opacity: connP,
              strokeDashoffset: [0, -20],
            }}
            transition={{
              opacity: { duration: 0.2 },
              strokeDashoffset: { duration: 1.2, repeat: Infinity, ease: 'linear' },
            }}
          />
        )}

      </g>
    </svg>
  )
}
