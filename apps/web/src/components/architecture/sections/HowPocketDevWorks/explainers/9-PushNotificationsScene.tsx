import { useEffect, useState } from 'react'
import { palette } from '@pocketdev/shared/theme'
import { wrapTextToLines } from '../../../shared/pretext-measure'
import { architectureTokens } from '../../../shared/theme'
import { BauhausPhone } from '../shared/BauhausPhone'

export function PushNotificationsScene({
  progress,
  isDesktopLayout,
}: {
  progress: number
  isDesktopLayout: boolean
}) {
  const [vpSize, setVpSize] = useState({ w: 1280, h: 860 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const taskBuild = easeOut(segmentProgress(progress, 0.06, 0.34))
  const taskComplete = easeOut(segmentProgress(progress, 0.22, 0.44))
  const eyeOpen = easeOut(segmentProgress(progress, 0.34, 0.58))
  const irisReveal = easeOut(segmentProgress(progress, 0.44, 0.66))
  const signalTravel = easeInOut(segmentProgress(progress, 0.58, 0.8))
  const cardReveal = easeOut(segmentProgress(progress, 0.74, 0.92))
  const settle = easeOut(segmentProgress(progress, 0.88, 1))

  // ── Title ─────────────────────────────────────────────────────────────────
  const TITLE_TEXT = 'Push Notifications; for plan and task completion, when permissions are required, when issues arise.'
  const titleX = isDesktopLayout ? vpSize.w * 0.07 : vpSize.w * 0.08
  const eyebrowY = vpSize.h * 0.1
  const titleY = isDesktopLayout ? vpSize.h * 0.19 : vpSize.h * 0.16
  const titleSize = isDesktopLayout
    ? Math.min(vpSize.w * 0.047, 64)
    : Math.min(vpSize.w * 0.096, 46)
  const titleLH = titleSize * 1.12
  const titleMaxWidth = vpSize.w * (isDesktopLayout ? 0.45 : 0.84)

  const titleLines = wrapTextToLines(
    TITLE_TEXT,
    `700 ${titleSize}px var(--font-sans), sans-serif`,
    titleMaxWidth,
    titleLH,
  )

  // ── Eye ───────────────────────────────────────────────────────────────────
  // Sits between the text block and the phone — where the signal starts.
  const eyeWidth = isDesktopLayout ? Math.min(vpSize.w * 0.31, 380) : Math.min(vpSize.w * 0.52, 280)
  const eyeHeight = isDesktopLayout ? Math.min(vpSize.h * 0.18, 180) : Math.min(vpSize.w * 0.24, 120)
  const eyeScaleY = mix(0, 1, eyeOpen)

  // eye.cy is fixed — the text below it pushes down as the eye opens
  const eye = {
    cx: isDesktopLayout ? vpSize.w * 0.32 : vpSize.w * 0.5,
    cy: isDesktopLayout ? vpSize.h * 0.52 : vpSize.h * 0.54,
    width: eyeWidth,
    height: eyeHeight,
  }

  // How far lines below eye.cy get pushed down
  const pushDown = eyeHeight * eyeScaleY

  // ── Phone ─────────────────────────────────────────────────────────────────
  const phone = {
    cx: isDesktopLayout ? vpSize.w * 0.76 : vpSize.w * 0.5,
    cy: isDesktopLayout ? vpSize.h * 0.57 : vpSize.h * 0.82,
    scale: isDesktopLayout ? Math.min(vpSize.w / 1280, 1) * 3.25 : Math.min(vpSize.w / 390, 1) * 2.9,
  }

  const signalStart = {
    x: eye.cx + eye.width * 0.34,
    y: eye.cy + eye.height * 0.06,
  }
  const signalEnd = {
    x: phone.cx - 42 * phone.scale,
    y: phone.cy - 12 * phone.scale,
  }
  const control1 = {
    x: signalStart.x + (isDesktopLayout ? 120 : 42),
    y: signalStart.y - (isDesktopLayout ? 92 : 10),
  }
  const control2 = {
    x: signalEnd.x - (isDesktopLayout ? 120 : 42),
    y: signalEnd.y - (isDesktopLayout ? 80 : 70),
  }
  const signalToken = cubicPoint(signalStart, control1, control2, signalEnd, signalTravel)

  const inPhoneCardY = mix(8, -18, cardReveal)
  const notificationLift = mix(18, 0, cardReveal)
  const notificationScale = mix(0.86, 1, cardReveal)
  const phoneScreenGlow = 0.08 + taskBuild * 0.08 + settle * 0.1
  const accentColor = settle > 0.22 ? '#93c5fd' : palette.bauhaus.yellow
  const taskLineWidths = [
    mix(0, 19, taskBuild),
    mix(0, 14, Math.max(0, taskBuild - 0.12) / 0.88),
    mix(0, 26, taskComplete),
    mix(0, 20, Math.max(0, taskComplete - 0.16) / 0.84),
  ]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ backgroundColor: architectureTokens.colors.blue }}
    >
      <rect width="100%" height="100%" fill={architectureTokens.colors.blue} />

      <circle
        cx={vpSize.w * 0.16}
        cy={vpSize.h * 0.16}
        r={Math.min(vpSize.w, vpSize.h) * 0.13}
        fill="#60a5fa"
        opacity="0.18"
      />
      <circle
        cx={vpSize.w * 0.82}
        cy={vpSize.h * 0.18}
        r={Math.min(vpSize.w, vpSize.h) * 0.16}
        fill="#1d4ed8"
        opacity="0.24"
      />

      <text
        x={titleX}
        y={eyebrowY}
        fill="#dbeafe"
        fontFamily="var(--font-sans), sans-serif"
        fontSize={isDesktopLayout ? Math.min(vpSize.w * 0.014, 20) : Math.min(vpSize.w * 0.036, 16)}
        letterSpacing="0.22em"
        opacity="0.86"
      >
        --WITH OPT-IN
      </text>

      {/* Title text — lines below eye.cy push down as the eye opens */}
      {titleLines.map((line, i) => {
        const naturalY = titleY + (i + 1) * titleLH
        const lineY = naturalY < eye.cy ? naturalY : naturalY + pushDown
        return (
          <text
            key={i}
            x={titleX}
            y={lineY}
            fill="#ffffff"
            fontFamily="var(--font-sans), sans-serif"
            fontSize={titleSize}
            fontWeight="700"
            letterSpacing="-0.04em"
          >
            {line}
          </text>
        )
      })}

      {/* Eye */}
      <g
        transform={`translate(${eye.cx} ${eye.cy}) scale(1 ${Math.max(eyeScaleY, 0.0001)})`}
        opacity={eyeOpen > 0 ? 1 : 0}
      >
        <path
          d={almondPath(eye.width, eye.height)}
          fill="#f8f2e3"
          stroke={palette.bauhaus.black}
          strokeWidth={isDesktopLayout ? 6 : 4}
          strokeLinejoin="round"
        />
        <circle
          cx="0"
          cy="0"
          r={(eye.height * 0.29) * irisReveal}
          fill="#8bb8ff"
          opacity={0.35 + irisReveal * 0.65}
        />
        <circle
          cx="0"
          cy="0"
          r={(eye.height * 0.16) * irisReveal}
          fill="#173a70"
        />
        <circle
          cx={eye.height * 0.04}
          cy={-eye.height * 0.05}
          r={(eye.height * 0.045) * irisReveal}
          fill="rgba(255,255,255,0.45)"
        />
      </g>

      {signalTravel > 0 && (
        <path
          d={cubicPath(signalStart, control1, control2, signalEnd)}
          fill="none"
          stroke={palette.bauhaus.yellow}
          strokeWidth={isDesktopLayout ? 3 : 2.5}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - signalTravel}
          opacity="0.95"
        />
      )}
      {signalTravel > 0 && (
        <g opacity={0.85 + cardReveal * 0.15}>
          <circle
            cx={signalToken.x}
            cy={signalToken.y}
            r={isDesktopLayout ? 11 : 8}
            fill={palette.bauhaus.yellow}
          />
          <circle
            cx={signalToken.x}
            cy={signalToken.y}
            r={isDesktopLayout ? 22 : 16}
            fill={palette.bauhaus.yellow}
            opacity="0.12"
          />
        </g>
      )}

      <g transform={`translate(${phone.cx} ${phone.cy})`}>
        <BauhausPhone cx={0} cy={0} scale={phone.scale}>
          <g opacity={0.35 + taskBuild * 0.65}>
            <rect
              x={-22}
              y={-41}
              width={44}
              height={86}
              rx={6}
              fill={settle > 0.22 ? 'rgba(147,197,253,0.18)' : `rgba(255,255,255,${phoneScreenGlow})`}
            />
            <rect
              x={-18}
              y={-27}
              width={Math.max(0, taskLineWidths[0])}
              height={3}
              rx={1.5}
              fill="rgba(255,255,255,0.48)"
            />
            <rect
              x={-18}
              y={-21}
              width={Math.max(0, taskLineWidths[1])}
              height={3}
              rx={1.5}
              fill="rgba(255,255,255,0.3)"
            />
            <rect
              x={-18}
              y={inPhoneCardY}
              width={36}
              height={22}
              rx={6}
              fill="#f8f2e3"
              opacity={0.45 + cardReveal * 0.55}
            />
            <rect
              x={-18}
              y={inPhoneCardY}
              width={36}
              height={5}
              rx={4}
              fill={accentColor}
              opacity={0.6 + cardReveal * 0.4}
            />
            <circle
              cx={-13}
              cy={inPhoneCardY + 11}
              r={2.5}
              fill={palette.bauhaus.black}
              opacity={0.85}
            />
            <rect x={-8} y={inPhoneCardY + 8} width={19} height={3} rx={1.5} fill="#173a70" />
            <rect x={-8} y={inPhoneCardY + 13} width={14} height={2.5} rx={1.25} fill="#94a3b8" />
            <rect
              x={-18}
              y={inPhoneCardY + 27}
              width={Math.max(0, taskLineWidths[2])}
              height={3}
              rx={1.5}
              fill="rgba(255,255,255,0.42)"
            />
            <rect
              x={-18}
              y={inPhoneCardY + 33}
              width={Math.max(0, taskLineWidths[3])}
              height={3}
              rx={1.5}
              fill="rgba(255,255,255,0.26)"
            />
          </g>
        </BauhausPhone>
      </g>

      {cardReveal > 0 && (
        <g
          transform={`translate(${phone.cx + 10 * phone.scale} ${phone.cy - 40 * phone.scale - notificationLift * phone.scale}) scale(${notificationScale})`}
          opacity={cardReveal}
        >
          <rect
            x={-56}
            y={-18}
            width={112}
            height={36}
            rx={11}
            fill="#f8f2e3"
          />
          <rect
            x={-56}
            y={-18}
            width={112}
            height={7}
            rx={6}
            fill={accentColor}
          />
          <circle cx={-42} cy={0} r={5} fill={palette.bauhaus.black} opacity="0.88" />
          <rect x={-31} y={-5} width={46} height={5} rx={2.5} fill="#173a70" />
          <rect x={-31} y={4} width={34} height={4} rx={2} fill="#94a3b8" />
        </g>
      )}
    </svg>
  )
}

function almondPath(width: number, height: number) {
  const halfW = width / 2
  const halfH = height / 2
  return `M ${-halfW} 0 Q 0 ${-halfH} ${halfW} 0 Q 0 ${halfH} ${-halfW} 0 Z`
}

type Point = { x: number; y: number }

function cubicPath(p0: Point, p1: Point, p2: Point, p3: Point) {
  return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t
  return {
    x:
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x,
    y:
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y,
  }
}

function segmentProgress(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0
  return Math.max(0, Math.min(1, (value - start) / (end - start)))
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeOut(value: number) {
  return 1 - (1 - value) * (1 - value)
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
}
