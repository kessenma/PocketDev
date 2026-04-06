import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens } from '../../../shared/theme'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ConnectStage({
  active,
  progress,
}: {
  active: boolean
  progress: number
}) {
  const reduceMotion = useReducedMotion()
  const connectedProgress = reduceMotion ? 1 : clamp((progress - 0.42) / 0.28, 0, 1)
  const screenOn = connectedProgress > 0.92

  return (
    <>
      <rect x="38" y="64" width="48" height="88" rx="14" fill={palette.bauhaus.black} />
      <rect x="53" y="75" width="18" height="4" rx="2" fill="rgba(255,255,255,0.84)" />
      <motion.rect
        x="44"
        y="88"
        width="36"
        height="46"
        rx="10"
        fill={palette.bauhaus.blue}
        animate={{ opacity: screenOn ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
      <motion.rect
        x="50"
        y="97"
        width="22"
        height="6"
        rx="3"
        fill="rgba(255,255,255,0.92)"
        animate={{ opacity: screenOn ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
      <motion.rect
        x="50"
        y="110"
        width="16"
        height="4"
        rx="2"
        fill="rgba(255,255,255,0.82)"
        animate={{ opacity: screenOn ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
      <circle cx="62" cy="142" r="3" fill="rgba(255,255,255,0.4)" />

      <motion.path
        d="M 84 98 C 112 88, 142 88, 176 94"
        fill="none"
        stroke={palette.bauhaus.blue}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        animate={{ pathLength: connectedProgress }}
        transition={{ duration: 0.18, ease: 'linear' }}
      />
      <motion.path
        d="M 84 118 C 116 134, 144 136, 176 124"
        fill="none"
        stroke={palette.bauhaus.blue}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        animate={{ pathLength: connectedProgress }}
        transition={{ duration: 0.18, ease: 'linear' }}
      />

      <rect
        x="178"
        y="54"
        width="112"
        height="96"
        rx="18"
        fill="none"
        stroke={architectureTokens.colors.borderStrong}
        strokeDasharray="8 6"
        strokeWidth="1.5"
      />

      <motion.circle
        cx="234"
        cy="102"
        r="32"
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
        style={{ transformOrigin: '234px 102px' }}
      />

      <text x="62" y="170" textAnchor="middle" fontSize="10" fill={architectureTokens.colors.textSecondary}>Phone</text>
    </>
  )
}
