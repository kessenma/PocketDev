import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { ExplainerBackdrop } from './ExplainerCard'
import { EXPLAINER_TIMINGS } from './constants'

export function RepoExplainer({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion()
  const animate = active && !reduceMotion
  const sourceTagMotion = animate
    ? { x: [30, 36, 30], opacity: [0.7, 1, 0.7] }
    : { x: 34, opacity: 1 }

  return (
    <>
      <ExplainerBackdrop />

      <rect x="24" y="66" width="54" height="54" rx="12" fill={palette.bauhaus.black} />
      <rect x="38" y="82" width="26" height="8" rx="4" fill={palette.bauhaus.yellow} />
      <motion.rect
        x="30"
        y="52"
        width="22"
        height="8"
        rx="4"
        fill={palette.bauhaus.blue}
        animate={sourceTagMotion}
        transition={
          animate
            ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
      />
      <rect x="56" y="52" width="14" height="8" rx="4" fill={palette.bauhaus.red} />

      <circle cx="156" cy="94" r="28" fill={palette.bauhaus.blue} />

      <rect
        x="120"
        y="42"
        width="156"
        height="118"
        rx="18"
        fill="none"
        stroke="#8d8476"
        strokeDasharray="7 5"
        strokeWidth="1.5"
      />

      <path
        d="M 78 92 C 104 90, 118 90, 128 92"
        fill="none"
        stroke={palette.bauhaus.black}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M 184 92 C 210 92, 226 100, 246 114"
        fill="none"
        stroke={palette.bauhaus.black}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M 184 100 C 208 106, 226 116, 242 132"
        fill="none"
        stroke={palette.bauhaus.black}
        strokeWidth="4"
        strokeLinecap="round"
      />

      <motion.rect
        x="82"
        y="86"
        width="16"
        height="12"
        rx="4"
        fill={palette.bauhaus.red}
        animate={
          animate
            ? {
                x: [82, 82, 142, 206, 232, 232, 82],
                y: [86, 86, 86, 98, 108, 108, 86],
              }
            : { x: 232, y: 108 }
        }
        transition={
          animate
            ? {
                duration: EXPLAINER_TIMINGS.long,
                repeat: Infinity,
                times: [0, 0.14, 0.34, 0.56, 0.72, 0.84, 1],
                ease: 'easeInOut',
              }
            : undefined
        }
      />
      <motion.rect
        x="82"
        y="88"
        width="12"
        height="10"
        rx="4"
        fill={palette.bauhaus.blue}
        animate={
          animate
            ? {
                x: [82, 82, 142, 204, 222, 222, 82],
                y: [88, 88, 88, 106, 126, 126, 88],
              }
            : { x: 222, y: 126 }
        }
        transition={
          animate
            ? {
                duration: EXPLAINER_TIMINGS.long,
                repeat: Infinity,
                delay: EXPLAINER_TIMINGS.long * 0.12,
                times: [0, 0.16, 0.36, 0.56, 0.74, 0.86, 1],
                ease: 'easeInOut',
              }
            : undefined
        }
      />

      <rect x="230" y="104" width="36" height="18" rx="6" fill={palette.bauhaus.black} />
      <rect x="222" y="122" width="44" height="18" rx="6" fill={palette.bauhaus.yellow} />
      <rect x="214" y="140" width="52" height="18" rx="6" fill={palette.bauhaus.blue} />

      <text x="52" y="136" textAnchor="middle" fontSize="10" fill="#5c5549">Remote repo</text>
      <text x="248" y="174" textAnchor="middle" fontSize="10" fill="#5c5549">Server files</text>
    </>
  )
}
