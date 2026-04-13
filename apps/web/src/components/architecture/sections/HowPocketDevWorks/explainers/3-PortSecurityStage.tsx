import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens, architectureFonts } from '../../../shared/theme'
import { BauhausPhone } from '../shared/BauhausPhone'
import { BauhausLaptop } from '../shared/BauhausLaptop'

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}
function mapP(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}
function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t)
}
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
function easeOutBack(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

// ── Door geometry ─────────────────────────────────────────────────────────────
const DOOR_W = 120
const DOOR_H = 210

// Shape slots centered on the door (animation-group coords)
const SLOT_SIZE = 15
const SLOT_DEFS = [
  { kind: 'circle'   as const, x: -32, y: 8,  color: palette.bauhaus.blue   },
  { kind: 'triangle' as const, x:   0, y: 8,  color: palette.bauhaus.yellow },
  { kind: 'square'   as const, x:  32, y: 8,  color: palette.bauhaus.red    },
]

// Per-shape orbit config — each shape spirals from the phone toward its slot
const SHAPE_ORBIT = [
  { pStart: 0.18, pEnd: 0.50, revs: 1.2, dir:  1, initAngle: Math.PI * 0.85 },
  { pStart: 0.27, pEnd: 0.58, revs: 0.9, dir: -1, initAngle: Math.PI * 1.10 },
  { pStart: 0.36, pEnd: 0.66, revs: 1.5, dir:  1, initAngle: Math.PI * 1.35 },
]

// Phone-screen offsets for each shape (BauhausPhone local coords)
const PHONE_OFFSETS = [
  { dx: -12, dy: 2 },  // circle
  { dx:   0, dy: 0 },  // triangle
  { dx:  12, dy: 0 },  // square
]

function ShapeOutline({ kind, size }: { kind: typeof SLOT_DEFS[number]['kind']; size: number }) {
  const s = size
  if (kind === 'circle') {
    return <circle r={s / 2} fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
  }
  if (kind === 'triangle') {
    const pts = `0,${-s / 2} ${s * 0.5},${s / 2} ${-s * 0.5},${s / 2}`
    return <polygon points={pts} fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
  }
  const h = s / 2
  return <rect x={-h} y={-h} width={s} height={s} rx={2} fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
}

function ShapeFilled({ kind, color, size }: { kind: typeof SLOT_DEFS[number]['kind']; color: string; size: number }) {
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
  const doorFadeP    = mapP(p, 0.00, 0.14)  // vault door fades in
  const slotsRevealP = mapP(p, 0.08, 0.22)  // slot outlines pulse in
  const labelsP      = mapP(p, 0.10, 0.26)  // title + subtitle

  // Last shape locks at p=0.66
  const allLockedP   = mapP(p, 0.66, 0.69)  // glow flash on unlock
  const doorOpenP    = mapP(p, 0.68, 0.74)  // door panels slide apart
  const consoleRevP  = mapP(p, 0.69, 0.75)  // laptop console fades in behind door

  // Big blue circle: grows from phone screen token, then moves right for overlay handoff
  const circleGrowP   = mapP(p, 0.00, 0.18)
  const circleMoveP   = mapP(p, 0.74, 0.78)

  // ── Layout ───────────────────────────────────────────────────────────────
  const phoneCx    = isDesktopLayout ? -152 : -112
  const phoneCy    = isDesktopLayout ?    0 :   22
  const phoneScale = 44 / 60

  // Phone shapes fade out as they leave the phone screen
  const phoneShapesFadeOut = mapP(p, SHAPE_ORBIT[0].pStart, SHAPE_ORBIT[0].pStart + 0.10)

  // Text — title left of door (desktop) / right (mobile), subtitle bottom-right
  const titleX  = isDesktopLayout ? vpSize.w * 0.24 : vpSize.w * 0.70
  const titleY  = vpSize.h * (isDesktopLayout ? 0.14 : 0.10)
  const titleSz = isDesktopLayout
    ? Math.min(vpSize.w * 0.04, 56)
    : Math.min(vpSize.w * 0.068, 36)
  const subSz = isDesktopLayout
    ? Math.min(vpSize.w * 0.015, 20)
    : Math.min(vpSize.w * 0.04, 18)
  const subLH = Math.round(subSz * 1.55)
  const subY  = vpSize.h * (isDesktopLayout ? 0.82 : 0.78)
  const subX  = isDesktopLayout ? vpSize.w * 0.58 : vpSize.w * 0.50

  // Door panel slide amount when opening
  const doorSlide = easeInOut(doorOpenP) * (DOOR_W / 2 + 35)
  const doorOpacity = doorFadeP * (1 - easeOutQuad(doorOpenP))

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
        x={titleX} y={titleY}
        fill={architectureTokens.colors.text}
        fontFamily={architectureFonts.body}
        fontSize={titleSz}
        fontWeight="700"
        letterSpacing="-0.03em"
        textAnchor="middle"
        opacity={labelsP}
      >
        Lock the port
      </text>

      {/* Subtitle */}
      <text x={subX} y={subY} fill={architectureTokens.colors.textSecondary} fontFamily={architectureFonts.body} fontSize={subSz} opacity={labelsP}>
        {isDesktopLayout ? (
          <>
            <tspan x={subX} dy="0">Optional. Leave port 4387 open, or flip the switch in</tspan>
            <tspan x={subX} dy={subLH}>mobile app settings to hide it at the firewall level —</tspan>
            <tspan x={subX} dy={subLH}>invisible to scanners. Signed wake requests let you back in.</tspan>
          </>
        ) : (
          <>
            <tspan x={subX} dy="0">Optional — leave port 4387</tspan>
            <tspan x={subX} dy={subLH}>open, or enable port locking</tspan>
            <tspan x={subX} dy={subLH}>in mobile app settings to</tspan>
            <tspan x={subX} dy={subLH}>hide it from scanners.</tspan>
          </>
        )}
      </text>

      {/* ── Main animation group ─────────────────────────────────────────── */}
      <g transform={`translate(${animCenterX} ${animCenterY}) scale(${scale})`}>

        {/* ── Big blue circle — behind phone, grows, then moves right ─── */}
        {!hideBlueCircle && (() => {
          const startCx = phoneCx + (-12) * phoneScale
          const startCy = phoneCy + 2 * phoneScale
          const startR  = 6 * phoneScale
          const growCx  = mix(startCx, phoneCx, circleGrowP)
          const growCy  = mix(startCy, phoneCy, circleGrowP)
          const growR   = mix(startR, 26, circleGrowP)
          const cx = mix(growCx, 100, circleMoveP)
          const cy = mix(growCy, 0,   circleMoveP)
          return <circle cx={cx} cy={cy} r={growR} fill={palette.bauhaus.blue} opacity={0.96} />
        })()}

        {/* ── Console laptop — rendered BEHIND door panels ─────────────── */}
        {consoleRevP > 0 && (
          <g opacity={easeOutQuad(consoleRevP)}>
            <BauhausLaptop cx={isDesktopLayout ? 0 : 0} cy={isDesktopLayout ? -18 : -10} scale={isDesktopLayout ? 0.50 : 0.43}>
              {/* Traffic lights */}
              <circle cx={-74} cy={-112} r={3} fill={palette.bauhaus.red} />
              <circle cx={-63} cy={-112} r={3} fill={palette.bauhaus.yellow} />
              <circle cx={-52} cy={-112} r={3} fill={palette.bauhaus.blue} />
              {/* Header */}
              <rect x={-78} y={-112} width={156} height={18} rx={4} fill="rgba(255,255,255,0.06)" />
              <rect x={-72} y={-109} width={12} height={12} rx={3} fill={palette.bauhaus.yellow} />
              <rect x={-56} y={-108} width={40} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
              <rect x={-56} y={-103} width={24} height={2.5} rx={1} fill="rgba(255,255,255,0.25)" />
              <rect x={20}  y={-108} width={18} height={6} rx={3} fill={palette.bauhaus.yellow} opacity={0.7} />
              <rect x={42}  y={-108} width={14} height={6} rx={3} fill={palette.bauhaus.blue} opacity={0.5} />
              {/* Left card — Pairing */}
              <rect x={-78} y={-88} width={74} height={66} rx={6} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
              <text x={-70} y={-78} fontFamily="var(--font-sans), sans-serif" fontSize="4.5" fontWeight="600" fill="rgba(255,255,255,0.6)">Pairing</text>
              {/* Right card — Devices */}
              <rect x={2} y={-88} width={74} height={66} rx={6} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
              <text x={10} y={-78} fontFamily="var(--font-sans), sans-serif" fontSize="4.5" fontWeight="600" fill="rgba(255,255,255,0.6)">Devices</text>
              {[0, 1, 2].map((i) => (
                <g key={`dev-${i}`}>
                  <rect x={10} y={-70 + i * 16} width={58} height={12} rx={4} fill="rgba(255,255,255,0.04)" />
                  <circle cx={18} cy={-64 + i * 16} r={3} fill={i === 0 ? palette.bauhaus.blue : 'rgba(255,255,255,0.15)'} />
                  <rect x={24} y={-66 + i * 16} width={i === 0 ? 30 : 20 + i * 4} height={3} rx={1.5} fill={i === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'} />
                </g>
              ))}
              <text x={0} y={-17} textAnchor="middle" fontFamily={architectureFonts.body} fontSize="5" letterSpacing="0.16em" fill="rgba(255,255,255,0.5)">SERVER CONTROL BOARD</text>
            </BauhausLaptop>
          </g>
        )}

        {/* ── Vault door — left panel (slides left on open) ──────────────── */}
        {doorFadeP > 0 && (
          <g transform={`translate(${-doorSlide} 0)`} opacity={doorOpacity}>
            <rect x={-DOOR_W / 2} y={-DOOR_H / 2} width={DOOR_W / 2} height={DOOR_H}
              fill={palette.bauhaus.black} />
            {/* Frame edge */}
            <rect x={-DOOR_W / 2} y={-DOOR_H / 2} width={DOOR_W / 2} height={DOOR_H}
              fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
            {/* Horizontal accent lines */}
            {[-50, 0, 50].map((dy) => (
              <line key={dy} x1={-DOOR_W / 2 + 6} y1={dy} x2={-2} y2={dy}
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
            ))}
            {/* Hinge marks */}
            {[0.25, 0.75].map((frac, i) => (
              <circle key={i} cx={-DOOR_W / 2 + 5} cy={-DOOR_H / 2 + DOOR_H * frac} r={3.5}
                fill="rgba(255,255,255,0.12)" />
            ))}
          </g>
        )}

        {/* ── Vault door — right panel (slides right on open) ─────────────── */}
        {doorFadeP > 0 && (
          <g transform={`translate(${doorSlide} 0)`} opacity={doorOpacity}>
            <rect x={0} y={-DOOR_H / 2} width={DOOR_W / 2} height={DOOR_H}
              fill={palette.bauhaus.black} />
            <rect x={0} y={-DOOR_H / 2} width={DOOR_W / 2} height={DOOR_H}
              fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
            {[-50, 0, 50].map((dy) => (
              <line key={dy} x1={2} y1={dy} x2={DOOR_W / 2 - 6} y2={dy}
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
            ))}
            {[0.25, 0.75].map((frac, i) => (
              <circle key={i} cx={DOOR_W / 2 - 5} cy={-DOOR_H / 2 + DOOR_H * frac} r={3.5}
                fill="rgba(255,255,255,0.12)" />
            ))}
          </g>
        )}

        {/* ── Center seam + PORT label ─────────────────────────────────────── */}
        {doorFadeP > 0 && doorOpenP < 0.5 && (
          <line x1={0} y1={-DOOR_H / 2} x2={0} y2={DOOR_H / 2}
            stroke="rgba(255,255,255,0.07)" strokeWidth="1"
            opacity={doorOpacity} />
        )}
        <text
          x={0} y={-DOOR_H / 2 - 10}
          textAnchor="middle"
          fontFamily={architectureFonts.mono}
          fontSize="9"
          fontWeight="600"
          letterSpacing="0.07em"
          fill={architectureTokens.colors.textSecondary}
          opacity={labelsP * 0.8 * (1 - doorOpenP)}
        >
          PORT 4387
        </text>

        {/* ── Shape lock slots (float above door panels) ───────────────────── */}
        {SLOT_DEFS.map((slot, i) => {
          const isLocked = SHAPE_ORBIT[i].pEnd <= p + 0.01
          return (
            <g key={`slot-${i}`} transform={`translate(${slot.x} ${slot.y})`}
              opacity={slotsRevealP * (1 - easeOutQuad(doorOpenP))}>
              <ShapeOutline kind={slot.kind} size={SLOT_SIZE} />
              {isLocked && (
                <>
                  <ShapeFilled kind={slot.kind} color={slot.color} size={SLOT_SIZE} />
                  <circle r={SLOT_SIZE * 0.85} fill={slot.color}
                    opacity={0.15 + allLockedP * 0.20} />
                </>
              )}
            </g>
          )
        })}

        {/* ── Unlock glow flash ─────────────────────────────────────────────── */}
        {allLockedP > 0 && allLockedP < 1 && (
          <rect x={-DOOR_W / 2} y={-DOOR_H / 2} width={DOOR_W} height={DOOR_H}
            fill={palette.bauhaus.blue} opacity={allLockedP * 0.28} />
        )}

        {/* ── Flying shapes — orbit from phone to slot ─────────────────────── */}
        {SHAPE_ORBIT.map((cfg, i) => {
          const slot = SLOT_DEFS[i]
          const phoneOff = PHONE_OFFSETS[i]
          const totalP = mapP(p, cfg.pStart, cfg.pEnd)
          if (totalP <= 0 || totalP >= 1) return null

          // Phone-space start position (animation group coords)
          const phoneX = phoneCx + phoneOff.dx * phoneScale
          const phoneY = phoneCy + phoneOff.dy * phoneScale

          // Spiral orbit: large radius that collapses toward slot
          const orbitPhaseP = mapP(totalP, 0, 0.80)
          const lockP       = mapP(totalP, 0.72, 1.0)
          const orbitRadius = mix(72, 10, orbitPhaseP)
          const angle = cfg.initAngle + cfg.dir * cfg.revs * Math.PI * 2 * orbitPhaseP

          const orbitX = slot.x + Math.cos(angle) * orbitRadius
          const orbitY = slot.y + Math.sin(angle) * orbitRadius

          // Blend from phone into orbit path
          const joinP = mapP(totalP, 0, 0.28)
          const inOrbitX = mix(phoneX, orbitX, easeOutQuad(joinP))
          const inOrbitY = mix(phoneY, orbitY, easeOutQuad(joinP))

          // Snap to slot
          const fx = mix(inOrbitX, slot.x, easeOutBack(lockP))
          const fy = mix(inOrbitY, slot.y, easeOutBack(lockP))

          const flySize = mix(9, SLOT_SIZE, easeOutQuad(totalP))

          return (
            <g key={`fly-${i}`} transform={`translate(${fx} ${fy})`}>
              <ShapeFilled kind={slot.kind} color={slot.color} size={flySize} />
            </g>
          )
        })}

        {/* ── Phone — renders above everything on left ─────────────────────── */}
        <g opacity={hidePhone ? 0 : 1}>
          <BauhausPhone cx={phoneCx} cy={phoneCy} scale={phoneScale}>
            {(() => {
              const preFadeIn  = mapP(p, 0.05, 0.20)
              const opacity = preFadeIn * (1 - phoneShapesFadeOut)
              if (opacity <= 0) return <></>
              return (
                <g opacity={opacity}>
                  <circle cx={-12} cy={2} r={6} fill={palette.bauhaus.blue} />
                  <polygon points="0,-7 5.5,3.5 -5.5,3.5" fill={palette.bauhaus.yellow} />
                  <rect x={6} y={-6} width={12} height={12} rx={1.5} fill={palette.bauhaus.red} />
                </g>
              )
            })()}
          </BauhausPhone>
        </g>

        {/* ── Dashed signal line: phone → door center (shows after door opens) ── */}
        {consoleRevP > 0 && (
          <motion.line
            x1={phoneCx + 22 * phoneScale}
            y1={phoneCy}
            x2={-DOOR_W / 2 - 4}
            y2={0}
            stroke={palette.bauhaus.blue}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="5 4"
            animate={{
              opacity: easeOutQuad(consoleRevP) * (1 - circleMoveP),
              strokeDashoffset: [0, -18],
            }}
            transition={{
              opacity: { duration: 0.2 },
              strokeDashoffset: { duration: 1.0, repeat: Infinity, ease: 'linear' },
            }}
          />
        )}

      </g>
    </svg>
  )
}
