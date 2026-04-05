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

type BrandStreamItem = {
  key: string
  href: string
  x: number
  y: number
  size: number
}

const STREAM_ITEMS: BrandStreamItem[] = [
  { key: 'github', href: brandAssets.githubBlack, x: 48, y: 56, size: 20 },
  { key: 'git', href: brandAssets.gitBlack, x: 76, y: 80, size: 18 },
  { key: 'npm', href: brandAssets.npmBlack, x: 42, y: 108, size: 24 },
  { key: 'node', href: brandAssets.nodeBlack, x: 84, y: 134, size: 20 },
  { key: 'claude', href: brandAssets.claudeBlack, x: 38, y: 154, size: 22 },
  { key: 'codex', href: brandAssets.codexBlack, x: 108, y: 58, size: 20 },
  { key: 'copilot', href: brandAssets.githubCopilotBlack, x: 110, y: 100, size: 18 },
  { key: 'docker', href: brandAssets.dockerBlack, x: 96, y: 156, size: 22 },
]

export function SetupExplainer({
  active,
  progress,
}: {
  active: boolean
  progress: number
}) {
  const reduceMotion = useReducedMotion()
  const scrollProgress = reduceMotion ? 1 : progress
  const funnelReveal = mapProgress(scrollProgress, 0.24, 0.5)
  const streamReveal = mapProgress(scrollProgress, 0.42, 0.94)
  const connectedReveal = mapProgress(scrollProgress, 0.84, 1)
  const animate = active && !reduceMotion && connectedReveal > 0.96

  const absorbedCount = Math.floor(streamReveal * STREAM_ITEMS.length)
  const circleScale = 1 + absorbedCount * 0.055
  const circleOpacity = 0.94 + absorbedCount * 0.006

  return (
    <>
      <ExplainerBackdrop />

      <motion.rect
        x="24"
        y="34"
        width="108"
        height="134"
        rx="20"
        fill="none"
        stroke="#8d8476"
        strokeWidth="1.5"
        animate={{ opacity: clamp(funnelReveal * 1.3, 0, 1) }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />

      <motion.path
        d="M 128 58 C 158 68, 180 82, 194 96"
        fill="none"
        stroke={palette.bauhaus.black}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        animate={{ opacity: funnelReveal, pathLength: funnelReveal }}
        transition={{ duration: 0.2, ease: 'linear' }}
      />
      <motion.path
        d="M 128 144 C 158 136, 180 122, 194 108"
        fill="none"
        stroke={palette.bauhaus.black}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        animate={{ opacity: funnelReveal, pathLength: funnelReveal }}
        transition={{ duration: 0.2, ease: 'linear' }}
      />

      <motion.circle
        cx="226"
        cy="102"
        r="56"
        fill={palette.bauhaus.yellow}
        animate={{ opacity: connectedReveal * 0.1 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />
      <motion.circle
        cx="226"
        cy="102"
        r="34"
        fill={palette.bauhaus.blue}
        animate={{ scale: circleScale, opacity: circleOpacity }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        style={{ transformOrigin: '226px 102px' }}
      />

      {STREAM_ITEMS.map((item, index) => {
        const start = index / STREAM_ITEMS.length
        const end = start + 0.22
        const localProgress = mapProgress(streamReveal, start, end)
        const eased = localProgress * localProgress * (3 - 2 * localProgress)
        const targetX = 226 - item.size / 2
        const targetY = 102 - item.size / 2
        const x = item.x + (targetX - item.x) * eased
        const y = item.y + (targetY - item.y) * eased
        const opacity = absorbedCount > index ? 0 : clamp(0.14 + funnelReveal + (1 - eased) * 0.5, 0, 1)

        return (
          <motion.g
            key={item.key}
            animate={{
              x: x - item.x,
              y: y - item.y,
              scale: 1 - eased * 0.32,
              opacity,
            }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ transformOrigin: `${item.x + item.size / 2}px ${item.y + item.size / 2}px` }}
          >
            <image
              href={item.href}
              x={item.x}
              y={item.y}
              width={item.size}
              height={item.size}
              preserveAspectRatio="xMidYMid meet"
            />
          </motion.g>
        )
      })}

      <motion.path
        d="M 194 96 C 206 98, 214 100, 220 100"
        fill="none"
        stroke={palette.bauhaus.blue}
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.16 1"
        animate={animate ? { strokeDashoffset: [1, 0, 0] } : { opacity: connectedReveal, strokeDashoffset: 0 }}
        transition={
          animate
            ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, times: [0, 0.28, 1], ease: 'easeInOut' }
            : undefined
        }
      />
      <motion.path
        d="M 194 108 C 206 106, 214 104, 220 104"
        fill="none"
        stroke={palette.bauhaus.blue}
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.16 1"
        animate={animate ? { strokeDashoffset: [1, 0, 0] } : { opacity: connectedReveal * 0.85, strokeDashoffset: 0.2 }}
        transition={
          animate
            ? {
                duration: EXPLAINER_TIMINGS.long,
                repeat: Infinity,
                delay: EXPLAINER_TIMINGS.long * 0.12,
                times: [0, 0.32, 1],
                ease: 'easeInOut',
              }
            : undefined
        }
      />

      <text x="78" y="182" textAnchor="middle" fontSize="10" fill="#5c5549">tooling stream</text>
      <text x="226" y="182" textAnchor="middle" fontSize="10" fill="#5c5549">helper scripts</text>
      <text x="226" y="56" textAnchor="middle" fontSize="9" fill="#5c5549">automated install funnel</text>
    </>
  )
}
