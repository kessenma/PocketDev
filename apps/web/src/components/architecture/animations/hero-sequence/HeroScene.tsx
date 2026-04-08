import { motion, useReducedMotion } from 'framer-motion'
import { palette, fontFamilyTokens } from '@pocketdev/shared/theme'
import { architectureTheme } from '../../shared/theme'
import { BauhausPhone } from '../../sections/HowPocketDevWorks/shared/BauhausPhone'
import { BauhausLaptop } from '../../sections/HowPocketDevWorks/shared/BauhausLaptop'
import { BauhausFolder } from '../../sections/HowPocketDevWorks/shared/BauhausFolder'
import { BauhausFace } from '../../sections/HowPocketDevWorks/shared/BauhausFace'
import { ParallelPathBundle } from './ParallelPathBundle'
import { HandDrawing } from './HandDrawing'

const blue = palette.bauhaus.blue
const red = palette.bauhaus.red
const yellow = palette.bauhaus.yellow
const black = palette.bauhaus.black
const PAPER = architectureTheme.canvas
const TEXT_SECONDARY = architectureTheme.textSecondary

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function mapProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// --- Pocket SVG paths ---

const POCKET_FILL = `M 120 108 C 118 108, 112 110, 110 116 L 108 140 C 106 180, 104 240, 108 300 C 110 340, 118 370, 130 390 C 145 415, 170 425, 200 428 C 230 430, 260 420, 278 400 C 290 386, 296 365, 298 340 L 302 260 L 304 200 L 306 160 C 307 140, 306 120, 300 112 C 296 108, 290 106, 284 108 Z`

const POCKET_OUTLINE_1 = `M 120 108 C 118 108, 112 110, 110 116 L 108 140 C 106 180, 104 240, 108 300 C 110 340, 118 370, 130 390 C 145 415, 170 425, 200 428 C 230 430, 260 420, 278 400 C 290 386, 296 365, 298 340 L 302 260 L 304 200 L 306 160 C 307 140, 306 120, 300 112 C 296 108, 290 106, 284 108`

const POCKET_OUTLINE_2 = `M 122 110 C 120 110, 114 112, 112 118 L 110 142 C 108 182, 106 242, 110 302 C 112 342, 120 372, 132 392 C 147 417, 172 427, 202 430 C 232 432, 262 422, 280 402 C 292 388, 298 367, 300 342 L 304 262 L 306 202 L 308 162 C 309 142, 308 122, 302 114 C 298 110, 292 108, 286 110`

const WAISTBAND = `M 110 108 L 200 96 L 300 92 L 340 94 L 340 120 L 300 118 L 200 112 L 110 122 Z`

const SEAM_1 = 'M 320 100 C 322 200, 324 300, 320 420 C 318 440, 316 460, 314 480'
const SEAM_2 = 'M 324 100 C 326 200, 328 300, 324 420 C 322 440, 320 460, 318 480'

// ============================================================
// Layout configs — mobile (portrait S-curve) vs desktop (landscape sweep)
// ============================================================

function getMobileLayout(w: number, h: number) {
  // Trident layout (portrait):
  //   Phone at bottom = handle
  //   Blue circle in center = junction
  //   Three prongs fan upward: AI (up-right), Files (right), Laptop (up-left)

  const circleSettled = { x: w * 0.4, y: h * 0.52 }

  // Handle — phone at the bottom
  const phone = { x: w * 0.4, y: h * 0.82, scale: 0.75 }

  // Prongs — fanning out above the circle
  const aiProvider = { x: w * 0.75, y: h * 0.18, scale: 3.0 }
  const files = { x: w * 0.72, y: h * 0.42, scale: 0.85 }
  const laptop = { x: w * 0.18, y: h * 0.28, scale: 0.5 }

  // Head offset at scale 3
  const aiHeadX = aiProvider.x + 22
  const aiHeadY = aiProvider.y - 58

  // Staff: phone → circle (the dominant line, straight up with slight S)
  const staff = `M ${phone.x} ${phone.y - 42} C ${phone.x - 10} ${h * 0.7}, ${circleSettled.x + 10} ${h * 0.62}, ${circleSettled.x} ${circleSettled.y + 42}`

  // Prong 1: circle → AI (up-right, sweeping curve)
  const toAI = `M ${circleSettled.x + 25} ${circleSettled.y - 20} C ${w * 0.55} ${h * 0.3}, ${w * 0.65} ${h * 0.2}, ${aiHeadX - 10} ${aiHeadY + 5}`

  // Prong 2: circle → Files (right)
  const toFiles = `M ${circleSettled.x + 30} ${circleSettled.y + 5} C ${w * 0.55} ${h * 0.46}, ${w * 0.62} ${h * 0.42}, ${files.x - 20} ${files.y}`

  // Prong 3: circle → Laptop (up-left)
  const toLaptop = `M ${circleSettled.x - 25} ${circleSettled.y - 20} C ${w * 0.25} ${h * 0.38}, ${w * 0.2} ${h * 0.34}, ${laptop.x + 10} ${laptop.y + 40}`

  return {
    circleSettled,
    phone,
    laptop,
    files,
    aiProvider,
    bundles: [
      { d: staff, lineCount: 7, color: black, pulseColor: blue },
      { d: toAI, lineCount: 5, color: black, pulseColor: yellow },
      { d: toFiles, lineCount: 5, color: black, pulseColor: blue },
      { d: toLaptop, lineCount: 5, color: black, pulseColor: red },
    ],
  }
}

function getDesktopLayout(w: number, h: number) {
  // Trident layout (landscape):
  //   Phone on far left = handle
  //   Blue circle center-left = junction
  //   Three prongs fan right: AI (up-right), Files (mid-right), Laptop (down-right)

  const circleSettled = { x: w * 0.32, y: h * 0.48 }

  // Handle — phone on the far left
  const phone = { x: w * 0.08, y: h * 0.48, scale: 0.85 }

  // Prongs — fanning out to the right of the circle
  const aiProvider = { x: w * 0.78, y: h * 0.32, scale: 5.0 }
  const files = { x: w * 0.68, y: h * 0.55, scale: 0.9 }
  const laptop = { x: w * 0.65, y: h * 0.82, scale: 0.65 }

  // Head offset at scale 5
  const aiHeadX = aiProvider.x + 37
  const aiHeadY = aiProvider.y - 97

  // Staff: phone → circle (horizontal with gentle S)
  const staff = `M ${phone.x + 25} ${phone.y} C ${w * 0.14} ${h * 0.44}, ${w * 0.2} ${h * 0.52}, ${circleSettled.x - 45} ${circleSettled.y}`

  // Prong 1: circle → AI (up-right, sweeping to the head)
  const toAI = `M ${circleSettled.x + 45} ${circleSettled.y - 20} C ${w * 0.48} ${h * 0.2}, ${w * 0.6} ${h * 0.1}, ${aiHeadX - 20} ${aiHeadY + 10}`

  // Prong 2: circle → Files (mid-right, gentle arc)
  const toFiles = `M ${circleSettled.x + 48} ${circleSettled.y + 5} C ${w * 0.48} ${h * 0.5}, ${w * 0.58} ${h * 0.53}, ${files.x - 20} ${files.y}`

  // Prong 3: circle → Laptop (down-right, sweeping down)
  const toLaptop = `M ${circleSettled.x + 35} ${circleSettled.y + 30} C ${w * 0.42} ${h * 0.65}, ${w * 0.52} ${h * 0.75}, ${laptop.x - 20} ${laptop.y - 45}`

  return {
    circleSettled,
    phone,
    laptop,
    files,
    aiProvider,
    bundles: [
      { d: staff, lineCount: 7, color: black, pulseColor: blue },
      { d: toAI, lineCount: 7, color: black, pulseColor: yellow },
      { d: toFiles, lineCount: 5, color: black, pulseColor: blue },
      { d: toLaptop, lineCount: 5, color: black, pulseColor: red },
    ],
  }
}

// ============================================================

type Props = {
  progress: number
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
  hideLaptop?: boolean
}

export function HeroScene({ progress, vpSize, isDesktopLayout, hideLaptop }: Props) {
  const reduceMotion = useReducedMotion()

  // --- Sub-progress ---
  const ballRise = mapProgress(progress, 0.0, 0.25)
  const pocketFade = mapProgress(progress, 0.25, 0.42)
  const circleSettle = mapProgress(progress, 0.35, 0.55)
  const diagramBuild = mapProgress(progress, 0.56, 0.82)
  // Zoom starts only after diagram is fully built + a beat
  const laptopZoom = mapProgress(progress, 0.88, 1.0)

  // --- Layout ---
  const layout = isDesktopLayout
    ? getDesktopLayout(vpSize.w, vpSize.h)
    : getMobileLayout(vpSize.w, vpSize.h)

  // --- Pocket scale ---
  const pS = Math.min(vpSize.w * 0.5, vpSize.h * 0.3) / 400

  // --- Pocket transform ---
  const pTx = vpSize.w / 2 - 200 * pS
  const pTy = vpSize.h * 0.6 + 80 * pS

  // --- Circle position ---
  const startY = pTy + 400 * pS
  const peekY = pTy + 70 * pS
  const emergeY = vpSize.h * 0.6

  let circleX: number
  let circleY: number

  if (ballRise < 1) {
    // During rise: center X, rising Y
    circleX = vpSize.w / 2
    if (ballRise < 0.6) {
      circleY = mix(startY, peekY, ballRise / 0.6)
    } else {
      circleY = mix(peekY, emergeY, (ballRise - 0.6) / 0.4)
    }
  } else {
    // Settling: move from emerge position to layout position
    circleX = mix(vpSize.w / 2, layout.circleSettled.x, circleSettle)
    circleY = mix(emergeY, layout.circleSettled.y, circleSettle)
  }

  // Circle radius
  const pocketR = pS * 32
  const settledR = isDesktopLayout ? 54 : 46
  const rProgress = mapProgress(progress, 0.25, 0.55)
  const circleR = mix(pocketR, settledR, rProgress)

  const circleAlpha = clamp(mapProgress(progress, 0.0, 0.1), 0, 1)

  // --- Pocket slide-down (moves off the bottom of the viewport) ---
  const pocketSlideY = pocketFade * (vpSize.h * 0.8)

  // Staggered diagram reveals (0→1 progress for each element)
  const bundlesDraw = mapProgress(diagramBuild, 0.05, 0.6)
  const phoneP = mapProgress(diagramBuild, 0.15, 0.4)
  const laptopP = mapProgress(diagramBuild, 0.25, 0.5)
  const filesP = mapProgress(diagramBuild, 0.3, 0.55)
  const providerP = mapProgress(diagramBuild, 0.4, 0.65)
  const labelsOp = mapProgress(diagramBuild, 0.5, 0.75)

  // Slide-in offsets: elements slide from off-screen edges
  // Distance shrinks from full offset → 0 as progress goes 0→1
  const slideDistance = 200

  // Desktop: phone←left, laptop←bottom, files←right, AI←top
  // Mobile:  phone←bottom, laptop←top, files←right, AI←top-right
  const phoneSlide = isDesktopLayout
    ? { x: -(1 - phoneP) * slideDistance, y: 0 }
    : { x: 0, y: (1 - phoneP) * slideDistance }
  const laptopSlide = isDesktopLayout
    ? { x: 0, y: (1 - laptopP) * slideDistance }
    : { x: 0, y: -(1 - laptopP) * slideDistance }
  const filesSlide = { x: (1 - filesP) * slideDistance, y: 0 }
  const providerSlide = isDesktopLayout
    ? { x: 0, y: -(1 - providerP) * slideDistance }
    : { x: (1 - providerP) * slideDistance * 0.5, y: -(1 - providerP) * slideDistance }

  // Hand draws on slightly after the phone arrives
  const handDraw = mapProgress(diagramBuild, 0.3, 0.65)

  // Camera zoom into the laptop at its settled position
  // Ease-in curve so it starts slow and accelerates
  const zoomEased = laptopZoom * laptopZoom
  const maxZoomScale = isDesktopLayout ? 5.5 : 3.5
  const cameraScale = 1 + (maxZoomScale - 1) * zoomEased
  // Zoom origin = laptop's exact position so it stays pinned during scale
  const zoomOriginX = layout.laptop.x
  const zoomOriginY = layout.laptop.y
  // Pan: slide the laptop toward viewport center as zoom progresses.
  // After the scale-around-origin transform, the laptop sits at its
  // original screen position. This translation moves it to center.
  const panTargetY = isDesktopLayout ? vpSize.h * 0.52 : vpSize.h * 0.42
  const panX = (vpSize.w / 2 - zoomOriginX) * zoomEased
  const panY = (panTargetY - zoomOriginY) * zoomEased
  // SVG transform: scale around laptop, then pan toward center
  const cameraTransform = laptopZoom > 0
    ? `translate(${panX}, ${panY}) translate(${zoomOriginX}, ${zoomOriginY}) scale(${cameraScale}) translate(${-zoomOriginX}, ${-zoomOriginY})`
    : undefined
  // Content cross-fade: install command fades in as we zoom
  const installContentOpacity = mapProgress(laptopZoom, 0.15, 0.6)
  const abstractContentOpacity = 1 - mapProgress(laptopZoom, 0.0, 0.4)
  // Reverse draw for connection lines during zoom
  const bundlesReverseDraw = mapProgress(laptopZoom, 0.0, 0.6)

  const diagramActive = !reduceMotion && diagramBuild > 0.95 && laptopZoom < 0.05
  const pulsesActive = !reduceMotion && diagramBuild > 0.85 && laptopZoom < 0.05

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
      className="absolute inset-0 block h-full w-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="hero-triangle-clip">
          <polygon points="148,50 88,170 208,170" />
        </clipPath>
      </defs>

      {/* Camera zoom wrapper — scales the entire scene around the laptop */}
      <g transform={cameraTransform}>

        {/* ===================== PARALLEL LINE BUNDLES (behind circle) ===================== */}
        {layout.bundles.map((bundle, i) => {
          const bundleProgress = clamp(
            (bundlesDraw - i * 0.08) / (1 - (layout.bundles.length - 1) * 0.08),
            0,
            1,
          )
          if (bundleProgress <= 0) return null
          return (
            <ParallelPathBundle
              key={i}
              d={bundle.d}
              lineCount={bundle.lineCount}
              spacing={isDesktopLayout ? 3.5 : 3}
              strokeColor={bundle.color}
              strokeWidth={1.2}
              drawProgress={bundleProgress}
              staggerPerLine={0.03}
              reverseDrawProgress={bundlesReverseDraw > 0 ? clamp(
                (bundlesReverseDraw - i * 0.08) / (1 - (layout.bundles.length - 1) * 0.08),
                0, 1,
              ) : undefined}
              activeAnimation={
                pulsesActive
                  ? {
                      pulseColor: bundle.pulseColor,
                      duration: 2.4,
                      delay: i * 0.3,
                    }
                  : undefined
              }
            />
          )
        })}

        {/* ===================== BLUE CIRCLE (above bundles) ===================== */}
        <motion.g
          animate={diagramActive ? { scale: [1, 1.04, 1] } : undefined}
          transition={
            diagramActive
              ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
              : undefined
          }
          style={{ transformOrigin: `${circleX}px ${circleY}px` }}
        >
          <circle
            cx={circleX}
            cy={circleY}
            r={Math.max(circleR, 0.1)}
            fill={blue}
            opacity={circleAlpha}
          />
        </motion.g>

        {/* ===================== POCKET GROUP ===================== */}
        <g
          transform={`translate(${pTx}, ${pTy + pocketSlideY}) scale(${pS})`}
        >
          <path d={POCKET_FILL} fill={PAPER} stroke="none" />
          <path
            d={POCKET_OUTLINE_1}
            stroke={blue}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
          <path
            d={POCKET_OUTLINE_2}
            stroke={blue}
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
          />
          <g clipPath="url(#hero-triangle-clip)">
            {Array.from({ length: 22 }, (_, i) => (
              <line
                key={i}
                x1="80"
                y1={54 + i * 5.5}
                x2="216"
                y2={54 + i * 5.5}
                stroke={yellow}
                strokeWidth="3"
              />
            ))}
          </g>
          <rect x="68" y="32" width="14" height="14" fill={red} />
          <path d={WAISTBAND} stroke={blue} strokeWidth="1.5" fill="none" opacity="0.6" />
          <rect
            x="226"
            y="94"
            width="28"
            height="28"
            stroke={blue}
            strokeWidth="1.2"
            fill="none"
            opacity="0.5"
          />
          {Array.from({ length: 5 }, (_, i) => (
            <line
              key={i}
              x1={232 + i * 4}
              y1="98"
              x2={232 + i * 4}
              y2="118"
              stroke={blue}
              strokeWidth="0.8"
              opacity="0.4"
            />
          ))}
          <rect x="30" y="380" width="80" height="100" fill={blue} />
          <rect x="350" y="60" width="30" height="420" fill={blue} />
          <path
            d={SEAM_1}
            stroke={blue}
            strokeWidth="1"
            strokeDasharray="4 3"
            fill="none"
            opacity="0.4"
          />
          <path
            d={SEAM_2}
            stroke={blue}
            strokeWidth="0.8"
            strokeDasharray="3 4"
            fill="none"
            opacity="0.3"
          />
        </g>

        {/* ===================== BAUHAUS PHONE + HAND ===================== */}
        <g transform={`translate(${phoneSlide.x}, ${phoneSlide.y})`} opacity={phoneP}>
          <HandDrawing
            phoneCx={layout.phone.x}
            phoneCy={layout.phone.y}
            phoneScale={layout.phone.scale}
            drawProgress={handDraw}
          />
          <BauhausPhone
            cx={layout.phone.x}
            cy={layout.phone.y}
            scale={layout.phone.scale}
          >
            {diagramActive ? (
              <motion.circle
                cx={0}
                cy={-8}
                r={5}
                fill={blue}
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '0px -8px' }}
              />
            ) : null}
          </BauhausPhone>
        </g>

        {/* ===================== BAUHAUS LAPTOP (Console) ===================== */}
        <g transform={`translate(${laptopSlide.x}, ${laptopSlide.y})`} opacity={hideLaptop ? 0 : laptopP}>
          <BauhausLaptop
            cx={layout.laptop.x}
            cy={layout.laptop.y}
            scale={layout.laptop.scale}
          >
            {/* Abstract console content (fades out as camera zooms in) */}
            <g opacity={abstractContentOpacity}>
              <rect
                x={-90 + 8}
                y={-60 - 5 + 8}
                width={180 - 16}
                height={14}
                rx={3}
                fill={red}
                opacity={0.8}
              />
              <motion.rect
                x={-90 + 16}
                y={-60 - 5 + 28}
                width={28}
                height={6}
                rx={3}
                fill={yellow}
                animate={
                  diagramActive ? { x: [-74, -40, -74] } : { x: -74 }
                }
                transition={
                  diagramActive
                    ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
                    : undefined
                }
              />
              <rect
                x={-90 + 16}
                y={-60 - 5 + 40}
                width={50}
                height={4}
                rx={2}
                fill="rgba(255,255,255,0.35)"
              />
              <rect
                x={-90 + 16}
                y={-60 - 5 + 50}
                width={35}
                height={4}
                rx={2}
                fill="rgba(255,255,255,0.25)"
              />
            </g>
          </BauhausLaptop>
        </g>

        {/* ===================== FILES (folder with fanning pages) ===================== */}
        <g transform={`translate(${filesSlide.x}, ${filesSlide.y})`} opacity={filesP}>
          <BauhausFolder
            cx={layout.files.x}
            cy={layout.files.y}
            scale={layout.files.scale}
            open={filesP >= 1}
          />
        </g>

        {/* ===================== AI PROVIDER (Bauhaus face) ===================== */}
        <g transform={`translate(${providerSlide.x}, ${providerSlide.y})`} opacity={providerP}>
          <BauhausFace
            cx={layout.aiProvider.x}
            cy={layout.aiProvider.y}
            scale={layout.aiProvider.scale}
            pulseColor={yellow}
          />
        </g>

        {/* ===================== LABELS ===================== */}
        <g
          opacity={labelsOp * (1 - laptopZoom)}
          fill={TEXT_SECONDARY}
          style={{
            fontFamily: `${fontFamilyTokens.mono}, ui-monospace, monospace`,
          }}
        >
          <text
            x={layout.circleSettled.x}
            y={layout.circleSettled.y + circleR + 18}
            textAnchor="middle"
            fontSize="10"
          >
            Agent
          </text>
          <text
            x={layout.laptop.x}
            y={layout.laptop.y + (isDesktopLayout ? 30 : 25)}
            textAnchor="middle"
            fontSize="10"
          >
            Console
          </text>
          <text
            x={layout.files.x}
            y={layout.files.y + 45}
            textAnchor="middle"
            fontSize="10"
          >
            Files
          </text>
          <text
            x={layout.aiProvider.x}
            y={layout.aiProvider.y + 46}
            textAnchor="middle"
            fontSize="10"
          >
            AI
          </text>
        </g>


      </g>{/* end camera zoom wrapper */}
    </svg>
  )
}
