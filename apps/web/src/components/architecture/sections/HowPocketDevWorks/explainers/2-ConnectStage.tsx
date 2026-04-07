import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens } from '../../../shared/theme'
import { BauhausLaptop } from '../shared/BauhausLaptop'

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
// Grid origin in laptop-local coords (centered in screen inner area)
const GRID_ORIGIN_X = -GRID_W / 2
const GRID_ORIGIN_Y = -117 + (104 - GRID_W) / 2

// Deterministic scatter angles — cells fly in from edges of the viewport
const SCATTER_ANGLES = QR_CELLS.map((cell) => {
  return ((cell.id * 137 + 29) % 360) * (Math.PI / 180)
})

export function ConnectTakeoverScene({
  progress,
  isDesktopLayout,
}: {
  progress: number
  active?: boolean
  isDesktopLayout: boolean
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

  // Timeline
  const assembleP = mapProgress(p, 0.0, 0.30)
  const scanP = mapProgress(p, 0.35, 0.50)
  const flyP = mapProgress(p, 0.52, 0.72)
  const connectedP = mapProgress(p, 0.72, 0.85)
  const screenOn = connectedP > 0.5
  const showQrOnScreen = flyP === 0
  const settled = connectedP >= 1

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
        {/* Blue circle — starts top-right of laptop, moves behind phone on pair */}
        {(() => {
          const laptopTopRightX = laptopLocalCx + 70 * laptopScale
          const laptopTopY = laptopLocalCy - 100 * laptopScale
          const phoneBehindX = phoneLocalCx
          const phoneBehindY = phoneLocalCy - 10
          const moveP = clamp((connectedP - 0.2) / 0.8, 0, 1)
          const bcx = mix(laptopTopRightX, phoneBehindX, moveP)
          const bcy = mix(laptopTopY, phoneBehindY, moveP)
          const br = mix(34, 42, moveP)
          return (
            <motion.circle
              cx={bcx}
              cy={bcy}
              r={br}
              fill={palette.bauhaus.blue}
              animate={
                settled && !reduceMotion
                  ? {
                      cy: [bcy, bcy - 4, bcy + 2, bcy],
                      scale: [1, 1.06, 0.97, 1],
                    }
                  : { scale: 1 }
              }
              transition={
                settled && !reduceMotion
                  ? { duration: 3.1, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.3, ease: 'easeOut' }
              }
              style={{ transformOrigin: `${bcx}px ${bcy}px` }}
            />
          )
        })()}

        {/* Laptop with QR grid */}
        <BauhausLaptop cx={laptopLocalCx} cy={laptopLocalCy} scale={laptopScale}>
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
        </BauhausLaptop>

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

        {/* Phone body */}
        <rect
          x={phoneLocalX}
          y={phoneLocalY}
          width={phoneW}
          height={phoneH}
          rx={16}
          fill={palette.bauhaus.black}
        />
        {/* Notch */}
        <rect
          x={phoneLocalCx - 10}
          y={phoneLocalY + 7}
          width={20}
          height={4}
          rx={2}
          fill="rgba(255,255,255,0.84)"
        />

        {/* Phone screen — white with red button when connected */}
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
        {/* Red connect button */}
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
        {/* Button label */}
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

        {/* Home button hint */}
        <circle
          cx={phoneLocalCx}
          cy={phoneLocalY + phoneH - 9}
          r={3}
          fill="rgba(255,255,255,0.4)"
        />

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
