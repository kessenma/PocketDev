import { useEffect, useState } from 'react'
import { architectureTokens } from '../../../shared/theme'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mapProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

type EnvBar = {
  offset: number
}

const BAR_DEFS: EnvBar[] = [
  { offset: -86 },
  { offset: -52 },
  { offset: -18 },
  { offset: 16 },
  { offset: 50 },
  { offset: 84 },
]

function circleLineExitPoint(
  lineStart: { x: number; y: number },
  unit: { x: number; y: number },
  lineLength: number,
  circle: { x: number; y: number; r: number },
) {
  const relX = circle.x - lineStart.x
  const relY = circle.y - lineStart.y
  const projection = relX * unit.x + relY * unit.y
  const closestX = lineStart.x + unit.x * projection
  const closestY = lineStart.y + unit.y * projection
  const distX = circle.x - closestX
  const distY = circle.y - closestY
  const perpendicularSq = distX * distX + distY * distY

  if (perpendicularSq >= circle.r * circle.r) return null

  const travelInside = Math.sqrt(circle.r * circle.r - perpendicularSq)
  const exitDistance = projection + travelInside
  if (exitDistance <= 0 || exitDistance >= lineLength) return null

  return {
    x: lineStart.x + unit.x * exitDistance,
    y: lineStart.y + unit.y * exitDistance,
  }
}

export function EnvInjectionTakeoverStage({
  progress,
  isDesktopLayout,
  hideBlueCircle = false,
}: {
  progress: number
  isDesktopLayout: boolean
  hideBlueCircle?: boolean
}) {
  const [vpSize, setVpSize] = useState({ w: 840, h: 1280 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const viewBox = `0 0 ${vpSize.w} ${vpSize.h}`

  const vbW = 960
  const vbH = 1200
  const scale = Math.max(vpSize.w / vbW, vpSize.h / vbH)
  const offsetX = (vpSize.w - vbW * scale) / 2
  const offsetY = (vpSize.h - vbH * scale) / 2

  const ballTravel = mapProgress(progress, 0.0, 0.64)
  const barsTravel = mapProgress(progress, 0.34, 0.82)
  const settle = mapProgress(progress, 0.78, 0.94)
  const impactPulse = mapProgress(progress, 0.36, 0.56)

  const ballCx = mix(-180, 480, ballTravel)
  const ballCy = isDesktopLayout ? 620 : 640
  const ballR = isDesktopLayout ? 146 : 156
  const ballScaleX = 1 + impactPulse * 0.045 - settle * 0.02
  const ballScaleY = 1 - impactPulse * 0.06 + settle * 0.025
  const lineLength = isDesktopLayout ? 980 : 1080
  const lineStroke = 16
  const lineAngle = 0.42
  const unit = {
    x: Math.sin(lineAngle),
    y: Math.cos(lineAngle),
  }
  const normal = {
    x: -unit.y,
    y: unit.x,
  }
  const lineCenter = {
    x: isDesktopLayout ? 458 : 432,
    y: isDesktopLayout ? 500 : 520,
  }
  const lineTravel = mix(-1420, 1320, barsTravel)

  const titleX = isDesktopLayout ? vpSize.w * 0.06 : vpSize.w * 0.07
  const titleY = vpSize.h * (isDesktopLayout ? 0.12 : 0.08)
  const titleSize = isDesktopLayout
    ? Math.min(vpSize.w * 0.04, 56)
    : Math.min(vpSize.w * 0.068, 36)
  const subFontSize = isDesktopLayout
    ? Math.min(vpSize.w * 0.015, 20)
    : Math.min(vpSize.w * 0.04, 18)
  const subLH = Math.round(subFontSize * 1.55)
  const subY = vpSize.h * (isDesktopLayout ? 0.88 : 0.8)

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

      <text
        x={titleX}
        y={titleY}
        fill={architectureTokens.colors.text}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={titleSize}
        fontWeight="700"
        letterSpacing="-0.03em"
      >
        <tspan x={titleX} dy="0">Attach environment</tspan>
      </text>

      <text
        x={titleX}
        y={subY}
        fill={architectureTokens.colors.textSecondary}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={subFontSize}
      >
        {isDesktopLayout ? (
          <>
            <tspan x={titleX} dy="0">Per-project env vars stream into the remote workspace before scripts, tasks,</tspan>
            <tspan x={titleX} dy={subLH}>and agent runs. Raw inputs arrive black, then turn blue once PocketDev absorbs them.</tspan>
          </>
        ) : (
          <>
            <tspan x={titleX} dy="0">Per-project env vars stream into the</tspan>
            <tspan x={titleX} dy={subLH}>remote workspace before scripts,</tspan>
            <tspan x={titleX} dy={subLH}>tasks, and agent runs. Raw inputs</tspan>
            <tspan x={titleX} dy={subLH}>arrive black, then turn blue once</tspan>
            <tspan x={titleX} dy={subLH}>PocketDev absorbs them.</tspan>
          </>
        )}
      </text>

      <g transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}>
        {!hideBlueCircle && (
          <>
            <circle
              cx={ballCx}
              cy={ballCy}
              r={ballR + 28}
              fill={architectureTokens.colors.blue}
              opacity={0.12 + impactPulse * 0.08}
            />
            <ellipse
              cx={ballCx}
              cy={ballCy}
              rx={ballR * ballScaleX}
              ry={ballR * ballScaleY}
              fill={architectureTokens.colors.blue}
              opacity={0.96}
            />
          </>
        )}

        {BAR_DEFS.map((bar, index) => {
          const centerX = lineCenter.x + normal.x * bar.offset + unit.x * lineTravel
          const centerY = lineCenter.y + normal.y * bar.offset + unit.y * lineTravel
          const start = {
            x: centerX - unit.x * (lineLength / 2),
            y: centerY - unit.y * (lineLength / 2),
          }
          const end = {
            x: centerX + unit.x * (lineLength / 2),
            y: centerY + unit.y * (lineLength / 2),
          }
          const exitPoint = circleLineExitPoint(start, unit, lineLength, {
            x: ballCx,
            y: ballCy,
            r: ballR,
          })

          return (
            <g key={`${bar.offset}-${index}`}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={architectureTokens.colors.black}
                strokeWidth={lineStroke}
                strokeLinecap="round"
              />
              {exitPoint && (
                <line
                  x1={exitPoint.x}
                  y1={exitPoint.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={architectureTokens.colors.blue}
                  strokeWidth={lineStroke}
                  strokeLinecap="round"
                />
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
