/**
 * Persistent overlay that renders shared assets (laptop, blue circle) in
 * viewport-space above the sliding ScrollTimeline track.
 *
 * Scene indices after port-security was inserted at index 2:
 *   0  console-setup
 *   1  connect
 *   2  port-security  ← no blue circle; no overlay bridging adjacent to this scene
 *   3  setup
 *   4  repo-clone
 *   5  env-injection
 *   6  remote-ai
 *   7  task-flow
 *   8  mobile-ai-task-call
 *   9  push-notifications
 *
 * - Slide 0→1: Laptop + blue circle bridge ConsoleSetup → Connect.
 * - Slide 1→2: Phone + blue circle bridge Connect → PortSecurity.
 * - Slide 2→3: Blue circle bridges PortSecurity (right of doors) → Setup start.
 * - Slide 3→4: Blue circle bridges Setup → RepoClone.
 * - Slide 4→5: Blue circle bridges RepoClone → EnvInjection.
 * - Slide 5→6: Blue circle bridges EnvInjection → RemoteAi.
 * - Scene 5 active: Overlay owns the circle throughout EnvInjection.
 */
import { palette } from '@pocketdev/shared/theme'
import { architectureFonts } from '../../../shared/theme'
import { BauhausLaptop } from './BauhausLaptop'
import { BauhausPhone } from './BauhausPhone'
import type { SceneRange } from '../timeline-types'
import { sceneProgress } from '../timeline-utils'

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function easeOut(t: number) {
  return 1 - (1 - t) * (1 - t)
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

// ---------------------------------------------------------------------------
// ViewBox → viewport mapping for explainer stages
// ---------------------------------------------------------------------------

type Pose = { cx: number; cy: number; scale: number }

function explainerToViewport(
  vbX: number,
  vbY: number,
  viewBox: { w: number; h: number },
  vpW: number,
  vpH: number,
): { x: number; y: number; vbScale: number } {
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
    x: stageLeft + svgOffsetX + vbX * vbScale,
    y: stageTop + svgOffsetY + vbY * vbScale,
    vbScale,
  }
}

function explainerPose(
  vbCx: number,
  vbCy: number,
  laptopScale: number,
  viewBox: { w: number; h: number },
  vpW: number,
  vpH: number,
): Pose {
  const { x, y, vbScale } = explainerToViewport(vbCx, vbCy, viewBox, vpW, vpH)
  return { cx: x, cy: y, scale: laptopScale * vbScale }
}

// ---------------------------------------------------------------------------
// Laptop poses (scene 0→1)
// ---------------------------------------------------------------------------

const CONSOLE_VB = { w: 420, h: 320 }

function consoleEndLaptopPose(vpW: number, vpH: number): Pose {
  return explainerPose(210, 200, 1.42, CONSOLE_VB, vpW, vpH)
}

function connectLaptopPose(vpW: number, vpH: number, isDesktop: boolean): Pose {
  const animScale = Math.min(vpW, vpH) / 320
  const laptopLocalCx = isDesktop ? -50 : 0
  const laptopLocalCy = isDesktop ? 0 : -40
  const laptopScale = isDesktop ? 0.62 : 0.56
  return {
    cx: vpW / 2 + laptopLocalCx * animScale,
    cy: vpH * (isDesktop ? 0.42 : 0.40) + laptopLocalCy * animScale,
    scale: laptopScale * animScale,
  }
}

// ---------------------------------------------------------------------------
// Blue circle poses (scene 0→1)
// ---------------------------------------------------------------------------

type CirclePose = { cx: number; cy: number; r: number }

/** Circle at right side of laptop where the scene leaves it at hold end */
function consoleCircleEndPose(vpW: number, vpH: number): CirclePose {
  // Matches scene's end state: laptop-local (120, -65) at laptopScale=1.42
  const laptopCx = 210
  const laptopCy = 200
  const laptopScale = 1.42
  const cx = laptopCx + 120 * laptopScale
  const cy = laptopCy + (-65) * laptopScale
  const r = 28 * laptopScale // matches scene's final circleR=28
  const { x, y, vbScale } = explainerToViewport(cx, cy, CONSOLE_VB, vpW, vpH)
  return { cx: x, cy: y, r: r * vbScale }
}

/** Circle at start of Connect scene (near laptop top-right) */
function connectCircleStartPose(vpW: number, vpH: number, isDesktop: boolean): CirclePose {
  const animScale = Math.min(vpW, vpH) / 320
  const laptopLocalCx = isDesktop ? -50 : 0
  const laptopLocalCy = isDesktop ? 0 : -40
  const laptopScale = isDesktop ? 0.62 : 0.56
  const animCenterX = vpW / 2
  const animCenterY = vpH * 0.42
  // Circle starts at laptop top-right
  const bcx = laptopLocalCx + 70 * laptopScale
  const bcy = laptopLocalCy - 100 * laptopScale
  return {
    cx: animCenterX + bcx * animScale,
    cy: animCenterY + bcy * animScale,
    r: 26 * animScale,
  }
}

// ---------------------------------------------------------------------------
// Phone poses (scene 1→2)  Connect phone → PortSecurity phone
// ---------------------------------------------------------------------------

/** Phone at the end of the Connect scene (to the right, paired with laptop) */
function connectPhoneEndPose(vpW: number, vpH: number, isDesktop: boolean): Pose {
  const animScale = Math.min(vpW, vpH) / 320
  const localCx = isDesktop ? 80 : 0
  const localCy = isDesktop ? -6 : 80
  return {
    cx: vpW / 2 + localCx * animScale,
    cy: vpH * (isDesktop ? 0.42 : 0.40) + localCy * animScale,
    scale: (52 / 60) * animScale,
  }
}

/** Phone at the start of the PortSecurity scene — same position as Connect end state */
function portSecurityPhoneStartPose(vpW: number, vpH: number, isDesktop: boolean): Pose {
  const animScale = Math.min(vpW, vpH) / 320
  const localCx = isDesktop ? 80 : 0
  const localCy = isDesktop ? -6 : 80
  return {
    cx: vpW / 2 + localCx * animScale,
    cy: vpH * (isDesktop ? 0.42 : 0.40) + localCy * animScale,
    scale: (52 / 60) * animScale,
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Blue circle poses (scene 2→3)  PortSecurity end → Setup start
// ---------------------------------------------------------------------------

/**
 * Circle at end of PortSecurity — glides to local (100, 0), right of center,
 * so the overlay carries it left into the Setup funnel matching the panel slide direction.
 */
function portSecurityCircleEndPose(vpW: number, vpH: number, isDesktop: boolean): CirclePose {
  const animScale = Math.min(vpW, vpH) / 320
  return {
    cx: vpW / 2 + 100 * animScale,
    cy: vpH * (isDesktop ? 0.42 : 0.40),
    r: 26 * animScale,
  }
}

/** Circle at start of Setup scene — at funnel entry position */
function setupCircleStartPose(vpW: number, vpH: number, isDesktop: boolean): CirclePose {
  const animScale = Math.min(vpW, vpH) / 320
  return {
    cx: vpW / 2,
    cy: vpH * (isDesktop ? 0.42 : 0.40) + 60 * animScale,
    r: 52 * animScale,
  }
}

// ---------------------------------------------------------------------------
// Blue circle poses (scene 3→4)  Setup → RepoClone
// ---------------------------------------------------------------------------

/** Circle at end of Setup scene — at funnel position (160, 160), back to base size after absorb */
function setupCircleEndPose(vpW: number, vpH: number, isDesktop: boolean): CirclePose {
  const animScale = Math.min(vpW, vpH) / 320
  const animCenterX = vpW / 2
  const animCenterY = vpH * (isDesktop ? 0.42 : 0.40)
  return {
    cx: animCenterX,
    cy: animCenterY + 60 * animScale,
    r: 52 * animScale, // CIRCLE_R — circleScale returns to 1 after absorb
  }
}

/** Circle at start of RepoClone scene — at (160, 184) r=42 */
function repoCloneCircleStartPose(vpW: number, vpH: number, isDesktop: boolean): CirclePose {
  const animScale = Math.min(vpW, vpH) / 320
  const animCenterX = vpW / 2
  const animCenterY = vpH * (isDesktop ? 0.42 : 0.40)
  // RepoClone uses same transform: translate(animCenterX - 160*scale, animCenterY - 100*scale) scale(scale)
  // Circle at (160, 184):
  // viewport cx = animCenterX
  // viewport cy = animCenterY + (184 - 100)*scale = animCenterY + 84*scale
  return {
    cx: animCenterX,
    cy: animCenterY + 84 * animScale,
    r: 42 * animScale,
  }
}

// ---------------------------------------------------------------------------
// Blue circle poses (scene 3→4)
// ---------------------------------------------------------------------------

/** Circle at end of RepoClone — same position as start, circle doesn't move */
function repoCloneCircleEndPose(vpW: number, vpH: number, isDesktop: boolean): CirclePose {
  return repoCloneCircleStartPose(vpW, vpH, isDesktop)
}

/** Circle at start of EnvInjection scene — entering from the left on the center line. */
function envInjectionCircleStartPose(vpW: number, vpH: number, isDesktop: boolean): CirclePose {
  const vbW = 960
  const vbH = 1200
  const s = Math.max(vpW / vbW, vpH / vbH)
  const offsetX = (vpW - vbW * s) / 2
  const offsetY = (vpH - vbH * s) / 2

  return {
    cx: -180 * s + offsetX,
    cy: (isDesktop ? 620 : 640) * s + offsetY,
    r: (isDesktop ? 146 : 156) * s,
  }
}

/** Circle at end of EnvInjection scene — settled in the center after interception. */
function envInjectionCircleEndPose(vpW: number, vpH: number, isDesktop: boolean): CirclePose {
  const vbW = 960
  const vbH = 1200
  const s = Math.max(vpW / vbW, vpH / vbH)
  const offsetX = (vpW - vbW * s) / 2
  const offsetY = (vpH - vbH * s) / 2

  return {
    cx: 480 * s + offsetX,
    cy: (isDesktop ? 620 : 640) * s + offsetY,
    r: (isDesktop ? 146 : 156) * s,
  }
}

function envInjectionCirclePose(
  vpW: number,
  vpH: number,
  isDesktop: boolean,
  progress: number,
): CirclePose {
  const start = envInjectionCircleStartPose(vpW, vpH, isDesktop)
  const end = envInjectionCircleEndPose(vpW, vpH, isDesktop)
  const travel = clamp(progress / 0.64, 0, 1)
  return {
    cx: mix(start.cx, end.cx, travel),
    cy: mix(start.cy, end.cy, travel),
    r: mix(start.r, end.r, travel),
  }
}

/**
 * Circle at start of RemoteAi scene — left of the phone.
 * RemoteAi uses viewBox (1200×1200 or 750×1200) with xMidYMid slice,
 * so we need to map its viewBox coords to viewport pixels.
 */
function remoteAiCircleStartPose(vpW: number, vpH: number, isDesktop: boolean): CirclePose {
  const vbW = isDesktop ? 1200 : 750
  const vbH = 1200
  // xMidYMid slice: scale = max(scaleX, scaleY)
  const scaleX = vpW / vbW
  const scaleY = vpH / vbH
  const s = Math.max(scaleX, scaleY)
  const offsetX = (vpW - vbW * s) / 2
  const offsetY = (vpH - vbH * s) / 2

  const centerX = vbW / 2
  const textCenterY = vbH * 0.38
  const textBottomY = textCenterY + (isDesktop ? 132 : 84)
  const circleCenterY = textBottomY + (isDesktop ? 120 : 90)

  // Circle starts left of phone
  const circleStartX = centerX - (isDesktop ? 100 : 70)

  return {
    cx: circleStartX * s + offsetX,
    cy: circleCenterY * s + offsetY,
    r: 60 * s,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PersistentTransitionOverlay({
  railProgress,
  ranges,
  vpSize,
  isDesktopLayout,
}: {
  railProgress: number
  ranges: SceneRange[]
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
}) {
  const range0 = ranges[0]
  const range1 = ranges[1] // connect
  const range2 = ranges[2] // port-security
  const range3 = ranges[3] // setup
  const range4 = ranges[4] // repo-clone
  const range5 = ranges[5] // env-injection
  if (!range0) return null

  // --- Slide 0→1: Laptop + blue circle (ConsoleSetup → Connect) ---
  const inSlide0 = railProgress > range0.holdEnd && railProgress <= range0.end
  const slideP0 = inSlide0
    ? clamp((railProgress - range0.holdEnd) / (range0.end - range0.holdEnd), 0, 1)
    : 0
  const slideEased0 = easeOut(slideP0)

  let circlePose: CirclePose | null = null
  if (inSlide0) {
    const from = consoleCircleEndPose(vpSize.w, vpSize.h)
    const to = connectCircleStartPose(vpSize.w, vpSize.h, isDesktopLayout)
    circlePose = {
      cx: mix(from.cx, to.cx, slideEased0),
      cy: mix(from.cy, to.cy, slideEased0),
      r: mix(from.r, to.r, slideEased0),
    }
  }

  let laptopPose: Pose | null = null
  if (inSlide0) {
    const from = consoleEndLaptopPose(vpSize.w, vpSize.h)
    const to = connectLaptopPose(vpSize.w, vpSize.h, isDesktopLayout)
    laptopPose = {
      cx: mix(from.cx, to.cx, slideEased0),
      cy: mix(from.cy, to.cy, slideEased0),
      scale: mix(from.scale, to.scale, slideEased0),
    }
  }

  // --- Slide 1→2: Phone + laptop (Connect → PortSecurity) ---
  // Starts at the door preroll threshold (Connect p=0.82) and ends exactly at range1.end.
  // The panel is fully centred at range1.end so the handoff to scene 3 is position-exact
  // and no overlap extension is needed (which would cause z-order conflicts with the door).
  const doorStart1 = range1 ? range1.start + 0.82 * (range1.end - range1.start) : Infinity
  const inSlide1 = range1 && railProgress > doorStart1 && railProgress <= range1.end
  // slideP1 only measures the horizontal panel portion (holdEnd→end) for position interpolation.
  // During preroll, slideP1=0 which is fine since both poses are identical.
  const slideP1 = inSlide1 && range1 && range1.end > range1.holdEnd
    ? clamp((railProgress - range1.holdEnd) / (range1.end - range1.holdEnd), 0, 1)
    : 0
  const slideEased1 = easeOut(slideP1)

  let phonePose: Pose | null = null
  let phoneOverlayOpacity = 1

  if (inSlide1) {
    const from = connectPhoneEndPose(vpSize.w, vpSize.h, isDesktopLayout)
    const to = portSecurityPhoneStartPose(vpSize.w, vpSize.h, isDesktopLayout)
    phonePose = {
      cx: mix(from.cx, to.cx, slideEased1),
      cy: mix(from.cy, to.cy, slideEased1),
      scale: mix(from.scale, to.scale, slideEased1),
    }
    // Scenes hide their own laptops during this slide; overlay laptop stays solid at the
    // fixed position so only one laptop is ever visible as the panels scroll by.
    laptopPose = connectLaptopPose(vpSize.w, vpSize.h, isDesktopLayout)
  }

  // --- Slide 2→3: Phone fade-out + blue circle bridge (PortSecurity → Setup) ---
  const inSlide2 = range2 && railProgress > range2.holdEnd && railProgress <= range2.end
  const slideP2 = inSlide2
    ? clamp((railProgress - range2.holdEnd) / (range2.end - range2.holdEnd), 0, 1)
    : 0

  if (inSlide2) {
    // Circle bridges PortSecurity end → Setup start
    const from = portSecurityCircleEndPose(vpSize.w, vpSize.h, isDesktopLayout)
    const to = setupCircleStartPose(vpSize.w, vpSize.h, isDesktopLayout)
    circlePose = {
      cx: mix(from.cx, to.cx, slideP2),
      cy: mix(from.cy, to.cy, slideP2),
      r: mix(from.r, to.r, slideP2),
    }
    // Phone stays at its PortSecurity position and fades out
    phonePose = portSecurityPhoneStartPose(vpSize.w, vpSize.h, isDesktopLayout)
    phoneOverlayOpacity = 1 - easeOut(slideP2)
  }

  // --- Slide 3→4: Setup → RepoClone (circle only) ---
  const inSlide3 = range3 && railProgress > range3.holdEnd && railProgress <= range3.end
  const slideP3 = inSlide3
    ? clamp((railProgress - range3.holdEnd) / (range3.end - range3.holdEnd), 0, 1)
    : 0

  if (inSlide3) {
    const from = setupCircleEndPose(vpSize.w, vpSize.h, isDesktopLayout)
    const to = repoCloneCircleStartPose(vpSize.w, vpSize.h, isDesktopLayout)
    circlePose = {
      cx: mix(from.cx, to.cx, slideP3),
      cy: mix(from.cy, to.cy, slideP3),
      r: mix(from.r, to.r, slideP3),
    }
  }

  // --- Slide 4→5: RepoClone → EnvInjection (circle only) ---
  const inSlide4 = range4 && railProgress > range4.holdEnd && railProgress <= range4.end
  const slideP4 = inSlide4
    ? clamp((railProgress - range4.holdEnd) / (range4.end - range4.holdEnd), 0, 1)
    : 0

  if (inSlide4) {
    const from = repoCloneCircleEndPose(vpSize.w, vpSize.h, isDesktopLayout)
    const to = envInjectionCircleStartPose(vpSize.w, vpSize.h, isDesktopLayout)
    circlePose = {
      cx: mix(from.cx, to.cx, slideP4),
      cy: mix(from.cy, to.cy, slideP4),
      r: mix(from.r, to.r, slideP4),
    }
  }

  // --- Slide 5→6: EnvInjection → RemoteAi (circle only) ---
  const inSlide5 = range5 && railProgress > range5.holdEnd && railProgress <= range5.end
  const slideP5 = inSlide5
    ? clamp((railProgress - range5.holdEnd) / (range5.end - range5.holdEnd), 0, 1)
    : 0

  if (inSlide5) {
    const from = envInjectionCircleEndPose(vpSize.w, vpSize.h, isDesktopLayout)
    const to = remoteAiCircleStartPose(vpSize.w, vpSize.h, isDesktopLayout)
    circlePose = {
      cx: mix(from.cx, to.cx, slideP5),
      cy: mix(from.cy, to.cy, slideP5),
      r: mix(from.r, to.r, slideP5),
    }
  }

  // --- Scene 5 (EnvInjection) active: overlay owns the circle throughout ---
  const envSceneActive = range5 && railProgress >= range5.start && railProgress <= range5.end
  const envSceneProgress = envSceneActive && range5
    ? sceneProgress(railProgress, range5)
    : 0

  if (!circlePose && envSceneActive && range5) {
    circlePose = envInjectionCirclePose(vpSize.w, vpSize.h, isDesktopLayout, envSceneProgress)
  }

  // --- Overlay door: falls purely vertically in viewport space (Connect → PortSecurity) ---
  // The door is driven by the same preroll window as scene 2's text exit (p=0.82→1.0).
  // By rendering it in the overlay (not inside the sliding panel) the drop is axis-aligned.
  // Stops exactly at range1.end so scene 3 picks it up at the resting position.
  const DOOR_W  = 120
  const DOOR_H  = 210
  const HINGE_X_D = DOOR_W / 2   // 60
  const FREE_X_D  = -HINGE_X_D   // -60 (closed, cosA=1)

  let doorOverlayVpY: number | null = null
  let doorOverlayVpX = 0
  let doorOverlayScale = 1
  if (range1 && railProgress > range1.start) {
    const doorPreviewStart = range1.start + 0.82 * (range1.end - range1.start)
    const doorPreviewDur   = range1.end - doorPreviewStart
    const doorPreviewP     = doorPreviewDur > 0
      ? clamp((railProgress - doorPreviewStart) / doorPreviewDur, 0, 1)
      : 0

    if (doorPreviewP > 0 && railProgress <= range1.end) {
      const laptopCx = isDesktopLayout ? -50 : 0
      const laptopCy = isDesktopLayout ? 0 : -40
      const s        = Math.min(vpSize.w, vpSize.h) / 320
      const aCY      = vpSize.h * (isDesktopLayout ? 0.42 : 0.40)

      doorOverlayScale = s
      doorOverlayVpX   = vpSize.w / 2 + laptopCx * s
      const vpYFinal   = aCY + laptopCy * s
      const vpYStart   = (laptopCy - DOOR_H / 2 - 10) * s   // above viewport top
      doorOverlayVpY   = mix(vpYStart, vpYFinal, easeInOut(doorPreviewP))
    }
  }

  // Nothing to render
  if (!circlePose && !laptopPose && !phonePose && doorOverlayVpY === null) return null

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
      className="absolute inset-0 block h-full w-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {/* Circle renders BEFORE phone/laptop so it paints behind them */}
      {circlePose && (
        <circle
          cx={circlePose.cx}
          cy={circlePose.cy}
          r={Math.max(circlePose.r, 0.1)}
          fill={palette.bauhaus.blue}
          opacity={envSceneActive ? 1 : 0.96}
        />
      )}
      {/* Laptop — renders before phone and door so they paint on top of it */}
      {laptopPose && (
        <g>
        <BauhausLaptop cx={laptopPose.cx} cy={laptopPose.cy} scale={laptopPose.scale}>
          {/* Traffic light dots */}
          <circle cx={-74} cy={-112} r={3} fill={palette.bauhaus.red} />
          <circle cx={-63} cy={-112} r={3} fill={palette.bauhaus.yellow} />
          <circle cx={-52} cy={-112} r={3} fill={palette.bauhaus.blue} />

          {/* Dashboard chrome — matches ConsoleSetupStage end / ConnectStage start */}
          <rect x={-78} y={-112} width={156} height={18} rx={4} fill="rgba(255,255,255,0.06)" />
          <rect x={-72} y={-109} width={12} height={12} rx={3} fill={palette.bauhaus.yellow} />
          <rect x={-56} y={-108} width={40} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={-56} y={-103} width={24} height={2.5} rx={1} fill="rgba(255,255,255,0.25)" />
          <rect x={20} y={-108} width={18} height={6} rx={3} fill={palette.bauhaus.yellow} opacity={0.7} />
          <rect x={42} y={-108} width={14} height={6} rx={3} fill={palette.bauhaus.blue} opacity={0.5} />

          {/* Left card — Pairing */}
          <rect x={-78} y={-88} width={74} height={66} rx={6} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
          <text x={-70} y={-78} fontFamily="var(--font-sans), sans-serif" fontSize="4.5" fontWeight="600" fill="rgba(255,255,255,0.6)">Pairing</text>

          {/* Right card — Devices */}
          <rect x={2} y={-88} width={74} height={66} rx={6} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
          <text x={10} y={-78} fontFamily="var(--font-sans), sans-serif" fontSize="4.5" fontWeight="600" fill="rgba(255,255,255,0.6)">Devices</text>
          {[0, 1, 2].map((i) => (
            <g key={`device-${i}`}>
              <rect x={10} y={-70 + i * 16} width={58} height={12} rx={4} fill="rgba(255,255,255,0.04)" />
              <circle cx={18} cy={-64 + i * 16} r={3} fill={i === 0 ? palette.bauhaus.blue : 'rgba(255,255,255,0.15)'} />
              <rect x={24} y={-66 + i * 16} width={i === 0 ? 30 : 20 + i * 4} height={3} rx={1.5} fill={i === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'} />
            </g>
          ))}

          {/* Console label */}
          <text x={0} y={-17} textAnchor="middle" fontFamily={architectureFonts.body} fontSize="5" letterSpacing="0.16em" fill="rgba(255,255,255,0.5)">
            SERVER CONTROL BOARD
          </text>
        </BauhausLaptop>
        </g>
      )}
      {/* Door — renders before phone so phone always paints on top of it */}
      {doorOverlayVpY !== null && (
        <g transform={`translate(${doorOverlayVpX} ${doorOverlayVpY})`}>
          <g transform={`scale(${doorOverlayScale})`}>
            <line
              x1={HINGE_X_D} y1={-DOOR_H / 2 - 20}
              x2={HINGE_X_D} y2={DOOR_H / 2 + 20}
              stroke="rgba(255,255,255,0.14)" strokeWidth="4"
            />
            <polygon
              points={`${FREE_X_D},${-DOOR_H / 2} ${HINGE_X_D},${-DOOR_H / 2} ${HINGE_X_D},${DOOR_H / 2} ${FREE_X_D},${DOOR_H / 2}`}
              fill={palette.bauhaus.red}
            />
            <polygon
              points={`${FREE_X_D},${-DOOR_H / 2} ${HINGE_X_D},${-DOOR_H / 2} ${HINGE_X_D},${DOOR_H / 2} ${FREE_X_D},${DOOR_H / 2}`}
              fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2"
            />
            {[-50, 0, 50].map((dy) => (
              <line key={dy} x1={FREE_X_D + 6} y1={dy} x2={HINGE_X_D - 6} y2={dy}
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
            ))}
            {[0.25, 0.75].map((frac, i) => (
              <circle key={i} cx={HINGE_X_D} cy={-DOOR_H / 2 + DOOR_H * frac} r={3.5}
                fill="rgba(255,255,255,0.20)" />
            ))}
            <circle cx={FREE_X_D + (HINGE_X_D - FREE_X_D) * 0.14} cy={4} r={4.5}
              fill="rgba(255,255,255,0.22)" />
            <text
              x={0}
              y={-18}
              textAnchor="middle"
              fontFamily={architectureFonts.mono}
              fontSize="7"
              fontWeight="600"
              letterSpacing="0.12em"
              fill="rgba(255,255,255,0.75)"
            >
              LOCK THE PORT
            </text>
          </g>
        </g>
      )}
      {/* Phone — renders last so it always paints in front of the door */}
      {phonePose && (
        <g opacity={phoneOverlayOpacity}>
          <BauhausPhone cx={phonePose.cx} cy={phonePose.cy} scale={phonePose.scale}>
            {/* Same credential shapes shown on phone at end of Connect scene */}
            <circle cx={-12} cy={2} r={6} fill={palette.bauhaus.blue} />
            <polygon points="0,-7 5.5,3.5 -5.5,3.5" fill={palette.bauhaus.yellow} />
            <rect x={6} y={-6} width={12} height={12} rx={1.5} fill={palette.bauhaus.red} />
          </BauhausPhone>
        </g>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Utility for scenes to know when to hide their own assets
// ---------------------------------------------------------------------------

export function shouldHideLaptop(
  sceneIndex: number,
  railProgress: number,
  ranges: SceneRange[],
): boolean {
  const range0 = ranges[0]
  const range1 = ranges[1]
  if (!range0) return false

  // Shared threshold: overlay takes over at the same moment the door preroll starts
  const doorStart1 = range1 ? range1.start + 0.82 * (range1.end - range1.start) : Infinity

  // Scene 0 (ConsoleSetup): hide during slide-out to Connect
  if (sceneIndex === 0) {
    return railProgress > range0.holdEnd && railProgress <= range0.end
  }

  // Scene 1 (Connect): hide during 0→1 slide AND from door preroll through 1→2 slide end
  if (sceneIndex === 1) {
    if (railProgress > range0.holdEnd && railProgress <= range0.end) return true
    if (range1 && railProgress > doorStart1 && railProgress <= range1.end) return true
  }

  // Scene 2 (PortSecurity): hide from door preroll through 1→2 slide end
  if (sceneIndex === 2) {
    if (range1 && railProgress > doorStart1 && railProgress <= range1.end) return true
    return false
  }

  return false
}

/** True when the overlay is rendering the phone — scene should hide its own */
export function shouldHidePhone(
  sceneIndex: number,
  railProgress: number,
  ranges: SceneRange[],
): boolean {
  const range1 = ranges[1] // connect
  const range2 = ranges[2] // port-security
  // Shared threshold: same moment the door preroll starts (Connect p=0.82)
  const doorStart1 = range1 ? range1.start + 0.82 * (range1.end - range1.start) : Infinity
  // Extended window: from door preroll through end of 1→2 slide
  if (range1 && (sceneIndex === 1 || sceneIndex === 2)) {
    if (railProgress > doorStart1 && railProgress <= range1.end) return true
  }
  // Slide 2→3 (PortSecurity → Setup): overlay fades phone out; scene 2 hides its own
  if (range2 && sceneIndex === 2) {
    if (railProgress > range2.holdEnd && railProgress <= range2.end) return true
  }
  return false
}

/** True when the overlay is rendering the blue circle — scene should hide its own */
export function shouldHideBlueCircle(
  sceneIndex: number,
  railProgress: number,
  ranges: SceneRange[],
): boolean {
  const range0 = ranges[0]
  const range1 = ranges[1]
  const range2 = ranges[2] // port-security
  const range3 = ranges[3] // setup
  const range4 = ranges[4] // repo-clone
  const range5 = ranges[5] // env-injection

  // Slide 0→1 (ConsoleSetup → Connect): scenes 0 and 1 hide their circles
  if (sceneIndex === 0 || sceneIndex === 1) {
    if (railProgress > range0.holdEnd && railProgress <= range0.end) return true
  }

  // Slide 1→2 (Connect → PortSecurity): connect (1) hides its circle.
  // Port-security (2) also hides its circle so the overlay bridge lands cleanly.
  if (range1 && (sceneIndex === 1 || sceneIndex === 2)) {
    if (railProgress > range1.holdEnd && railProgress <= range1.end) return true
  }

  // Slide 2→3 (PortSecurity → Setup): overlay bridges port-security's circle to setup.
  // Both scenes hide their own circles.
  if (range2 && (sceneIndex === 2 || sceneIndex === 3)) {
    if (railProgress > range2.holdEnd && railProgress <= range2.end) return true
  }

  // Slide 3→4 (Setup → RepoClone): scenes 3 and 4 hide their circles
  if (range3 && (sceneIndex === 3 || sceneIndex === 4)) {
    if (railProgress > range3.holdEnd && railProgress <= range3.end) return true
  }

  // Slide 4→5 (RepoClone → EnvInjection): scenes 4 and 5 hide their circles
  if (range4 && (sceneIndex === 4 || sceneIndex === 5)) {
    if (railProgress > range4.holdEnd && railProgress <= range4.end) return true
  }

  // Scene 5 (EnvInjection): overlay owns the circle throughout the entire scene
  if (range5 && sceneIndex === 5) {
    if (railProgress >= range5.start && railProgress <= range5.end) return true
  }

  // Slide 5→6 (EnvInjection → RemoteAi): scenes 5 and 6 hide their circles
  if (range5 && (sceneIndex === 5 || sceneIndex === 6)) {
    if (railProgress > range5.holdEnd && railProgress <= range5.end) return true
  }

  return false
}

/**
 * True when the overlay is rendering the door in viewport space — scene 3 should
 * hide its own door so only one door is visible (the vertically-falling overlay one).
 * Covers the slide window where the panel moves horizontally.
 */
export function shouldHideDoor(
  sceneIndex: number,
  railProgress: number,
  ranges: SceneRange[],
): boolean {
  const range1 = ranges[1] // connect
  if (sceneIndex === 2 && range1) {
    if (railProgress > range1.holdEnd && railProgress <= range1.end) return true
  }
  return false
}
