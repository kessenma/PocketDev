import { useEffect, useState } from 'react'
import { palette } from '@pocketdev/shared/theme'

const PAPER = palette.bauhaus.cream

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function easeOut(t: number) {
  return 1 - (1 - t) ** 3
}
function segmentProgress(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0
  return Math.max(0, Math.min(1, (value - start) / (end - start)))
}

export function GrowsToAgentOverlay({
  repoHistoryProgress,
  tridentProgress,
  badgeX,
  badgeY,
}: {
  repoHistoryProgress: number
  tridentProgress: number
  badgeX: number
  badgeY: number
}) {
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const isDesktop = vpSize.w >= 1024

  // Mirror badge grow and exit timing from RepoHistoryTransitionSection exactly
  const growsReveal = easeOut(segmentProgress(repoHistoryProgress, 0.44, 0.78))
  const exitP = easeOut(segmentProgress(repoHistoryProgress, 0.82, 1.0))

  // Radius: grows with badge during reveal, then grows to match TridentBuildScene settledR during exit
  const badgeMinR = isDesktop ? 6 : 5
  const badgeMaxR = isDesktop ? 34 : 29
  const settledR = isDesktop ? 54 : 46  // matches TridentBuildScene settledR exactly
  const r = mix(mix(badgeMinR, badgeMaxR, growsReveal), settledR, exitP)

  // Agent settled position — mirrors TridentBuildScene layout constants
  const agentX = isDesktop ? vpSize.w * 0.32 : vpSize.w * 0.4
  const agentY = isDesktop ? vpSize.h * 0.48 : vpSize.h * 0.52

  // Circle travels full journey (0→100%) during the exit phase
  const cx = mix(badgeX, agentX, exitP)
  const cy = mix(badgeY, agentY, exitP)

  // Text fades out as exit begins
  const textOpacity = 1 - exitP

  // Stay solid (no fade-out) until TridentBuildScene's circle is fully opaque.
  // TridentBuildScene: opacity = clamp(p / 0.08, 0, 1) where p = tridentProgress * 0.786,
  // reaching 1 at tridentProgress ≈ 0.102. We snap off at 0.11 so TridentBuildScene is
  // already at full opacity the moment this overlay disappears — one continuous ball, no blink.
  const isHandedOff = tridentProgress >= 0.11

  // badgeX starts at 0 (uninitialized). Once the section has been in view, badgeX is a
  // non-zero viewport coordinate. We don't check badgeY > 0 because after the section
  // scrolls past, the badge element is above the viewport (badgeY goes negative) — but
  // the circle position uses agentY (via exitP = 1) so it's still correct.
  const show = growsReveal > 0 && badgeX !== 0 && !isHandedOff

  if (!show) return null

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 30 }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
        className="absolute inset-0 block h-full w-full"
        aria-hidden="true"
      >
        <circle cx={cx} cy={cy} r={Math.max(r, 0.1)} fill={palette.bauhaus.blue} />
      </svg>

      {textOpacity > 0 && tridentProgress === 0 && (
        <div
          style={{
            position: 'absolute',
            left: cx - r,
            top: cy - r,
            width: r * 2,
            height: r * 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            color: PAPER,
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: isDesktop ? '0.95rem' : '0.82rem',
            fontWeight: 600,
            letterSpacing: growsReveal > 0.75 ? '0.01em' : '0em',
            opacity: textOpacity,
            userSelect: 'none',
          }}
        >
          grows
        </div>
      )}
    </div>
  )
}
