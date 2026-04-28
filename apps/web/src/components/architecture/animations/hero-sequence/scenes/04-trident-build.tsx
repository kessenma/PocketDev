import { motion, useReducedMotion } from 'framer-motion'
import { palette, fontFamilyTokens } from '@pocketdev/shared/theme'
import { architectureTheme } from '../../../shared/theme'
import { BauhausPhone } from '../../../sections/HowPocketDevWorks/shared/BauhausPhone'
import { BauhausLaptop } from '../../../sections/HowPocketDevWorks/shared/BauhausLaptop'
import { BauhausFolder } from '../../../sections/HowPocketDevWorks/shared/BauhausFolder'
import { BauhausFace } from '../../../sections/HowPocketDevWorks/shared/BauhausFace'
import { ParallelPathBundle } from '../ParallelPathBundle'
import { HandDrawing } from '../HandDrawing'

const blue = palette.bauhaus.blue
const red = palette.bauhaus.red
const yellow = palette.bauhaus.yellow
const black = palette.bauhaus.black
const TEXT_SECONDARY = architectureTheme.textSecondary

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
function mapP(v: number, lo: number, hi: number) {
  return clamp((v - lo) / (hi - lo), 0, 1)
}
function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// ── Layout configs (portrait trident vs landscape trident) ────────────────────

function getMobileLayout(w: number, h: number) {
  const circleSettled = { x: w * 0.4, y: h * 0.52 }
  const phone = { x: w * 0.4, y: h * 0.82, scale: 0.75 }
  const aiProvider = { x: w * 0.75, y: h * 0.18, scale: 3.0 }
  const files = { x: w * 0.72, y: h * 0.42, scale: 0.85 }
  const laptop = { x: w * 0.18, y: h * 0.28, scale: 0.5 }
  const aiHeadX = aiProvider.x + 22
  const aiHeadY = aiProvider.y - 58
  const staff = `M ${phone.x} ${phone.y - 42} C ${phone.x - 10} ${h * 0.7}, ${circleSettled.x + 10} ${h * 0.62}, ${circleSettled.x} ${circleSettled.y + 42}`
  const toAI = `M ${circleSettled.x + 25} ${circleSettled.y - 20} C ${w * 0.55} ${h * 0.3}, ${w * 0.65} ${h * 0.2}, ${aiHeadX - 10} ${aiHeadY + 5}`
  const toFiles = `M ${circleSettled.x + 30} ${circleSettled.y + 5} C ${w * 0.55} ${h * 0.46}, ${w * 0.62} ${h * 0.42}, ${files.x - 20} ${files.y}`
  const toLaptop = `M ${circleSettled.x - 25} ${circleSettled.y - 20} C ${w * 0.25} ${h * 0.38}, ${w * 0.2} ${h * 0.34}, ${laptop.x + 10} ${laptop.y + 40}`
  return {
    circleSettled, phone, laptop, files, aiProvider,
    bundles: [
      { d: staff,    lineCount: 7, color: black, pulseColor: blue },
      { d: toAI,     lineCount: 5, color: black, pulseColor: yellow },
      { d: toFiles,  lineCount: 5, color: black, pulseColor: blue },
      { d: toLaptop, lineCount: 5, color: black, pulseColor: red },
    ],
  }
}

function getDesktopLayout(w: number, h: number) {
  const circleSettled = { x: w * 0.32, y: h * 0.48 }
  const phone = { x: w * 0.08, y: h * 0.48, scale: 0.85 }
  const aiProvider = { x: w * 0.78, y: h * 0.32, scale: 5.0 }
  const files = { x: w * 0.68, y: h * 0.55, scale: 0.9 }
  const laptop = { x: w * 0.65, y: h * 0.82, scale: 0.65 }
  const aiHeadX = aiProvider.x + 37
  const aiHeadY = aiProvider.y - 97
  const staff = `M ${phone.x + 25} ${phone.y} C ${w * 0.14} ${h * 0.44}, ${w * 0.2} ${h * 0.52}, ${circleSettled.x - 45} ${circleSettled.y}`
  const toAI = `M ${circleSettled.x + 45} ${circleSettled.y - 20} C ${w * 0.48} ${h * 0.2}, ${w * 0.6} ${h * 0.1}, ${aiHeadX - 20} ${aiHeadY + 10}`
  const toFiles = `M ${circleSettled.x + 48} ${circleSettled.y + 5} C ${w * 0.48} ${h * 0.5}, ${w * 0.58} ${h * 0.53}, ${files.x - 20} ${files.y}`
  const toLaptop = `M ${circleSettled.x + 35} ${circleSettled.y + 30} C ${w * 0.42} ${h * 0.65}, ${w * 0.52} ${h * 0.75}, ${laptop.x - 20} ${laptop.y - 45}`
  return {
    circleSettled, phone, laptop, files, aiProvider,
    bundles: [
      { d: staff,    lineCount: 7, color: black, pulseColor: blue },
      { d: toAI,     lineCount: 7, color: black, pulseColor: yellow },
      { d: toFiles,  lineCount: 5, color: black, pulseColor: blue },
      { d: toLaptop, lineCount: 5, color: black, pulseColor: red },
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  /** Normalized 0→1, maps to global hero progress 0.72→1.0 */
  progress: number
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
  hideLaptop?: boolean
  /** Starting viewport position for the circle — defaults to viewport center */
  seedX?: number
  seedY?: number
}

export function TridentBuildScene({ progress: p, vpSize, isDesktopLayout, hideLaptop, seedX, seedY }: Props) {
  const reduceMotion = useReducedMotion()
  const { w, h } = vpSize

  const layout = isDesktopLayout ? getDesktopLayout(w, h) : getMobileLayout(w, h)
  const settledR = isDesktopLayout ? 54 : 46

  // Sub-progress (all local to 0→1):
  const circleSettle = mapP(p, 0.000, 0.500)
  const diagramBuild = mapP(p, 0.000, 0.786)
  const laptopZoom   = mapP(p, 0.786, 1.000)

  // Circle: starts at seed position (badge location) or viewport center, settles to layout
  const circleX = mix(seedX ?? w / 2, layout.circleSettled.x, circleSettle)
  const circleY = mix(seedY ?? h * 0.5, layout.circleSettled.y, circleSettle)

  // Staggered diagram reveals
  const bundlesDraw = mapP(diagramBuild, 0.05, 0.60)
  const phoneP      = mapP(diagramBuild, 0.15, 0.40)
  const laptopP     = mapP(diagramBuild, 0.25, 0.50)
  const filesP      = mapP(diagramBuild, 0.30, 0.55)
  const providerP   = mapP(diagramBuild, 0.40, 0.65)
  const labelsOp    = mapP(diagramBuild, 0.50, 0.75)
  const handDraw    = mapP(diagramBuild, 0.30, 0.65)

  // Slide-in offsets
  const slideDistance = 200
  const phoneSlide = isDesktopLayout
    ? { x: -(1 - phoneP) * slideDistance, y: 0 }
    : { x: 0, y: (1 - phoneP) * slideDistance }
  const laptopSlide = isDesktopLayout
    ? { x: 0, y: (1 - laptopP) * slideDistance }
    : { x: 0, y: -(1 - laptopP) * slideDistance }
  const filesSlide    = { x: (1 - filesP) * slideDistance, y: 0 }
  const providerSlide = isDesktopLayout
    ? { x: 0, y: -(1 - providerP) * slideDistance }
    : { x: (1 - providerP) * slideDistance * 0.5, y: -(1 - providerP) * slideDistance }

  // Camera zoom into the laptop
  const zoomEased     = laptopZoom * laptopZoom
  const maxZoomScale  = isDesktopLayout ? 5.5 : 3.5
  const cameraScale   = 1 + (maxZoomScale - 1) * zoomEased
  const zoomOriginX   = layout.laptop.x
  const zoomOriginY   = layout.laptop.y
  const panTargetY    = isDesktopLayout ? h * 0.52 : h * 0.42
  const panX          = (w / 2 - zoomOriginX) * zoomEased
  const panY          = (panTargetY - zoomOriginY) * zoomEased
  const cameraTransform = laptopZoom > 0
    ? `translate(${panX}, ${panY}) translate(${zoomOriginX}, ${zoomOriginY}) scale(${cameraScale}) translate(${-zoomOriginX}, ${-zoomOriginY})`
    : undefined

  const abstractContentOpacity = 1 - mapP(laptopZoom, 0.0, 0.4)
  const bundlesReverseDraw     = mapP(laptopZoom, 0.0, 0.6)

  const diagramActive = !reduceMotion && diagramBuild > 0.95 && laptopZoom < 0.05
  const pulsesActive  = !reduceMotion && diagramBuild > 0.85 && laptopZoom < 0.05

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${h}`}
      className="absolute inset-0 block h-full w-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <g transform={cameraTransform}>
        {/* ── Parallel line bundles (behind circle) ── */}
        {layout.bundles.map((bundle, i) => {
          const bundleProgress = clamp(
            (bundlesDraw - i * 0.08) / (1 - (layout.bundles.length - 1) * 0.08),
            0, 1,
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
                  ? { pulseColor: bundle.pulseColor, duration: 2.4, delay: i * 0.3 }
                  : undefined
              }
            />
          )
        })}

        {/* ── Blue circle — settles from center into layout position ── */}
        <motion.g
          animate={diagramActive ? { scale: [1, 1.04, 1] } : undefined}
          transition={diagramActive ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: `${circleX}px ${circleY}px` }}
        >
          <circle cx={circleX} cy={circleY} r={settledR} fill={blue} opacity={clamp(p / 0.08, 0, 1)} />
        </motion.g>

        {/* ── Phone + hand drawing ── */}
        <g transform={`translate(${phoneSlide.x}, ${phoneSlide.y})`} opacity={phoneP}>
          <HandDrawing
            phoneCx={layout.phone.x}
            phoneCy={layout.phone.y}
            phoneScale={layout.phone.scale}
            drawProgress={handDraw}
          />
          <BauhausPhone cx={layout.phone.x} cy={layout.phone.y} scale={layout.phone.scale}>
            {diagramActive ? (
              <motion.circle
                cx={0} cy={-8} r={5} fill={blue}
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '0px -8px' }}
              />
            ) : null}
          </BauhausPhone>
        </g>

        {/* ── Laptop (console) ── */}
        <g transform={`translate(${laptopSlide.x}, ${laptopSlide.y})`} opacity={hideLaptop ? 0 : laptopP}>
          <BauhausLaptop cx={layout.laptop.x} cy={layout.laptop.y} scale={layout.laptop.scale}>
            <g opacity={abstractContentOpacity}>
              <rect x={-82} y={-57} width={164} height={14} rx={3} fill={red} opacity={0.8} />
              <motion.rect
                x={-74} y={-37} width={28} height={6} rx={3} fill={yellow}
                animate={diagramActive ? { x: [-74, -40, -74] } : { x: -74 }}
                transition={diagramActive ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
              />
              <rect x={-74} y={-25} width={50} height={4} rx={2} fill="rgba(255,255,255,0.35)" />
              <rect x={-74} y={-15} width={35} height={4} rx={2} fill="rgba(255,255,255,0.25)" />
            </g>
          </BauhausLaptop>
        </g>

        {/* ── Files (folder) ── */}
        <g transform={`translate(${filesSlide.x}, ${filesSlide.y})`} opacity={filesP}>
          <BauhausFolder
            cx={layout.files.x}
            cy={layout.files.y}
            scale={layout.files.scale}
            open={filesP >= 1}
          />
        </g>

        {/* ── AI provider (face) ── */}
        <g transform={`translate(${providerSlide.x}, ${providerSlide.y})`} opacity={providerP}>
          <BauhausFace
            cx={layout.aiProvider.x}
            cy={layout.aiProvider.y}
            scale={layout.aiProvider.scale}
            pulseColor={yellow}
          />
        </g>

        {/* ── Labels ── */}
        <g
          opacity={labelsOp * (1 - laptopZoom)}
          fill={TEXT_SECONDARY}
          style={{ fontFamily: `${fontFamilyTokens.mono}, ui-monospace, monospace` }}
        >
          <text x={layout.circleSettled.x} y={layout.circleSettled.y + settledR + 18} textAnchor="middle" fontSize="10">Agent</text>
          <text x={layout.laptop.x}        y={layout.laptop.y + (isDesktopLayout ? 30 : 25)}   textAnchor="middle" fontSize="10">Console</text>
          <text x={layout.files.x}         y={layout.files.y + 45}                              textAnchor="middle" fontSize="10">Files</text>
          <text x={layout.aiProvider.x}    y={layout.aiProvider.y + 46}                         textAnchor="middle" fontSize="10">AI</text>
        </g>

      </g>
    </svg>
  )
}
