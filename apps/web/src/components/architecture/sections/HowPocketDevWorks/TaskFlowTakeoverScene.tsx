import { useId, useEffect, useState } from 'react'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens } from '../../shared/theme'

const PROMPT_TEXT = 'why login is getting a 500 error?'
const SUGGESTED_FILES = [
  { label: 'auth/login.ts', color: '#93c5fd' },
  { label: 'middleware/session.ts', color: '#fcd34d' },
  { label: 'routes/api/auth.ts', color: '#fca5a5' },
] as const

export function TaskFlowTakeoverScene({
  progress,
  isDesktopLayout,
}: {
  progress: number
  isDesktopLayout: boolean
}) {
  const clipId = useId()

  const [vpSize, setVpSize] = useState({ w: 840, h: 1280 })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  // Use viewport-based viewBox on all sizes for proper scaling
  const viewBox = `0 0 ${vpSize.w} ${vpSize.h}`

  // Phone: 9:16 ratio, centered horizontally
  // Desktop: smaller phone on the right half
  // Mobile: centered, sized to ~55% of viewport width
  const phoneW = isDesktopLayout
    ? Math.min(vpSize.w * 0.24, 380)
    : Math.min(vpSize.w * 0.55, 340)
  const phoneH = phoneW * (16 / 9)
  const phoneR = Math.round(phoneW * 0.12)
  const phoneX = isDesktopLayout
    ? vpSize.w * 0.58
    : (vpSize.w - phoneW) / 2
  const phoneY = isDesktopLayout
    ? vpSize.h * 0.1
    : vpSize.h * 0.28
  const phone = { x: phoneX, y: phoneY, width: phoneW, height: phoneH, radius: phoneR }

  // Timeline
  const typing = segmentProgress(progress, 0.0, 0.35)
  const scanPress = easeOut(segmentProgress(progress, 0.35, 0.55))
  const chipReveal = easeOut(segmentProgress(progress, 0.5, 0.85))

  const typedLength = Math.max(0, Math.min(PROMPT_TEXT.length, Math.round(PROMPT_TEXT.length * typing)))
  const typedPrompt = PROMPT_TEXT.slice(0, typedLength)

  const pad = Math.round(phoneW * 0.065)
  const innerW = phone.width - pad * 2
  const fs = phoneW / 360

  const headerH = Math.round(62 * fs)
  const promptTop = phone.y + headerH + pad
  const promptH = Math.round(100 * fs)
  const scanTop = promptTop + promptH + pad
  const scanH = Math.round(48 * fs)
  const suggestTop = scanTop + scanH + pad

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      className="block h-full w-full"
      style={{ backgroundColor: architectureTokens.colors.blue }}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={phone.x}
            y={phone.y}
            width={phone.width}
            height={phone.height}
            rx={phone.radius}
          />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="100%" height="100%" fill={architectureTokens.colors.blue} />
      <circle
        cx={vpSize.w * 0.22}
        cy={vpSize.h * 0.13}
        r={Math.min(vpSize.w, vpSize.h) * 0.12}
        fill="#60a5fa"
        opacity="0.24"
      />
      <circle
        cx={vpSize.w * 0.82}
        cy={vpSize.h * 0.2}
        r={Math.min(vpSize.w, vpSize.h) * 0.14}
        fill="#1d4ed8"
        opacity="0.26"
      />

      {/* Copy */}
      <TaskFlowCopy
        isDesktopLayout={isDesktopLayout}
        phoneBottom={phone.y + phone.height}
        vpW={vpSize.w}
        vpH={vpSize.h}
      />

      {/* Phone */}
      <g>
        <rect
          x={phone.x}
          y={phone.y}
          width={phone.width}
          height={phone.height}
          rx={phone.radius}
          fill={palette.bauhaus.black}
        />
        <rect
          x={phone.x + phone.width * 0.34}
          y={phone.y + Math.round(14 * fs)}
          width={phone.width * 0.32}
          height={Math.round(20 * fs)}
          rx={Math.round(10 * fs)}
          fill="rgba(255,255,255,0.08)"
        />

        <g clipPath={`url(#${clipId})`}>
          <rect
            x={phone.x}
            y={phone.y}
            width={phone.width}
            height={phone.height}
            fill="#f8fafc"
          />

          {/* Header */}
          <rect
            x={phone.x}
            y={phone.y}
            width={phone.width}
            height={headerH}
            fill="#eff6ff"
          />
          <text
            x={phone.x + pad}
            y={phone.y + headerH * 0.62}
            fill="#0f172a"
            fontFamily="var(--font-sans), sans-serif"
            fontSize={Math.round(22 * fs)}
            fontWeight="700"
          >
            New task
          </text>

          {/* Prompt input */}
          <rect
            x={phone.x + pad}
            y={promptTop}
            width={innerW}
            height={promptH}
            rx={Math.round(18 * fs)}
            fill="#ffffff"
            stroke="#bfdbfe"
            strokeWidth="2"
          />
          <text
            x={phone.x + pad + Math.round(14 * fs)}
            y={promptTop + Math.round(26 * fs)}
            fill="#94a3b8"
            fontFamily="var(--font-sans), sans-serif"
            fontSize={Math.round(12 * fs)}
            fontWeight="600"
          >
            Prompt
          </text>
          <text
            x={phone.x + pad + Math.round(14 * fs)}
            y={promptTop + Math.round(52 * fs)}
            fill="#0f172a"
            fontFamily="var(--font-sans), sans-serif"
            fontSize={Math.round(14 * fs)}
            fontWeight="600"
          >
            {typedPrompt || ' '}
          </text>
          {typing > 0 && typing < 1 && (
            <rect
              x={phone.x + pad + Math.round(14 * fs)}
              y={promptTop + Math.round(58 * fs)}
              width={innerW * 0.6 * typing}
              height={Math.round(2.5 * fs)}
              rx="999"
              fill="#93c5fd"
            />
          )}

          {/* Scan button */}
          <rect
            x={phone.x + pad}
            y={scanTop}
            width={innerW}
            height={scanH}
            rx={Math.round(16 * fs)}
            fill={scanPress > 0.02 ? '#dbeafe' : '#eff6ff'}
            stroke="#60a5fa"
            strokeWidth={2}
            strokeDasharray="8 8"
          />
          <circle
            cx={phone.x + pad + Math.round(20 * fs) + scanPress * (innerW - Math.round(40 * fs))}
            cy={scanTop + scanH / 2}
            r={Math.round(9 * fs)}
            fill="#2563eb"
            opacity={0.12 + scanPress * 0.68}
          />
          <text
            x={phone.x + phone.width / 2}
            y={scanTop + scanH / 2 + Math.round(5 * fs)}
            fill="#1d4ed8"
            fontFamily="var(--font-sans), sans-serif"
            fontSize={Math.round(13 * fs)}
            fontWeight="700"
            textAnchor="middle"
          >
            {scanPress > 0.2 ? 'Scanning files...' : 'Find related files'}
          </text>

          {/* Suggested files */}
          <g opacity={chipReveal}>
            <text
              x={phone.x + pad + Math.round(4 * fs)}
              y={suggestTop + Math.round(16 * fs)}
              fill="#64748b"
              fontFamily="var(--font-sans), sans-serif"
              fontSize={Math.round(12 * fs)}
              fontWeight="600"
            >
              Suggested files
            </text>
            {SUGGESTED_FILES.map((file, i) => {
              const chipY = suggestTop + Math.round((26 + i * 32) * fs)
              const reveal = Math.max(0, Math.min(1, chipReveal * 1.3 - i * 0.2))
              if (reveal <= 0) return null
              return (
                <g key={file.label} opacity={reveal}>
                  <rect
                    x={phone.x + pad}
                    y={chipY}
                    width={innerW}
                    height={Math.round(24 * fs)}
                    rx={Math.round(12 * fs)}
                    fill={file.color}
                    fillOpacity="0.12"
                  />
                  <rect
                    x={phone.x + pad + Math.round(8 * fs)}
                    y={chipY + Math.round(5 * fs)}
                    width={Math.round(14 * fs)}
                    height={Math.round(14 * fs)}
                    rx={4}
                    fill={file.color}
                  />
                  <text
                    x={phone.x + pad + Math.round(28 * fs)}
                    y={chipY + Math.round(16 * fs)}
                    fill="#1e3a8a"
                    fontFamily="var(--font-sans), sans-serif"
                    fontSize={Math.round(11 * fs)}
                    fontWeight="700"
                  >
                    {file.label}
                  </text>
                </g>
              )
            })}
          </g>
        </g>
      </g>
    </svg>
  )
}

function TaskFlowCopy({
  isDesktopLayout,
  phoneBottom,
  vpW,
  vpH,
}: {
  isDesktopLayout: boolean
  phoneBottom: number
  vpW: number
  vpH: number
}) {
  // Title: top-left on desktop, centered-top on mobile
  const titleX = isDesktopLayout ? vpW * 0.06 : vpW * 0.07
  const eyebrowY = vpH * 0.08
  const titleY = isDesktopLayout ? vpH * 0.16 : vpH * 0.13
  const titleSize = isDesktopLayout
    ? Math.min(vpW * 0.046, 66)
    : Math.min(vpW * 0.1, 52)
  const titleLH = Math.round(titleSize * 1.14)

  // Subtitle: below title on desktop, below phone with gap on mobile
  const subX = isDesktopLayout ? titleX : vpW * 0.07
  const subGap = isDesktopLayout ? 24 : vpH * 0.04
  const subY = isDesktopLayout
    ? titleY + titleLH * 3 + subGap
    : phoneBottom + subGap
  const subFontSize = isDesktopLayout
    ? Math.min(vpW * 0.016, 22)
    : Math.min(vpW * 0.042, 20)
  const subLH = Math.round(subFontSize * 1.55)
  const subLines = isDesktopLayout ? 2 : 3
  const modelLinkY = subY + subLH * subLines + Math.round(subFontSize * 1.2)
  const linkFontSize = isDesktopLayout
    ? Math.min(vpW * 0.013, 18)
    : Math.min(vpW * 0.036, 16)

  return (
    <g>
      {/* Eyebrow */}
      <text
        x={titleX}
        y={eyebrowY}
        fill="#dbeafe"
        fontFamily="var(--font-sans), sans-serif"
        fontSize={isDesktopLayout ? Math.min(vpW * 0.014, 20) : Math.min(vpW * 0.038, 18)}
        letterSpacing="0.22em"
        opacity="0.86"
      >
        ON-DEVICE AI FILE CONTEXT
      </text>

      {/* Title */}
      <text
        x={titleX}
        y={titleY}
        fill="#ffffff"
        fontFamily="var(--font-sans), sans-serif"
        fontSize={titleSize}
        fontWeight="700"
        letterSpacing="-0.04em"
      >
        <tspan x={titleX} dy="0">Type a prompt,</tspan>
        <tspan x={titleX} dy={titleLH}>PocketDev finds</tspan>
        <tspan x={titleX} dy={titleLH}>the right files.</tspan>
      </text>

      {/* Subtitle — below phone on mobile, below title on desktop */}
      <text
        x={subX}
        y={subY}
        fill="#bfdbfe"
        fontFamily="var(--font-sans), sans-serif"
        fontSize={subFontSize}
        opacity="0.94"
      >
        {isDesktopLayout ? (
          <>
            <tspan x={subX} dy="0">No @ hunting. A 25 MB embedding model runs on-device</tspan>
            <tspan x={subX} dy={subLH}>and suggests file context in milliseconds.</tspan>
          </>
        ) : (
          <>
            <tspan x={subX} dy="0">No @ hunting. A 25 MB embedding</tspan>
            <tspan x={subX} dy={subLH}>model runs on-device and suggests</tspan>
            <tspan x={subX} dy={subLH}>file context in milliseconds.</tspan>
          </>
        )}
      </text>

      {/* Model link */}
      <a
        href="https://docs.swmansion.com/react-native-executorch/docs/hooks/natural-language-processing/useTextEmbeddings"
        target="_blank"
        rel="noopener noreferrer"
      >
        <text
          x={subX}
          y={modelLinkY}
          fill="#93c5fd"
          fontFamily="var(--font-sans), sans-serif"
          fontSize={linkFontSize}
          fontWeight="600"
          textDecoration="underline"
        >
          Powered by all-MiniLM-L6-v2 via ExecuTorch
        </text>
      </a>
    </g>
  )
}

function segmentProgress(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0
  return Math.max(0, Math.min(1, (value - start) / (end - start)))
}

function easeOut(value: number) {
  return 1 - (1 - value) * (1 - value)
}
