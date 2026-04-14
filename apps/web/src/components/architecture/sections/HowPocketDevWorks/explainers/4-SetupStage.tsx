import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { SvgAutoWrapText } from '../../../shared/SvgAutoWrapText'
import { architectureTokens } from '../../../shared/theme'
import { brandAssets } from '../../../shared/brand-assets'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mapProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

type BrandStreamItem = {
  key: string
  orbitHref: string
  startX: number
  startY: number
  orbitX: number
  orbitY: number
  size: number
}

const CIRCLE_CX = 160
const CIRCLE_CY = 160
const CIRCLE_R = 52

const STREAM_ITEMS: BrandStreamItem[] = [
  { key: 'github', orbitHref: brandAssets.githubWhite, startX: 94, startY: -160, orbitX: -28, orbitY: -22, size: 17 },
  { key: 'git', orbitHref: brandAssets.gitWhite, startX: 124, startY: -180, orbitX: 4, orbitY: -30, size: 16 },
  { key: 'npm', orbitHref: brandAssets.npmWhite, startX: 160, startY: -150, orbitX: 30, orbitY: -14, size: 18 },
  { key: 'node', orbitHref: brandAssets.nodeWhite, startX: 194, startY: -170, orbitX: -26, orbitY: 8, size: 16 },
  { key: 'claude', orbitHref: brandAssets.claudeWhite, startX: 228, startY: -145, orbitX: 6, orbitY: 12, size: 17 },
  { key: 'codex', orbitHref: brandAssets.codexWhite, startX: 110, startY: -190, orbitX: 30, orbitY: 18, size: 16 },
  { key: 'copilot', orbitHref: brandAssets.githubCopilotWhite, startX: 178, startY: -175, orbitX: -10, orbitY: 28, size: 15 },
  { key: 'docker', orbitHref: brandAssets.dockerWhite, startX: 212, startY: -155, orbitX: 20, orbitY: 30, size: 17 },
  { key: 'rust', orbitHref: brandAssets.rustWhite, startX: 140, startY: -195, orbitX: -18, orbitY: -28, size: 16 },
  { key: 'go', orbitHref: brandAssets.goWhite, startX: 200, startY: -185, orbitX: 22, orbitY: -20, size: 17 },
  { key: 'typescript', orbitHref: brandAssets.typescriptWhite, startX: 168, startY: -200, orbitX: -8, orbitY: 24, size: 16 },
]

// Rest positions inside the funnel where icons stack like balls (center coords)
// Funnel walls: left 82+(y-34)*1.1, right 238-(y-34)*1.1. Icon radius ~12.5px.
const FUNNEL_REST = [
  { x: 155, y: 88 },
  { x: 165, y: 86 },
  { x: 140, y: 72 },
  { x: 160, y: 70 },
  { x: 180, y: 72 },
  { x: 128, y: 56 },
  { x: 160, y: 54 },
  { x: 192, y: 56 },
  { x: 116, y: 40 },
  { x: 160, y: 38 },
  { x: 204, y: 40 },
]

export function SetupTakeoverScene({
  progress,
  isDesktopLayout,
  hideBlueCircle = false,
}: {
  progress: number
  active?: boolean
  isDesktopLayout: boolean
  hideBlueCircle?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const scrollProgress = reduceMotion ? 1 : progress

  const [vpSize, setVpSize] = useState({ w: 840, h: 1280 })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const viewBox = `0 0 ${vpSize.w} ${vpSize.h}`

  // Animation progress segments — circle starts at its funnel position immediately
  // (the overlay handles the entry transition from the Connect scene)
  const funnelReveal = mapProgress(scrollProgress, 0.0, 0.28)
  const streamReveal = mapProgress(scrollProgress, 0.30, 0.62)
  const floatReveal = mapProgress(scrollProgress, 0.52, 0.62)
  const absorbP = mapProgress(scrollProgress, 0.62, 0.74)
  const collectedCount = Math.floor(streamReveal * STREAM_ITEMS.length)
  const circleScale = absorbP > 0
    ? mix(1 + collectedCount * 0.04, 1, absorbP)
    : 1 + collectedCount * 0.04

  const circleEntryY = CIRCLE_CY
  const circleEntryR = CIRCLE_R

  // Scale and center the animation
  const scale = Math.min(vpSize.w, vpSize.h) / 320
  const animCenterX = vpSize.w / 2
  const animCenterY = vpSize.h * (isDesktopLayout ? 0.42 : 0.40)

  // Text positioning — centered above animation
  const titleCenterX = vpSize.w / 2
  const titleY = vpSize.h * (isDesktopLayout ? 0.12 : 0.08)
  const titleSize = isDesktopLayout
    ? Math.min(vpSize.w * 0.04, 56)
    : Math.min(vpSize.w * 0.068, 36)
  const subFontSize = isDesktopLayout
    ? Math.min(vpSize.w * 0.015, 20)
    : Math.min(vpSize.w * 0.04, 18)
  const subLH = Math.round(subFontSize * 1.55)
  const subY = vpSize.h * (isDesktopLayout ? 0.88 : 0.80)
  const subX = isDesktopLayout ? vpSize.w * 0.06 : vpSize.w * 0.07

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

      {/* Title — centered */}
      <text
        x={titleCenterX}
        y={titleY}
        fill={architectureTokens.colors.text}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={titleSize}
        fontWeight="700"
        letterSpacing="-0.03em"
        textAnchor="middle"
      >
        <tspan x={titleCenterX} dy="0">Pick your tools</tspan>
      </text>

      {/* Subtitle */}
      <SvgAutoWrapText
        x={subX}
        y={subY}
        font={`${subFontSize}px var(--font-sans), sans-serif`}
        maxWidth={vpSize.w * (isDesktopLayout ? 0.44 : 0.80)}
        lineHeight={subLH}
        fill={architectureTokens.colors.textSecondary}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={subFontSize}
      >
        PocketDev walks you through guided wizards — choose which AI CLIs to install (Claude, Codex, or Copilot), configure git SSH, Docker, and package tooling.
      </SvgAutoWrapText>

      {/* Animation — scaled and centered */}
      <g transform={`translate(${animCenterX - 160 * scale} ${animCenterY - 100 * scale}) scale(${scale})`}>
        <defs>
          <clipPath id="setup-funnel-circle-clip">
            <circle cx={CIRCLE_CX} cy={circleEntryY} r={circleEntryR - 1} />
          </clipPath>
        </defs>

        {/* Funnel walls — drawn from off-screen corners */}
        <motion.path
          d="M -80 -120 L 82 34 L 148 94 L 148 100"
          fill="none"
          stroke={palette.bauhaus.black}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          animate={{ pathLength: funnelReveal }}
          transition={{ duration: 0.22, ease: 'linear' }}
        />
        <motion.path
          d="M 400 -120 L 238 34 L 172 94 L 172 100"
          fill="none"
          stroke={palette.bauhaus.black}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          animate={{ pathLength: funnelReveal }}
          transition={{ duration: 0.22, ease: 'linear' }}
        />

        {/* Yellow glow */}
        {!hideBlueCircle && (
          <motion.circle
            cx={CIRCLE_CX}
            cy={circleEntryY}
            r={circleEntryR + 28}
            fill={palette.bauhaus.yellow}
            animate={{ opacity: floatReveal * 0.12 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          />
        )}
        {/* Absorb glow — radial pulse when icons get eaten */}
        {!hideBlueCircle && absorbP > 0 && absorbP < 1 && (
          <circle
            cx={CIRCLE_CX}
            cy={circleEntryY}
            r={circleEntryR * circleScale + mix(0, 30, absorbP)}
            fill={palette.bauhaus.blue}
            opacity={mix(0.25, 0, absorbP)}
          />
        )}
        {/* Main circle — scales as icons collect, shrinks back during absorb */}
        {!hideBlueCircle && (
          <motion.circle
            cx={CIRCLE_CX}
            cy={circleEntryY}
            r={circleEntryR}
            fill={palette.bauhaus.blue}
            animate={{ scale: circleScale, opacity: 0.96 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            style={{ transformOrigin: `${CIRCLE_CX}px ${circleEntryY}px` }}
          />
        )}

        {/* Icons */}
        {STREAM_ITEMS.map((item, index) => {
          const rest = FUNNEL_REST[index]
          const start = index * 0.04
          const end = start + 0.45
          const local = mapProgress(streamReveal, start, end)
          const enter = mapProgress(local, 0, 0.24)
          const funnel = mapProgress(local, 0.52, 0.7)
          const drop = mapProgress(local, 0.7, 1)
          const isSettled = enter >= 1 && funnel === 0
          const isOrbiting = drop >= 1

          const orbitX = CIRCLE_CX + item.orbitX - item.size / 2
          const orbitY = CIRCLE_CY + item.orbitY - item.size / 2
          const restX = rest.x - item.size / 2
          const restY = rest.y - item.size / 2
          const exitX = CIRCLE_CX - item.size / 2
          const exitY = 97 - item.size / 2

          // Absorb: stagger so icons don't all disappear at once
          const absorbStagger = index * 0.06
          const iconAbsorb = clamp((absorbP - absorbStagger) / (1 - absorbStagger), 0, 1)
          const absorbTargetX = CIRCLE_CX - item.size / 2
          const absorbTargetY = CIRCLE_CY - item.size / 2

          let tx: number, ty: number
          if (reduceMotion) {
            tx = orbitX
            ty = orbitY
          } else if (iconAbsorb > 0 && isOrbiting) {
            tx = mix(orbitX, absorbTargetX, iconAbsorb)
            ty = mix(orbitY, absorbTargetY, iconAbsorb)
          } else if (enter < 1) {
            tx = mix(item.startX, restX, enter)
            ty = mix(item.startY, restY, enter)
          } else if (funnel > 0 && funnel < 1) {
            tx = mix(restX, exitX, funnel)
            ty = mix(restY, exitY, funnel)
          } else if (drop > 0 && drop < 1) {
            tx = mix(exitX, orbitX, drop)
            ty = mix(exitY, orbitY, drop)
          } else if (isOrbiting) {
            tx = orbitX
            ty = orbitY
          } else {
            tx = restX
            ty = restY
          }
          const iconScale = iconAbsorb > 0
            ? mix(0.85, 0.3, iconAbsorb)
            : funnel > 0 || drop > 0 ? mix(1, 0.85, clamp(funnel + drop, 0, 1)) : isOrbiting || reduceMotion ? 0.85 : 1
          const opacity = iconAbsorb > 0
            ? mix(1, 0, iconAbsorb)
            : local > 0 ? 1 : 0

          // Wobble only while settled in funnel, not once orbiting or absorbing
          const showWobble = isSettled && !reduceMotion && iconAbsorb === 0
          const wobbleX = 3 + (index % 3) * 1.5
          const wobbleY = 2 + (index % 2) * 2
          const wobbleRot = 5 + (index % 3) * 3

          return (
            <motion.g
              key={item.key}
              animate={{
                x: tx - item.startX,
                y: ty - item.startY,
                scale: iconScale,
                opacity,
              }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ transformOrigin: `${item.startX + item.size / 2}px ${item.startY + item.size / 2}px` }}
            >
              <motion.g
                animate={
                  showWobble
                    ? {
                        x: [0, wobbleX, -wobbleX * 0.6, wobbleX * 0.3, 0],
                        y: [0, -wobbleY, wobbleY * 0.5, -wobbleY * 0.3, 0],
                        rotate: [0, wobbleRot, -wobbleRot * 0.5, wobbleRot * 0.3, 0],
                      }
                    : { x: 0, y: 0, rotate: 0 }
                }
                transition={
                  showWobble
                    ? { duration: 1.6 + index * 0.18, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.15 }
                }
                style={{ transformOrigin: `${item.startX + item.size / 2}px ${item.startY + item.size / 2}px` }}
              >
                <circle
                  cx={item.startX + item.size / 2}
                  cy={item.startY + item.size / 2}
                  r={item.size / 2 + 4}
                  fill={palette.bauhaus.blue}
                />
                <image
                  href={item.orbitHref}
                  x={item.startX}
                  y={item.startY}
                  width={item.size}
                  height={item.size}
                  preserveAspectRatio="xMidYMid meet"
                />
              </motion.g>
            </motion.g>
          )
        })}

      </g>
    </svg>
  )
}
