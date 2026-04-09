import { useEffect, useId, useState } from 'react'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens } from '../../../shared/theme'
import { BauhausFace, spiralPath } from '../shared/BauhausFace'

type Point = { x: number; y: number }
type LaneSpec = {
  key: string
  color: string
  p0: Point
  p1: Point
  p2: Point
  p3: Point
  cards: Array<{ start: number; size: number; accent: 'dot' | 'square' | 'bar' }>
}

export function MobileAiTaskCallScene({
  progress,
  isDesktopLayout,
}: {
  progress: number
  isDesktopLayout: boolean
}) {
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })
  const faceClipId = useId()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const bg = architectureTokens.colors.blue
  const ink = '#ffffff'
  const cardPaper = '#f8f2e3'
  const framePadX = isDesktopLayout ? vpSize.w * 0.08 : vpSize.w * 0.08
  const framePadTop = vpSize.h * 0.11
  const framePadBottom = vpSize.h * 0.11

  const titleX = framePadX
  const titleY = framePadTop - (isDesktopLayout ? 28 : 18)
  const titleSize = isDesktopLayout ? Math.min(vpSize.w * 0.024, 36) : Math.min(vpSize.w * 0.05, 26)
  const footerSize = isDesktopLayout ? Math.min(vpSize.w * 0.016, 20) : Math.min(vpSize.w * 0.03, 14)

  const braidReveal = easeOut(segmentProgress(progress, 0.08, 0.34))
  const faceReveal = easeOut(segmentProgress(progress, 0.22, 0.46))
  const streamReveal = easeOut(segmentProgress(progress, 0.42, 0.64))
  const cardFlow = segmentProgress(progress, 0.5, 1)
  const spiralSpin = segmentProgress(progress, 0.32, 1)
  const spiralRotation = spiralSpin * 720

  const face = {
    x: isDesktopLayout ? vpSize.w * 0.34 : vpSize.w * 0.5,
    y: isDesktopLayout ? vpSize.h * 0.53 : vpSize.h * 0.3,
    scale: isDesktopLayout ? 6.2 : 3.9,
    clipW: isDesktopLayout ? vpSize.w * 0.31 : vpSize.w * 0.42,
    clipH: isDesktopLayout ? vpSize.h * 0.76 : vpSize.h * 0.26,
  }
  const faceClipLeft = face.x - face.clipW / 2
  const faceClipTop = face.y - face.clipH / 2
  const outputOrigin = {
    x: face.x + (isDesktopLayout ? 34 : 26),
    y: face.y + (isDesktopLayout ? 6 : 4),
  }

  const lanes = buildLanes(vpSize.w, vpSize.h, isDesktopLayout, outputOrigin)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ backgroundColor: bg }}
    >
      <rect width="100%" height="100%" fill={bg} />

      <circle
        cx={vpSize.w * 0.18}
        cy={vpSize.h * 0.16}
        r={Math.min(vpSize.w, vpSize.h) * 0.12}
        fill="#60a5fa"
        opacity="0.18"
      />
      <circle
        cx={vpSize.w * 0.84}
        cy={vpSize.h * 0.22}
        r={Math.min(vpSize.w, vpSize.h) * 0.16}
        fill="#1d4ed8"
        opacity="0.22"
      />

      <line
        x1={framePadX}
        y1={framePadTop}
        x2={vpSize.w - framePadX}
        y2={framePadTop}
        stroke={ink}
        strokeWidth={isDesktopLayout ? 4 : 3}
      />
      <line
        x1={framePadX}
        y1={vpSize.h - framePadBottom}
        x2={vpSize.w - framePadX}
        y2={vpSize.h - framePadBottom}
        stroke={ink}
        strokeWidth={isDesktopLayout ? 4 : 3}
      />

      <text
        x={titleX}
        y={titleY}
        fill={ink}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={titleSize}
        fontWeight="600"
        letterSpacing={isDesktopLayout ? '0.34em' : '0.22em'}
      >
        THEN YOUR TASK STARTS
      </text>

      <defs>
        <clipPath id={faceClipId}>
          {Array.from({ length: 5 }, (_, index) => {
            const local = easeOut(segmentProgress(faceReveal, index * 0.1, 0.46 + index * 0.1))
            const stripGap = face.clipH * 0.04
            const stripH = (face.clipH - stripGap * 4) / 5
            const y = faceClipTop + index * (stripH + stripGap)
            return (
              <rect
                key={index}
                x={faceClipLeft}
                y={y}
                width={face.clipW * local}
                height={stripH}
                rx={stripH * 0.18}
              />
            )
          })}
        </clipPath>
      </defs>

      <g clipPath={`url(#${faceClipId})`}>
        <BauhausFace
          cx={face.x}
          cy={face.y}
          scale={face.scale}
          pulseColor={spiralSpin > 0 ? palette.bauhaus.yellow : faceReveal < 0.72 ? palette.bauhaus.yellow : palette.bauhaus.blue}
          fillColor="#ffffff"
          spiralRotation={spiralRotation}
        />
      </g>

      <BraidedThought
        progress={braidReveal}
        face={face}
        vpSize={vpSize}
        isDesktopLayout={isDesktopLayout}
      />

      {lanes.map((lane, laneIndex) => (
        <g key={lane.key}>
          <path
            d={cubicPath(lane.p0, lane.p1, lane.p2, lane.p3)}
            fill="none"
            stroke={ink}
            strokeWidth={isDesktopLayout ? 6 : 4}
            strokeLinecap="round"
            opacity={0.14 + streamReveal * 0.18}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - streamReveal}
          />
          <path
            d={cubicPath(lane.p0, lane.p1, lane.p2, lane.p3)}
            fill="none"
            stroke={lane.color}
            strokeWidth={isDesktopLayout ? 2.5 : 2}
            strokeLinecap="round"
            opacity={streamReveal * 0.82}
            pathLength={1}
            strokeDasharray="0.18 1"
            strokeDashoffset={1 - streamReveal * (0.8 + laneIndex * 0.06)}
          />

          {lane.cards.map((card, cardIndex) => {
            const travel = easeInOut(segmentProgress(cardFlow, card.start, Math.min(1, card.start + 0.36)))
            if (travel <= 0) return null
            const point = cubicPoint(lane.p0, lane.p1, lane.p2, lane.p3, travel)
            const scale = mix(0.78, 1, easeOut(travel))
            const opacity = Math.min(1, travel * 2.2)
            return (
              <TaskCard
                key={`${lane.key}-${cardIndex}`}
                x={point.x}
                y={point.y}
                scale={scale * card.size}
                opacity={opacity}
                color={lane.color}
                accent={card.accent}
                isDesktopLayout={isDesktopLayout}
                paper={cardPaper}
              />
            )
          })}
        </g>
      ))}

      <text
        x={framePadX}
        y={vpSize.h - framePadBottom + (isDesktopLayout ? 54 : 34)}
        fill={ink}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={footerSize}
        letterSpacing={isDesktopLayout ? '0.18em' : '0.12em'}
        opacity="0.75"
      >
        ON THE GO
      </text>

      {spiralSpin > 0 && (() => {
        const svgScale = 0.05 * face.scale
        const sCx = face.x + 150 * svgScale
        const sCy = face.y - 250 * svgScale
        const sMaxR = 50 * svgScale
        const sStroke = 6 * svgScale
        return (
          <g transform={`rotate(${spiralRotation} ${sCx} ${sCy})`}>
            <path
              d={spiralPath(sCx, sCy, 3.5, sMaxR)}
              fill="none"
              stroke={palette.bauhaus.yellow}
              strokeWidth={sStroke}
              strokeLinecap="round"
            />
          </g>
        )
      })()}
    </svg>
  )
}

function braidStrandPath(
  spine: Point[],
  strandIndex: number,
  strandCount: number,
  amplitude: number,
  frequency: number,
): string {
  // Sample points along the polyline spine, offset perpendicular with a sine wave
  // Each strand has a phase offset so they weave over/under each other
  const phase = (strandIndex / strandCount) * Math.PI * 2
  const samples = 64
  const pts: Point[] = []

  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    // Find position along spine
    const totalLen = spine.length - 1
    const seg = Math.min(Math.floor(t * totalLen), totalLen - 1)
    const localT = t * totalLen - seg
    const px = spine[seg].x + (spine[seg + 1].x - spine[seg].x) * localT
    const py = spine[seg].y + (spine[seg + 1].y - spine[seg].y) * localT

    // Tangent direction
    const dx = spine[seg + 1].x - spine[seg].x
    const dy = spine[seg + 1].y - spine[seg].y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    // Normal (perpendicular)
    const nx = -dy / len
    const ny = dx / len

    // Taper amplitude at start and end for clean convergence
    const taper = Math.sin(t * Math.PI)
    const wave = Math.sin(t * Math.PI * 2 * frequency + phase) * amplitude * taper

    pts.push({ x: px + nx * wave, y: py + ny * wave })
  }

  // Build smooth path using cubic bezier through points (Catmull-Rom to Bezier)
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function BraidedThought({
  progress,
  face,
  vpSize,
  isDesktopLayout,
}: {
  progress: number
  face: { x: number; y: number }
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
}) {
  const start = {
    x: isDesktopLayout ? -vpSize.w * 0.12 : -vpSize.w * 0.16,
    y: isDesktopLayout ? vpSize.h * 0.74 : vpSize.h * 0.7,
  }
  const mid1 = {
    x: vpSize.w * 0.08,
    y: isDesktopLayout ? vpSize.h * 0.88 : vpSize.h * 0.84,
  }
  const mid2 = {
    x: vpSize.w * 0.16,
    y: isDesktopLayout ? vpSize.h * 0.82 : vpSize.h * 0.78,
  }
  const mid3 = {
    x: face.x - (isDesktopLayout ? 210 : 118),
    y: face.y + (isDesktopLayout ? 118 : 74),
  }
  const faceIn = {
    x: face.x - (isDesktopLayout ? 10 : 8),
    y: face.y + (isDesktopLayout ? 4 : 2),
  }

  const spine = [start, mid1, mid2, mid3, faceIn]
  const strandReveal = easeOut(segmentProgress(progress, 0, 0.76))

  const amplitude = isDesktopLayout ? 18 : 12
  const frequency = isDesktopLayout ? 3.5 : 3
  const baseWidth = isDesktopLayout ? 3.2 : 2.2

  const strands = [
    { color: '#dbeafe', opacity: 0.88, width: baseWidth * 1.1, speed: 0.98 },
    { color: palette.bauhaus.yellow, opacity: 0.78, width: baseWidth, speed: 0.92 },
    { color: palette.bauhaus.red, opacity: 0.72, width: baseWidth * 0.95, speed: 0.86 },
    { color: '#93c5fd', opacity: 0.65, width: baseWidth * 0.85, speed: 0.80 },
    { color: palette.bauhaus.yellow, opacity: 0.6, width: baseWidth * 0.8, speed: 0.74 },
  ] as const

  return (
    <g>
      {strands.map((strand, i) => {
        const d = braidStrandPath(spine, i, strands.length, amplitude, frequency)
        return (
          <path
            key={`strand-${i}`}
            d={d}
            fill="none"
            stroke={strand.color}
            strokeWidth={strand.width}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - strandReveal * strand.speed}
            opacity={strand.opacity}
          />
        )
      })}
    </g>
  )
}

function TaskCard({
  x,
  y,
  scale,
  opacity,
  color,
  accent,
  isDesktopLayout,
  paper,
}: {
  x: number
  y: number
  scale: number
  opacity: number
  color: string
  accent: 'dot' | 'square' | 'bar'
  isDesktopLayout: boolean
  paper: string
}) {
  const w = (isDesktopLayout ? 112 : 82) * scale
  const h = (isDesktopLayout ? 42 : 32) * scale
  const r = h * 0.28
  const accentSize = h * 0.22
  const left = x - w / 2
  const top = y - h / 2

  return (
    <g opacity={opacity}>
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx={r}
        fill={paper}
        stroke="#0f172a"
        strokeWidth={2}
      />
      <rect
        x={left + h * 0.26}
        y={y - h * 0.14}
        width={w * 0.46}
        height={h * 0.13}
        rx={999}
        fill="#0f172a"
        opacity="0.9"
      />
      <rect
        x={left + h * 0.26}
        y={y + h * 0.03}
        width={w * 0.3}
        height={h * 0.1}
        rx={999}
        fill="#475569"
        opacity="0.62"
      />

      {accent === 'dot' && (
        <circle
          cx={left + w - h * 0.32}
          cy={y}
          r={accentSize}
          fill={color}
        />
      )}
      {accent === 'square' && (
        <rect
          x={left + w - h * 0.54}
          y={y - accentSize}
          width={accentSize * 2}
          height={accentSize * 2}
          rx={accentSize * 0.5}
          fill={color}
        />
      )}
      {accent === 'bar' && (
        <rect
          x={left + w - h * 0.72}
          y={y - accentSize * 0.7}
          width={accentSize * 2.6}
          height={accentSize * 1.4}
          rx={accentSize * 0.7}
          fill={color}
        />
      )}
    </g>
  )
}

function buildLanes(width: number, height: number, isDesktopLayout: boolean, origin: Point): LaneSpec[] {
  if (isDesktopLayout) {
    return [
      {
        key: 'thinking',
        color: palette.bauhaus.yellow,
        p0: origin,
        p1: { x: width * 0.5, y: height * 0.3 },
        p2: { x: width * 0.68, y: height * 0.24 },
        p3: { x: width * 0.9, y: height * 0.18 },
        cards: [
          { start: 0.02, size: 0.94, accent: 'dot' },
          { start: 0.18, size: 1, accent: 'bar' },
          { start: 0.34, size: 0.9, accent: 'square' },
        ],
      },
      {
        key: 'active',
        color: palette.bauhaus.blue,
        p0: origin,
        p1: { x: width * 0.5, y: height * 0.46 },
        p2: { x: width * 0.7, y: height * 0.58 },
        p3: { x: width * 0.9, y: height * 0.48 },
        cards: [
          { start: 0.1, size: 1.04, accent: 'square' },
          { start: 0.28, size: 0.92, accent: 'dot' },
          { start: 0.46, size: 1, accent: 'bar' },
        ],
      },
      {
        key: 'decision',
        color: palette.bauhaus.red,
        p0: origin,
        p1: { x: width * 0.5, y: height * 0.62 },
        p2: { x: width * 0.72, y: height * 0.72 },
        p3: { x: width * 0.9, y: height * 0.82 },
        cards: [
          { start: 0.18, size: 0.92, accent: 'bar' },
          { start: 0.38, size: 1, accent: 'square' },
          { start: 0.56, size: 0.9, accent: 'dot' },
        ],
      },
    ]
  }

  return [
    {
      key: 'thinking',
      color: palette.bauhaus.yellow,
      p0: origin,
      p1: { x: width * 0.68, y: height * 0.32 },
      p2: { x: width * 0.8, y: height * 0.3 },
      p3: { x: width * 0.9, y: height * 0.22 },
      cards: [
        { start: 0.04, size: 0.9, accent: 'dot' },
        { start: 0.22, size: 0.96, accent: 'bar' },
      ],
    },
    {
      key: 'active',
      color: palette.bauhaus.blue,
      p0: origin,
      p1: { x: width * 0.68, y: height * 0.46 },
      p2: { x: width * 0.8, y: height * 0.56 },
      p3: { x: width * 0.9, y: height * 0.48 },
      cards: [
        { start: 0.14, size: 1, accent: 'square' },
        { start: 0.34, size: 0.9, accent: 'dot' },
      ],
    },
    {
      key: 'decision',
      color: palette.bauhaus.red,
      p0: origin,
      p1: { x: width * 0.68, y: height * 0.62 },
      p2: { x: width * 0.8, y: height * 0.72 },
      p3: { x: width * 0.9, y: height * 0.8 },
      cards: [
        { start: 0.26, size: 0.9, accent: 'bar' },
        { start: 0.48, size: 0.94, accent: 'square' },
      ],
    },
  ]
}

function cubicPath(p0: Point, p1: Point, p2: Point, p3: Point) {
  return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t
  const x =
    mt * mt * mt * p0.x +
    3 * mt * mt * t * p1.x +
    3 * mt * t * t * p2.x +
    t * t * t * p3.x
  const y =
    mt * mt * mt * p0.y +
    3 * mt * mt * t * p1.y +
    3 * mt * t * t * p2.y +
    t * t * t * p3.y
  return { x, y }
}

function cubicAngle(p0: Point, p1: Point, p2: Point, p3: Point, t: number) {
  const mt = 1 - t
  const dx =
    3 * mt * mt * (p1.x - p0.x) +
    6 * mt * t * (p2.x - p1.x) +
    3 * t * t * (p3.x - p2.x)
  const dy =
    3 * mt * mt * (p1.y - p0.y) +
    6 * mt * t * (p2.y - p1.y) +
    3 * t * t * (p3.y - p2.y)
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

function segmentProgress(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0
  return Math.max(0, Math.min(1, (value - start) / (end - start)))
}

function easeOut(value: number) {
  return 1 - (1 - value) * (1 - value)
}

function easeInOut(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}
