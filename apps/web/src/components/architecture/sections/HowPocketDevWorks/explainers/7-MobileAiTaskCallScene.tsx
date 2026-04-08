import { useEffect, useId, useState } from 'react'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens } from '../../../shared/theme'
import { BauhausFace } from '../shared/BauhausFace'

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

  const face = {
    x: isDesktopLayout ? vpSize.w * 0.34 : vpSize.w * 0.5,
    y: isDesktopLayout ? vpSize.h * 0.53 : vpSize.h * 0.3,
    scale: isDesktopLayout ? 6.2 : 3.9,
    clipW: isDesktopLayout ? vpSize.w * 0.31 : vpSize.w * 0.42,
    clipH: isDesktopLayout ? vpSize.h * 0.62 : vpSize.h * 0.26,
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
        TASK START
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
          pulseColor={faceReveal < 0.72 ? palette.bauhaus.yellow : palette.bauhaus.blue}
          fillColor="#ffffff"
        />
      </g>

      <FaceGuideStrokes
        progress={faceReveal}
        face={face}
        isDesktopLayout={isDesktopLayout}
      />

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
        THOUGHTS BECOME STRUCTURED TASKS
      </text>
    </svg>
  )
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
  const strokeWidth = isDesktopLayout ? 12 : 8
  const start = {
    x: isDesktopLayout ? -vpSize.w * 0.14 : -vpSize.w * 0.18,
    y: isDesktopLayout ? vpSize.h * 0.72 : vpSize.h * 0.68,
  }
  const enter = {
    x: face.x - (isDesktopLayout ? 108 : 68),
    y: face.y + (isDesktopLayout ? 8 : 10),
  }
  const faceIn = {
    x: face.x - (isDesktopLayout ? 10 : 8),
    y: face.y + (isDesktopLayout ? 4 : 2),
  }
  const thoughtPath = `M ${start.x} ${start.y} C ${vpSize.w * 0.12} ${vpSize.h * 0.9}, ${face.x - (isDesktopLayout ? 230 : 130)} ${face.y + (isDesktopLayout ? 132 : 84)}, ${face.x - (isDesktopLayout ? 176 : 100)} ${face.y + (isDesktopLayout ? 28 : 18)} S ${face.x - (isDesktopLayout ? 136 : 80)} ${face.y - (isDesktopLayout ? 46 : 28)}, ${enter.x} ${enter.y}`
  const strandReveal = easeOut(segmentProgress(progress, 0, 0.76))
  const connectorReveal = easeOut(segmentProgress(progress, 0.44, 1))

  return (
    <g>
      <path
        d={thoughtPath}
        fill="none"
        stroke="#dbeafe"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={1 - strandReveal}
        opacity="0.92"
      />
      <path
        d={thoughtPath}
        fill="none"
        stroke={palette.bauhaus.yellow}
        strokeWidth={isDesktopLayout ? 3.5 : 2.5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.14 1"
        strokeDashoffset={1 - strandReveal * 0.92}
        opacity="0.9"
      />
      <path
        d={thoughtPath}
        fill="none"
        stroke={palette.bauhaus.red}
        strokeWidth={isDesktopLayout ? 3.5 : 2.5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.1 1"
        strokeDashoffset={1.16 - strandReveal}
        opacity="0.84"
      />

      <path
        d={`M ${enter.x} ${enter.y} C ${enter.x + vpSize.w * 0.03} ${enter.y - (isDesktopLayout ? 8 : 6)}, ${face.x - (isDesktopLayout ? 36 : 24)} ${face.y - (isDesktopLayout ? 8 : 4)}, ${faceIn.x} ${faceIn.y}`}
        fill="none"
        stroke="#dbeafe"
        strokeWidth={isDesktopLayout ? 10 : 6}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={1 - connectorReveal}
        opacity="0.92"
      />
    </g>
  )
}

function FaceGuideStrokes({
  progress,
  face,
  isDesktopLayout,
}: {
  progress: number
  face: { x: number; y: number; scale: number }
  isDesktopLayout: boolean
}) {
  const strokeWidth = isDesktopLayout ? 7 : 5
  const curves = [
    {
      d: `M ${face.x - 150} ${face.y - 150} C ${face.x - 88} ${face.y - 182}, ${face.x - 42} ${face.y - 160}, ${face.x + 8} ${face.y - 112}`,
      color: palette.bauhaus.yellow,
      delay: 0,
    },
    {
      d: `M ${face.x - 122} ${face.y - 6} C ${face.x - 82} ${face.y - 36}, ${face.x - 38} ${face.y - 22}, ${face.x + 12} ${face.y + 18}`,
      color: palette.bauhaus.red,
      delay: 0.12,
    },
    {
      d: `M ${face.x - 102} ${face.y + 154} C ${face.x - 44} ${face.y + 108}, ${face.x + 16} ${face.y + 88}, ${face.x + 74} ${face.y + 128}`,
      color: palette.bauhaus.blue,
      delay: 0.22,
    },
  ]

  return (
    <g opacity={0.82}>
      {curves.map((curve) => {
        const local = easeOut(segmentProgress(progress, curve.delay, Math.min(1, curve.delay + 0.42)))
        if (local <= 0) return null
        return (
          <path
            key={curve.d}
            d={curve.d}
            fill="none"
            stroke={curve.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - local}
            opacity={0.9}
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
