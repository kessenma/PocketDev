/**
 * Fixed-position laptop overlay that bridges the transition between
 * the HeroScrollSequence and HowPocketDevWorksSection (ConsoleSetupStage).
 *
 * Activates when heroProgress >= 1.0 — at that exact frame the hero zoom
 * is complete and the hero is still sticky. The hero hides its own laptop
 * (hideLaptop prop) and this overlay takes over at the identical position.
 * When the hero later unsticks and scrolls away, this overlay (fixed, z-20)
 * stays pinned and morphs the laptop toward ConsoleSetup's initial pose.
 *
 * Uses the same explainerPose calculation as PersistentLaptopOverlay.
 */
import { useEffect, useState } from 'react'
import { palette } from '@pocketdev/shared/theme'
import { BauhausLaptop } from '../../sections/HowPocketDevWorks/shared/BauhausLaptop'
import { architectureFonts } from '../../shared/theme'

const SCREEN_TEXT = 'rgba(255,255,255,0.88)'
const SCREEN_TEXT_DIM = 'rgba(255,255,255,0.5)'
const INTRO_LINE = 'to get started:'
const INSTALL_LINE = 'install the PocketDev agent on your server'

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function revealByProgress(text: string, progress: number) {
  const count = Math.round(clamp(progress, 0, 1) * text.length)
  return text.slice(0, count)
}

function trimByProgress(text: string, progress: number) {
  const keep = Math.round((1 - clamp(progress, 0, 1)) * text.length)
  return text.slice(0, keep)
}

// ---------------------------------------------------------------------------
// Pose types & helpers — mirror PersistentLaptopOverlay
// ---------------------------------------------------------------------------

type Pose = { cx: number; cy: number; scale: number }

/**
 * Hero's final laptop pose — the camera zoom lands the laptop at viewport
 * center with effective scale = layout.laptop.scale * maxZoomScale.
 * These values match HeroScene.tsx's camera zoom end state.
 */
function heroEndPose(vpW: number, vpH: number, isDesktop: boolean): Pose {
  const laptopScale = isDesktop ? 0.65 : 0.5
  const maxZoomScale = isDesktop ? 5.5 : 3.5
  return {
    cx: vpW / 2,
    cy: vpH * (isDesktop ? 0.52 : 0.42),
    scale: laptopScale * maxZoomScale,
  }
}

/**
 * Map a viewBox point to viewport pixel coordinates for an explainer stage.
 * Copied from PersistentLaptopOverlay to stay in sync.
 */
function explainerPose(
  vbCx: number,
  vbCy: number,
  laptopScale: number,
  viewBox: { w: number; h: number },
  vpW: number,
  vpH: number,
): Pose {
  const panelPad = 24
  const articlePad = vpW >= 640 ? 20 : 16
  const innerPad = vpW >= 640 ? 16 : 12
  const cardW = Math.min(vpW - panelPad * 2, 1152)
  const stageW = cardW - (articlePad + innerPad) * 2
  const stageH = Math.max(540, vpH * 0.86)

  const vbScale = Math.min(stageW / viewBox.w, stageH / viewBox.h)
  const renderedW = viewBox.w * vbScale
  const renderedH = viewBox.h * vbScale

  const titleAreaH = 100
  const cardH = (articlePad + innerPad) * 2 + stageH + titleAreaH
  const cardTop = (vpH - cardH) / 2
  const stageTop = cardTop + articlePad + innerPad
  const stageLeft = (vpW - stageW) / 2

  const svgOffsetX = (stageW - renderedW) / 2
  const svgOffsetY = (stageH - renderedH) / 2

  return {
    cx: stageLeft + svgOffsetX + vbCx * vbScale,
    cy: stageTop + svgOffsetY + vbCy * vbScale,
    scale: laptopScale * vbScale,
  }
}

/** ConsoleSetupStage initial laptop pose (at progress=0): scale 0.7, cy=170, cx=210 in 420×320 */
function consoleStartPose(vpW: number, vpH: number): Pose {
  return explainerPose(210, 170, 0.7, { w: 420, h: 320 }, vpW, vpH)
}

export function HeroLaptopOverlay({
  heroProgress,
  howItWorksRef,
}: {
  heroProgress: number
  howItWorksRef: React.RefObject<HTMLDivElement | null>
}) {
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })
  const [isDesktop, setIsDesktop] = useState(false)
  const [slideProgress, setSlideProgress] = useState(0)
  const [hiwSticking, setHiwSticking] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Track when HowItWorks has started sticking (overlay should hide)
  // and compute slide interpolation through the gap
  useEffect(() => {
    if (typeof window === 'undefined') return

    const onScroll = () => {
      const hiw = howItWorksRef.current
      if (!hiw) return
      const hiwRect = hiw.getBoundingClientRect()

      // HowItWorks sticks when its top reaches viewport top
      setHiwSticking(hiwRect.top <= 0)

      // Slide progress through the gap: hiwRect.top goes from some
      // positive value down to 0 as the user scrolls into the gap
      if (hiwRect.top > 0 && hiwRect.top < vpSize.h) {
        setSlideProgress(clamp(1 - hiwRect.top / vpSize.h, 0, 1))
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [howItWorksRef, vpSize.h])

  // Visible when hero zoom is complete and HowItWorks hasn't started sticking
  const visible = heroProgress >= 1.0 && !hiwSticking

  if (!visible) return null

  // Interpolate from hero's final laptop pose to ConsoleSetup initial pose
  const from = heroEndPose(vpSize.w, vpSize.h, isDesktop)
  const to = consoleStartPose(vpSize.w, vpSize.h)
  const eased = 1 - (1 - slideProgress) * (1 - slideProgress) // easeOut

  const pose: Pose = {
    cx: mix(from.cx, to.cx, eased),
    cy: mix(from.cy, to.cy, eased),
    scale: mix(from.scale, to.scale, eased),
  }

  // Keep the terminal content visible through most of the bridge, then clear it
  // before the overlay disappears so the next scene can start from a blank screen.
  const contentOpacity = 1 - clamp((eased - 0.92) / 0.08, 0, 1)

  const text1TypeP = clamp(eased / 0.25, 0, 1) // 0→0.25
  const text2TypeP = clamp((eased - 0.2) / 0.25, 0, 1) // 0.2→0.45
  const clearP = clamp((eased - 0.72) / 0.14, 0, 1) // 0.72→0.86
  const blankP = clamp((eased - 0.86) / 0.06, 0, 1) // 0.86→0.92

  const text1Reveal = clearP > 0
    ? trimByProgress(INTRO_LINE, clearP)
    : revealByProgress(INTRO_LINE, text1TypeP)
  const text2Reveal = clearP > 0
    ? trimByProgress(INSTALL_LINE, clearP)
    : revealByProgress(INSTALL_LINE, text2TypeP)

  const showCursor = text1Reveal.length > 0 || text2Reveal.length > 0 || blankP > 0
  const cursorY = text2Reveal.length > 0 ? -84 : -96
  const cursorX = text2Reveal.length > 0
    ? -74 + text2Reveal.length * 3.15
    : -74 + text1Reveal.length * 3.9

  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 20 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
        className="block h-full w-full"
        aria-hidden="true"
      >
        <BauhausLaptop cx={pose.cx} cy={pose.cy} scale={pose.scale}>
          <circle cx={-74} cy={-112} r={3} fill={palette.bauhaus.red} />
          <circle cx={-63} cy={-112} r={3} fill={palette.bauhaus.yellow} />
          <circle cx={-52} cy={-112} r={3} fill={palette.bauhaus.blue} />

          {/* Hero install content — fades out during transition */}
          <g opacity={contentOpacity}>
            {text1Reveal.length > 0 && (
              <text
                x={-74}
                y={-96}
                textAnchor="start"
                dominantBaseline="hanging"
                fontFamily={architectureFonts.mono}
                fontSize={isDesktop ? 6.5 : 6}
                fontWeight="400"
                letterSpacing="0.02em"
                fill={SCREEN_TEXT_DIM}
              >
                {text1Reveal}
              </text>
            )}
            {text2Reveal.length > 0 && (
              <text
                x={-74}
                y={-84}
                textAnchor="start"
                dominantBaseline="hanging"
                fontFamily={architectureFonts.mono}
                fontSize={isDesktop ? 5.2 : 4.8}
                fontWeight="500"
                fill={SCREEN_TEXT}
              >
                {text2Reveal}
              </text>
            )}
            {showCursor && (
              <rect
                x={cursorX}
                y={cursorY - 5}
                width={isDesktop ? 3.5 : 3}
                height={isDesktop ? 7 : 6}
                fill="rgba(255,255,255,0.96)"
                opacity={blankP > 0 ? 1 - blankP * 0.35 : 1}
              />
            )}
          </g>
        </BauhausLaptop>
      </svg>
    </div>
  )
}
