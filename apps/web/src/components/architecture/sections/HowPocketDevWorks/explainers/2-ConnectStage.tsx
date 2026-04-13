import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
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

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t)
}

function easeOutBack(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
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
  const showQrOnScreen = flyP === 0
  // White screen slides up when pairing completes, then exits; shapes pop in on dark screen
  const screenSlideP = mapProgress(p, 0.60, 0.70)  // white screen slides in from below
  const screenExitP  = mapProgress(p, 0.71, 0.75)  // white screen slides back down
  const pairClickP   = mapProgress(p, 0.65, 0.71)  // pair button tap bounce
  const shape0P      = mapProgress(p, 0.73, 0.78)  // blue circle pops in
  const shape1P      = mapProgress(p, 0.75, 0.80)  // yellow triangle pops in
  const shape2P      = mapProgress(p, 0.77, 0.82)  // red square pops in

  // --- Layout positions in LOCAL coords (pre-scale) ---
  // Desktop: side by side. Mobile: laptop above phone.
  const laptopLocalCx = isDesktopLayout ? -50 : 0
  const laptopLocalCy = isDesktopLayout ? 0 : -40
  const laptopScale = isDesktopLayout ? 0.62 : 0.56

  const phoneLocalCx = isDesktopLayout ? 80 : 0
  const phoneLocalCy = isDesktopLayout ? -6 : 50
  const phoneW = 52
  const phoneH = 96
  const phoneLocalY = phoneLocalCy - phoneH / 2
  const phoneScreenLocalCx = phoneLocalCx
  const phoneScreenLocalCy = phoneLocalY + 20 + 48 / 2

  // Scatter radius — big enough to come from well outside the viewport
  const scatterRadius = Math.max(vpSize.w, vpSize.h) / scale * 0.7

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
        {/* Blue circle — travels from laptop top-right into the phone screen.
            Destination in animation-group coords matches BauhausPhone local (-12, 2) scaled by phoneW/60.
            Hidden during slide-out (overlay bridges it). */}
        {!hideLaptop && !hideBlueCircle && (() => {
          const laptopTopRightX = laptopLocalCx + 70 * laptopScale
          const laptopTopY = laptopLocalCy - 100 * laptopScale
          const ps = phoneW / 60  // phone scale factor (52/60)
          const destX = phoneLocalCx + (-12) * ps  // = 69.6 desktop
          const destY = phoneLocalCy + 2 * ps       // = -4.3 desktop
          const destR = 6 * ps                       // = 5.2 desktop
          const moveP = clamp((connectedP - 0.2) / 0.8, 0, 1)
          const bcx = mix(laptopTopRightX, destX, moveP)
          const bcy = mix(laptopTopY, destY, moveP)
          const br  = mix(26, destR, moveP)
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

        {/* Phone — all screen content as children so overlay bridge inherits it */}
        <g opacity={hidePhone ? 0 : 1}>
          <BauhausPhone cx={phoneLocalCx} cy={phoneLocalCy} scale={phoneW / 60}>
            {/* White screen — slides up to reveal, slides back down when pair is tapped */}
            {(() => {
              const screenOpacity = screenSlideP * (1 - screenExitP)
              if (screenOpacity <= 0) return null
              const enterY = mix(10, 0, easeOutQuad(screenSlideP))
              const exitY  = mix(0, 10, screenExitP)
              // Pair button tap bounce: press down then spring back
              const pairScale = pairClickP < 0.5
                ? mix(1, 0.88, pairClickP / 0.5)
                : mix(0.88, 1.0, (pairClickP - 0.5) / 0.5)
              return (
                <g opacity={screenOpacity} transform={`translate(0 ${enterY + exitY})`}>
                  <rect x={-22} y={-41} width={44} height={86} rx={6} fill="white" />
                  <g transform={`scale(${pairScale})`}>
                    <rect x={-14} y={-3} width={28} height={10} rx={5} fill={palette.bauhaus.red} />
                    <text
                      x={0} y={4}
                      textAnchor="middle"
                      fontSize="7" fontWeight="700"
                      fill="white"
                      fontFamily="var(--font-sans), sans-serif"
                    >
                      Pair
                    </text>
                  </g>
                </g>
              )
            })()}
            {/* Credential shapes — staggered pop-in with bounce on dark screen */}
            {shape0P > 0 && (
              <g transform={`translate(-12 2) scale(${Math.max(0, easeOutBack(shape0P))})`}>
                <circle r={6} fill={palette.bauhaus.blue} />
              </g>
            )}
            {shape1P > 0 && (
              <g transform={`translate(0 0) scale(${Math.max(0, easeOutBack(shape1P))})`}>
                <polygon points="0,-7 5.5,3.5 -5.5,3.5" fill={palette.bauhaus.yellow} />
              </g>
            )}
            {shape2P > 0 && (
              <g transform={`translate(12 0) scale(${Math.max(0, easeOutBack(shape2P))})`}>
                <rect x={-6} y={-6} width={12} height={12} rx={1.5} fill={palette.bauhaus.red} />
              </g>
            )}
          </BauhausPhone>
        </g>

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
