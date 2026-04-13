import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens, architectureFonts } from '../../../shared/theme'
import { BauhausLaptop } from '../shared/BauhausLaptop'
import { BauhausPhone } from '../shared/BauhausPhone'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mapProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

// 6x6 QR-like grid pattern (true = filled square)
const QR_GRID: boolean[][] = [
  [true,  true,  true,  false, true,  true ],
  [true,  false, true,  true,  false, true ],
  [true,  true,  true,  false, true,  false],
  [false, true,  false, true,  true,  true ],
  [true,  false, true,  true,  false, true ],
  [true,  true,  false, true,  true,  true ],
]

type QRCell = { id: number; row: number; col: number }

const QR_CELLS: QRCell[] = QR_GRID.flatMap((row, r) =>
  row.map((filled, c) => (filled ? { id: r * 6 + c, row: r, col: c } : null))
).filter((c): c is QRCell => c !== null)

const CELL_SIZE = 7
const GRID_COLS = 6
const GRID_W = GRID_COLS * CELL_SIZE
// Grid origin in laptop-local coords — inside the Pairing card of the dashboard
const GRID_ORIGIN_X = -62
const GRID_ORIGIN_Y = -68

// Deterministic scatter angles — cells fly in from edges of the viewport
const SCATTER_ANGLES = QR_CELLS.map((cell) => {
  return ((cell.id * 137 + 29) % 360) * (Math.PI / 180)
})

export function ConnectTakeoverScene({
  progress,
  isDesktopLayout,
  hideLaptop = false,
  hideBlueCircle = false,
  hidePhone = false,
}: {
  progress: number
  active?: boolean
  isDesktopLayout: boolean
  hideLaptop?: boolean
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

  // Scale the animation group relative to viewport
  const scale = Math.min(vpSize.w, vpSize.h) / 320
  const animCenterX = vpSize.w / 2
  const animCenterY = vpSize.h * (isDesktopLayout ? 0.42 : 0.40)

  // Timeline — everything must settle before holdRatio (0.8) so the overlay handoff aligns
  const assembleP = mapProgress(p, 0.0, 0.30)
  const scanP = mapProgress(p, 0.35, 0.50)
  const flyP = mapProgress(p, 0.52, 0.68)
  const connectedP = mapProgress(p, 0.58, 0.76)
  const screenOn = connectedP > 0.5
  const showQrOnScreen = flyP === 0
  const settled = connectedP >= 1
  // Credential shapes appear on phone screen during hold phase after pairing
  const credP = mapProgress(p, 0.78, 0.90)

  // --- Layout positions in LOCAL coords (pre-scale) ---
  // Desktop: side by side. Mobile: laptop above phone.
  const laptopLocalCx = isDesktopLayout ? -50 : 0
  const laptopLocalCy = isDesktopLayout ? 0 : -40
  const laptopScale = isDesktopLayout ? 0.62 : 0.56

  const phoneLocalCx = isDesktopLayout ? 80 : 0
  const phoneLocalCy = isDesktopLayout ? -6 : 50
  const phoneW = 52
  const phoneH = 96
  const phoneLocalX = phoneLocalCx - phoneW / 2
  const phoneLocalY = phoneLocalCy - phoneH / 2
  const phoneScreenLocalCx = phoneLocalCx
  const phoneScreenLocalCy = phoneLocalY + 20 + 48 / 2

  // Scatter radius — big enough to come from well outside the viewport
  const scatterRadius = Math.max(vpSize.w, vpSize.h) / scale * 0.7

  // Phone screen area
  const phoneScreenX = phoneLocalX + 6
  const phoneScreenY = phoneLocalY + 20
  const phoneScreenW = phoneW - 12
  const phoneScreenH = 48

  // Arc direction for flying squares
  const arcMag = isDesktopLayout ? -18 : 12

  // Text positioning
  const titleCenterX = vpSize.w / 2
  const titleY = vpSize.h * (isDesktopLayout ? 0.12 : 0.08)
  const titleSize = isDesktopLayout
    ? Math.min(vpSize.w * 0.04, 56)
    : Math.min(vpSize.w * 0.068, 36)

  const subFontSize = isDesktopLayout
    ? Math.min(vpSize.w * 0.015, 20)
    : Math.min(vpSize.w * 0.04, 18)
  const subLH = Math.round(subFontSize * 1.55)
  const subY = vpSize.h * (isDesktopLayout ? 0.88 : 0.80)
  const subX = isDesktopLayout ? vpSize.w * 0.06 : vpSize.w * 0.07

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
        x={titleCenterX}
        y={titleY}
        fill={architectureTokens.colors.text}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={titleSize}
        fontWeight="700"
        letterSpacing="-0.03em"
        textAnchor="middle"
      >
        Pair your phone
      </text>

      {/* Subtitle */}
      <text
        x={subX}
        y={subY}
        fill={architectureTokens.colors.textSecondary}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={subFontSize}
      >
        {isDesktopLayout ? (
          <>
            <tspan x={subX} dy="0">Open the app, scan the pairing code, done. Your phone becomes the</tspan>
            <tspan x={subX} dy={subLH}>control surface — the server does the heavy lifting.</tspan>
          </>
        ) : (
          <>
            <tspan x={subX} dy="0">Open the app, scan the pairing</tspan>
            <tspan x={subX} dy={subLH}>code, done. Your phone becomes</tspan>
            <tspan x={subX} dy={subLH}>the control surface — the server</tspan>
            <tspan x={subX} dy={subLH}>does the heavy lifting.</tspan>
          </>
        )}
      </text>

      {/* Animation group — scaled and centered */}
      <g transform={`translate(${animCenterX} ${animCenterY}) scale(${scale})`}>
        {/* Blue circle — travels from laptop top-right and lands on phone screen.
            Shrinks from large (traveling) to small (on-screen credential).
            Hidden during slide-out (overlay bridges it). */}
        {!hideLaptop && !hideBlueCircle && (() => {
          const laptopTopRightX = laptopLocalCx + 70 * laptopScale
          const laptopTopY = laptopLocalCy - 100 * laptopScale
          // Destination: left area of phone screen
          const destX = phoneScreenLocalCx - 12
          const destY = phoneScreenLocalCy
          const moveP = clamp((connectedP - 0.2) / 0.8, 0, 1)
          const bcx = mix(laptopTopRightX, destX, moveP)
          const bcy = mix(laptopTopY, destY, moveP)
          const br  = mix(26, 8, moveP)
          return (
            <circle cx={bcx} cy={bcy} r={br} fill={palette.bauhaus.blue} opacity={0.96} />
          )
        })()}

        {/* Laptop with QR grid */}
        <g opacity={hideLaptop ? 0 : 1}>
        <BauhausLaptop cx={laptopLocalCx} cy={laptopLocalCy} scale={laptopScale}>
          {/* Traffic light dots */}
          <circle cx={-74} cy={-112} r={3} fill={palette.bauhaus.red} />
          <circle cx={-63} cy={-112} r={3} fill={palette.bauhaus.yellow} />
          <circle cx={-52} cy={-112} r={3} fill={palette.bauhaus.blue} />

          {/* ─── Dashboard chrome (matches ConsoleSetupStage end state) ─── */}
          {/* Header bar */}
          <rect x={-78} y={-112} width={156} height={18} rx={4} fill="rgba(255,255,255,0.06)" />
          <rect x={-72} y={-109} width={12} height={12} rx={3} fill={palette.bauhaus.yellow} />
          <rect x={-56} y={-108} width={40} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={-56} y={-103} width={24} height={2.5} rx={1} fill="rgba(255,255,255,0.25)" />
          <rect x={20} y={-108} width={18} height={6} rx={3} fill={palette.bauhaus.yellow} opacity={0.7} />
          <rect x={42} y={-108} width={14} height={6} rx={3} fill={palette.bauhaus.blue} opacity={0.5} />

          {/* Left card — Pairing (QR assembles here) */}
          <rect
            x={-78} y={-88} width={74} height={66} rx={6}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.6"
          />
          <text
            x={-70} y={-78}
            fontFamily="var(--font-sans), sans-serif"
            fontSize="4.5" fontWeight="600"
            fill="rgba(255,255,255,0.6)"
          >
            Pairing
          </text>

          {/* QR cells — assemble into the Pairing card */}
          {showQrOnScreen && (
            <>
              {QR_CELLS.map((cell, i) => {
                const angle = SCATTER_ANGLES[i]
                const scatterX = Math.cos(angle) * scatterRadius
                const scatterY = Math.sin(angle) * scatterRadius - scatterRadius * 0.3
                const targetX = GRID_ORIGIN_X + cell.col * CELL_SIZE
                const targetY = GRID_ORIGIN_Y + cell.row * CELL_SIZE
                const x = mix(targetX + scatterX, targetX, assembleP)
                const y = mix(targetY + scatterY, targetY, assembleP)
                const opacity = mix(0.2, 0.95, assembleP)

                return (
                  <rect
                    key={cell.id}
                    x={x}
                    y={y}
                    width={CELL_SIZE - 1}
                    height={CELL_SIZE - 1}
                    rx={0.5}
                    fill={palette.bauhaus.red}
                    opacity={opacity}
                  />
                )
              })}

              {/* Scan line */}
              {scanP > 0 && scanP < 1 && (
                <rect
                  x={GRID_ORIGIN_X}
                  y={GRID_ORIGIN_Y + scanP * GRID_W}
                  width={GRID_W}
                  height={3}
                  rx={1}
                  fill={palette.bauhaus.yellow}
                  opacity={scanP < 0.1 || scanP > 0.9 ? 0.5 : 0.95}
                />
              )}
            </>
          )}

          {/* Right card — Devices */}
          <rect
            x={2} y={-88} width={74} height={66} rx={6}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.6"
          />
          <text
            x={10} y={-78}
            fontFamily="var(--font-sans), sans-serif"
            fontSize="4.5" fontWeight="600"
            fill="rgba(255,255,255,0.6)"
          >
            Devices
          </text>
          {[0, 1, 2].map((i) => (
            <g key={`device-${i}`}>
              <rect x={10} y={-70 + i * 16} width={58} height={12} rx={4} fill="rgba(255,255,255,0.04)" />
              <circle cx={18} cy={-64 + i * 16} r={3} fill={i === 0 ? palette.bauhaus.blue : 'rgba(255,255,255,0.15)'} />
              <rect x={24} y={-66 + i * 16} width={i === 0 ? 30 : 20 + i * 4} height={3} rx={1.5} fill={i === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'} />
            </g>
          ))}

          {/* Console label */}
          <text
            x={0} y={-17}
            textAnchor="middle"
            fontFamily={architectureFonts.body}
            fontSize="5"
            letterSpacing="0.16em"
            fill="rgba(255,255,255,0.5)"
          >
            SERVER CONTROL BOARD
          </text>
        </BauhausLaptop>
        </g>

        {/* Flying squares (local coords, outside laptop transform) */}
        {flyP > 0 && flyP < 1 &&
          QR_CELLS.map((cell) => {
            const stagger = (cell.col / GRID_COLS) * 0.15
            const cellFlyP = clamp((flyP - stagger) / (1 - stagger), 0, 1)

            // Start position: laptop-local → animation-group-local coords
            const startX =
              laptopLocalCx + (GRID_ORIGIN_X + cell.col * CELL_SIZE) * laptopScale
            const startY =
              laptopLocalCy + (GRID_ORIGIN_Y + cell.row * CELL_SIZE) * laptopScale

            const x = mix(startX, phoneScreenLocalCx - 2, cellFlyP)
            const y =
              mix(startY, phoneScreenLocalCy - 2, cellFlyP) +
              Math.sin(cellFlyP * Math.PI) * arcMag
            const size = mix(CELL_SIZE * laptopScale, 2, cellFlyP)
            const opacity = cellFlyP > 0.9 ? mix(1, 0, (cellFlyP - 0.9) / 0.1) : 1

            return (
              <rect
                key={`fly-${cell.id}`}
                x={x}
                y={y}
                width={size}
                height={size}
                rx={0.3}
                fill={palette.bauhaus.red}
                opacity={opacity}
              />
            )
          })}

        {/* Phone — hidden during slide-out so the overlay can bridge it */}
        <g opacity={hidePhone ? 0 : 1}>
        <BauhausPhone
          cx={phoneLocalCx}
          cy={phoneLocalCy}
          scale={phoneW / 60}
        >
          {/* Suppress default content — animated overlays rendered outside */}
          <></>
        </BauhausPhone>
        </g>

        {/* Phone screen — white background */}
        <motion.rect
          x={phoneScreenX}
          y={phoneScreenY}
          width={phoneScreenW}
          height={phoneScreenH}
          rx={10}
          fill="#ffffff"
          animate={{ opacity: screenOn ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
        {/* Pair button + label — fade out as credential shapes appear */}
        <g opacity={Math.max(0, 1 - credP * 3)}>
          <motion.rect
            x={phoneScreenLocalCx - 14}
            y={phoneScreenLocalCy - 6}
            width={28}
            height={12}
            rx={6}
            fill={palette.bauhaus.red}
            animate={
              settled && !reduceMotion
                ? { opacity: 1, scale: [1, 1.06, 1] }
                : { opacity: screenOn ? 1 : 0 }
            }
            transition={
              settled && !reduceMotion
                ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2, ease: 'easeOut' }
            }
            style={{ transformOrigin: `${phoneScreenLocalCx}px ${phoneScreenLocalCy}px` }}
          />
          <motion.text
            x={phoneScreenLocalCx}
            y={phoneScreenLocalCy + 3}
            textAnchor="middle"
            fontSize="6"
            fontWeight="700"
            fill="#ffffff"
            fontFamily="var(--font-sans), sans-serif"
            animate={{ opacity: screenOn ? 1 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            Pair
          </motion.text>
        </g>
        {/* Credential shapes on phone screen — appear after pairing, hidden during slide-out */}
        {!hideBlueCircle && credP > 0 && (() => {
          const sx = phoneScreenLocalCx
          const sy = phoneScreenLocalCy
          return (
            <g opacity={credP}>
              {/* Blue circle (left) — matches the traveling circle landing position */}
              <circle cx={sx - 12} cy={sy} r={6} fill={palette.bauhaus.blue} />
              {/* Yellow triangle (center) */}
              <polygon
                points={`${sx},${sy - 7} ${sx + 6.5},${sy + 4} ${sx - 6.5},${sy + 4}`}
                fill={palette.bauhaus.yellow}
              />
              {/* Red square (right) */}
              <rect x={sx + 6} y={sy - 6} width={12} height={12} rx={1.5} fill={palette.bauhaus.red} />
            </g>
          )
        })()}

        {/* Labels */}
        <text
          x={laptopLocalCx}
          y={laptopLocalCy + (isDesktopLayout ? 52 : 48)}
          textAnchor="middle"
          fontSize="10"
          fill={architectureTokens.colors.textSecondary}
        >
          Server
        </text>
        <text
          x={phoneLocalCx}
          y={phoneLocalY + phoneH + 16}
          textAnchor="middle"
          fontSize="10"
          fill={architectureTokens.colors.textSecondary}
        >
          Phone
        </text>
      </g>
    </svg>
  )
}
