import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { brandAssets } from '../brand-assets'
import { ExplainerBackdrop } from './ExplainerCard'
import { EXPLAINER_TIMINGS } from './constants'

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
  href: string
  orbitHref: string
  startX: number
  startY: number
  midX: number
  midY: number
  orbitX: number
  orbitY: number
  size: number
}

const CIRCLE_CX = 160
const CIRCLE_CY = 160
const CIRCLE_R = 42

const STREAM_ITEMS: BrandStreamItem[] = [
  { key: 'github', href: brandAssets.githubBlack, orbitHref: brandAssets.githubWhite, startX: 94, startY: 10, midX: 122, midY: 66, orbitX: -21, orbitY: -18, size: 17 },
  { key: 'git', href: brandAssets.gitBlack, orbitHref: brandAssets.gitWhite, startX: 124, startY: -2, midX: 136, midY: 82, orbitX: 0, orbitY: -24, size: 16 },
  { key: 'npm', href: brandAssets.npmBlack, orbitHref: brandAssets.npmWhite, startX: 160, startY: 8, midX: 158, midY: 92, orbitX: 22, orbitY: -10, size: 18 },
  { key: 'node', href: brandAssets.nodeBlack, orbitHref: brandAssets.nodeWhite, startX: 194, startY: -6, midX: 180, midY: 78, orbitX: -18, orbitY: 2, size: 16 },
  { key: 'claude', href: brandAssets.claudeBlack, orbitHref: brandAssets.claudeWhite, startX: 228, startY: 14, midX: 198, midY: 64, orbitX: 12, orbitY: 14, size: 17 },
  { key: 'codex', href: brandAssets.codexBlack, orbitHref: brandAssets.codexWhite, startX: 110, startY: -16, midX: 132, midY: 58, orbitX: -2, orbitY: 22, size: 16 },
  { key: 'copilot', href: brandAssets.githubCopilotBlack, orbitHref: brandAssets.githubCopilotWhite, startX: 178, startY: -18, midX: 174, midY: 68, orbitX: 20, orbitY: 18, size: 15 },
  { key: 'docker', href: brandAssets.dockerBlack, orbitHref: brandAssets.dockerWhite, startX: 212, startY: 2, midX: 188, midY: 90, orbitX: -22, orbitY: 20, size: 17 },
]

export function SetupExplainer({
  active,
  progress,
  timelineProgress,
}: {
  active: boolean
  progress: number
  timelineProgress?: number
}) {
  const reduceMotion = useReducedMotion()
  const scrollProgress = reduceMotion ? 1 : (timelineProgress ?? progress)
  const funnelReveal = mapProgress(scrollProgress, 0.22, 0.46)
  const streamReveal = mapProgress(scrollProgress, 0.36, 0.9)
  const floatReveal = mapProgress(scrollProgress, 0.74, 1)
  const animate = active && !reduceMotion && floatReveal > 0.92

  const collectedCount = Math.floor(streamReveal * STREAM_ITEMS.length)
  const circleScale = 1 + collectedCount * 0.04

  return (
    <>
      <ExplainerBackdrop hideFrame />
      <defs>
        <clipPath id="setup-funnel-circle-clip">
          <circle cx={CIRCLE_CX} cy={CIRCLE_CY} r={CIRCLE_R - 1} />
        </clipPath>
      </defs>

      <motion.path
        d="M 82 34 L 238 34"
        fill="none"
        stroke={palette.bauhaus.black}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        animate={{ opacity: funnelReveal, pathLength: funnelReveal }}
        transition={{ duration: 0.22, ease: 'linear' }}
      />
      <motion.path
        d="M 82 34 L 148 94 L 148 100"
        fill="none"
        stroke={palette.bauhaus.black}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        animate={{ opacity: funnelReveal, pathLength: funnelReveal }}
        transition={{ duration: 0.22, ease: 'linear' }}
      />
      <motion.path
        d="M 238 34 L 172 94 L 172 100"
        fill="none"
        stroke={palette.bauhaus.black}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        animate={{ opacity: funnelReveal, pathLength: funnelReveal }}
        transition={{ duration: 0.22, ease: 'linear' }}
      />

      <motion.circle
        cx={CIRCLE_CX}
        cy={CIRCLE_CY}
        r={CIRCLE_R + 28}
        fill={palette.bauhaus.yellow}
        animate={{ opacity: floatReveal * 0.12 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />
      <motion.circle
        cx={CIRCLE_CX}
        cy={CIRCLE_CY}
        r={CIRCLE_R}
        fill={palette.bauhaus.blue}
        animate={{ scale: circleScale, opacity: 0.96 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        style={{ transformOrigin: `${CIRCLE_CX}px ${CIRCLE_CY}px` }}
      />

      {STREAM_ITEMS.map((item, index) => {
        const start = index / STREAM_ITEMS.length
        const end = start + 0.2
        const local = mapProgress(streamReveal, start, end)
        const lower = mapProgress(local, 0, 0.62)
        const drop = mapProgress(local, 0.62, 1)
        const x = lower < 1
          ? mix(item.startX, item.midX, lower)
          : mix(item.midX, CIRCLE_CX - item.size / 2, drop)
        const y = lower < 1
          ? mix(item.startY, item.midY, lower)
          : mix(item.midY, CIRCLE_CY - item.size / 2, drop)
        const scale = lower < 1 ? 1 : mix(1, 0.76, drop)
        const visible = collectedCount <= index

        return (
          <motion.g
            key={item.key}
            animate={{
              x: x - item.startX,
              y: y - item.startY,
              scale,
              opacity: visible ? clamp(0.24 + funnelReveal + (1 - local) * 0.36, 0, 1) : 0,
            }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ transformOrigin: `${item.startX + item.size / 2}px ${item.startY + item.size / 2}px` }}
          >
            <image
              href={item.href}
              x={item.startX}
              y={item.startY}
              width={item.size}
              height={item.size}
              preserveAspectRatio="xMidYMid meet"
            />
          </motion.g>
        )
      })}

      <g clipPath="url(#setup-funnel-circle-clip)">
        {STREAM_ITEMS.map((item, index) => {
          if (collectedCount <= index && !reduceMotion) {
            return null
          }

          const baseX = CIRCLE_CX + item.orbitX - item.size / 2
          const baseY = CIRCLE_CY + item.orbitY - item.size / 2
          const driftX = [0, 4 - (index % 3), -3 + (index % 2), 0]
          const driftY = [0, -3 + (index % 3), 4 - (index % 2), 0]

          return (
            <motion.g
              key={`${item.key}-orbit`}
              animate={
                animate
                  ? {
                      x: driftX,
                      y: driftY,
                      rotate: [0, index % 2 === 0 ? 2 : -2, 0],
                      opacity: [0.82, 0.96, 0.82],
                    }
                  : { x: 0, y: 0, rotate: 0, opacity: reduceMotion ? 0.92 : floatReveal }
              }
              transition={
                animate
                  ? {
                      duration: EXPLAINER_TIMINGS.long + index * 0.12,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
                  : undefined
              }
              style={{ transformOrigin: `${baseX + item.size / 2}px ${baseY + item.size / 2}px` }}
            >
              <image
                href={item.orbitHref}
                x={baseX}
                y={baseY}
                width={item.size}
                height={item.size}
                preserveAspectRatio="xMidYMid meet"
                opacity={0.94}
              />
            </motion.g>
          )
        })}

        {[0, 1, 2, 3].map((particle) => {
          const px = CIRCLE_CX - 12 + particle * 8
          const py = CIRCLE_CY - 8 + (particle % 2) * 10
          return (
            <motion.circle
              key={`particle-${particle}`}
              cx={px}
              cy={py}
              r={particle % 2 === 0 ? 2 : 1.5}
              fill={particle % 2 === 0 ? 'rgba(255,255,255,0.72)' : palette.bauhaus.yellow}
              animate={
                animate
                  ? {
                      cx: [px, px + 7, px - 5, px],
                      cy: [py, py - 5, py + 6, py],
                      opacity: [0.24, 0.72, 0.4, 0.24],
                    }
                  : { opacity: floatReveal * 0.5 }
              }
              transition={
                animate
                  ? {
                      duration: EXPLAINER_TIMINGS.long + particle * 0.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
                  : undefined
              }
            />
          )
        })}
      </g>
    </>
  )
}
