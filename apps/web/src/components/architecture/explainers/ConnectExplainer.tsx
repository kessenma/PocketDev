import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { ExplainerBackdrop } from './ExplainerCard'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ConnectExplainer({
  active,
  progress,
}: {
  active: boolean
  progress: number
}) {
  const reduceMotion = useReducedMotion()
  const connectedProgress = reduceMotion ? 1 : clamp((progress - 0.42) / 0.28, 0, 1)
  const screenOn = connectedProgress > 0.92
  const lineColor = screenOn ? palette.bauhaus.blue : palette.bauhaus.black

  return (
    <>
      <ExplainerBackdrop />

      <rect
        x="172"
        y="48"
        width="120"
        height="108"
        rx="16"
        fill="none"
        stroke="#8d8476"
        strokeDasharray="7 5"
        strokeWidth="1.5"
      />

      <motion.rect
        x="118"
        y="42"
        width="38"
        height="16"
        rx="6"
        fill={palette.bauhaus.yellow}
        animate={{ y: active && !reduceMotion ? 48 : 42 }}
        transition={active && !reduceMotion ? { duration: 0.45, ease: 'easeOut' } : undefined}
      />
      <rect x="131" y="47" width="12" height="6" rx="3" fill={palette.bauhaus.black} />

      <rect x="34" y="68" width="44" height="82" rx="12" fill={palette.bauhaus.black} />
      <rect x="49" y="79" width="14" height="4" rx="2" fill="rgba(255,255,255,0.88)" />
      <motion.rect
        x="42"
        y="92"
        width="28"
        height="40"
        rx="6"
        fill={palette.bauhaus.blue}
        animate={{ opacity: screenOn ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
      <motion.rect
        x="48"
        y="100"
        width="16"
        height="6"
        rx="3"
        fill="rgba(255,255,255,0.92)"
        animate={{ opacity: screenOn ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
      <motion.rect
        x="48"
        y="112"
        width="12"
        height="4"
        rx="2"
        fill="rgba(255,255,255,0.82)"
        animate={{ opacity: screenOn ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />

      <motion.path
        d="M 78 98 C 108 88, 130 88, 170 94"
        fill="none"
        stroke={lineColor}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        animate={{ pathLength: connectedProgress }}
        transition={{ duration: 0.18, ease: 'linear' }}
      />
      <motion.path
        d="M 78 120 C 112 136, 134 136, 170 124"
        fill="none"
        stroke={lineColor}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        animate={{ pathLength: connectedProgress }}
        transition={{ duration: 0.18, ease: 'linear' }}
      />

      <motion.circle
        cx="224"
        cy="102"
        r="34"
        fill={palette.bauhaus.blue}
        animate={
          active && !reduceMotion && connectedProgress >= 1
            ? { scale: [1, 1.05, 1], opacity: [0.96, 1, 0.96] }
            : { scale: 1, opacity: 0.94 }
        }
        transition={
          active && !reduceMotion && connectedProgress >= 1
            ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
        style={{ transformOrigin: '224px 102px' }}
      />

      <text x="56" y="170" textAnchor="middle" fontSize="10" fill="#5c5549">Phone</text>
      <text x="224" y="170" textAnchor="middle" fontSize="10" fill="#5c5549">Agent</text>
      <text x="232" y="60" textAnchor="middle" fontSize="9" fill="#5c5549">YOUR VPS</text>
    </>
  )
}
