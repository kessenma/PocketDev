import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { ExplainerBackdrop } from './ExplainerCard'
import { EXPLAINER_TIMINGS } from './constants'

export function AiBuildExplainer({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion()
  const animate = active && !reduceMotion

  return (
    <>
      <ExplainerBackdrop />

      <rect x="26" y="74" width="42" height="78" rx="12" fill={palette.bauhaus.black} />
      <rect x="40" y="84" width="14" height="4" rx="2" fill="rgba(255,255,255,0.88)" />

      <circle cx="140" cy="104" r="30" fill={palette.bauhaus.blue} />

      <rect
        x="104"
        y="46"
        width="120"
        height="116"
        rx="18"
        fill="none"
        stroke="#8d8476"
        strokeDasharray="7 5"
        strokeWidth="1.5"
      />

      <path d="M 68 102 C 92 102, 102 104, 110 104" fill="none" stroke={palette.bauhaus.black} strokeWidth="4" strokeLinecap="round" />
      <path d="M 170 96 C 194 78, 220 72, 246 76" fill="none" stroke={palette.bauhaus.black} strokeWidth="4" strokeLinecap="round" />
      <path d="M 170 116 C 194 126, 214 134, 232 142" fill="none" stroke={palette.bauhaus.black} strokeWidth="4" strokeLinecap="round" />
      <path d="M 226 144 C 242 150, 256 152, 270 150" fill="none" stroke={palette.bauhaus.black} strokeWidth="4" strokeLinecap="round" />
      <path d="M 246 132 C 224 122, 198 114, 170 108" fill="none" stroke={palette.bauhaus.black} strokeWidth="3" strokeLinecap="round" />

      <motion.path
        d="M 68 102 C 92 102, 102 104, 110 104"
        fill="none"
        stroke={palette.bauhaus.red}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.14 1"
        animate={animate ? { strokeDashoffset: [1, 1, 0, 0] } : { strokeDashoffset: 0.3 }}
        transition={animate ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, times: [0, 0.12, 0.3, 1], ease: 'easeInOut' } : undefined}
      />
      <motion.path
        d="M 170 96 C 194 78, 220 72, 246 76"
        fill="none"
        stroke={palette.bauhaus.red}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.1 1"
        animate={animate ? { strokeDashoffset: [1, 1, 0, 0] } : { strokeDashoffset: 0.5 }}
        transition={animate ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, times: [0, 0.28, 0.46, 1], ease: 'easeInOut' } : undefined}
      />
      <motion.path
        d="M 170 116 C 194 126, 214 134, 232 142"
        fill="none"
        stroke={palette.bauhaus.yellow}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.1 1"
        animate={animate ? { strokeDashoffset: [0, 0, 1, 1] } : { strokeDashoffset: 0.7 }}
        transition={animate ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, times: [0, 0.46, 0.66, 1], ease: 'easeInOut' } : undefined}
      />
      <motion.path
        d="M 246 132 C 224 122, 198 114, 170 108"
        fill="none"
        stroke={palette.bauhaus.blue}
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.14 1"
        animate={animate ? { strokeDashoffset: [0, 0, 1, 1] } : { strokeDashoffset: 0.76 }}
        transition={animate ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, times: [0, 0.58, 0.8, 1], ease: 'easeInOut' } : undefined}
      />

      <rect x="198" y="132" width="24" height="26" rx="6" fill={palette.bauhaus.black} />
      <rect x="202" y="138" width="16" height="6" rx="3" fill="rgba(255,255,255,0.9)" />
      <rect x="202" y="148" width="12" height="6" rx="3" fill={palette.bauhaus.blue} />

      <rect x="248" y="62" width="40" height="54" rx="10" fill={palette.bauhaus.black} />
      <rect x="248" y="62" width="40" height="14" rx="10" fill={palette.bauhaus.red} />
      <motion.rect
        x="258"
        y="84"
        width="20"
        height="18"
        rx="4"
        fill={palette.bauhaus.yellow}
        animate={animate ? { scale: [1, 0.92, 1], opacity: [1, 0.7, 1] } : { scale: 1, opacity: 1 }}
        transition={animate ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, ease: 'easeInOut' } : undefined}
        style={{ transformOrigin: '268px 93px' }}
      />

      <rect x="236" y="134" width="38" height="34" rx="8" fill={palette.bauhaus.black} />
      <rect x="240" y="138" width="30" height="18" rx="4" fill="rgba(255,255,255,0.92)" />
      <motion.rect
        x="248"
        y="160"
        width="18"
        height="4"
        rx="2"
        fill={palette.bauhaus.blue}
        animate={animate ? { width: [18, 10, 18] } : { width: 18 }}
        transition={animate ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />
      <motion.rect
        x="242"
        y="146"
        width="22"
        height="5"
        rx="2.5"
        fill={palette.bauhaus.red}
        animate={animate ? { width: [10, 22, 10], x: [254, 242, 254] } : { width: 22, x: 242 }}
        transition={animate ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, times: [0, 0.72, 1], ease: 'easeInOut' } : undefined}
      />

      <rect x="278" y="132" width="22" height="38" rx="6" fill={palette.bauhaus.red} />
      <rect x="283" y="138" width="12" height="18" rx="3" fill="rgba(255,255,255,0.9)" />

      <text x="208" y="172" textAnchor="middle" fontSize="10" fill="#5c5549">Files</text>
      <text x="270" y="54" textAnchor="middle" fontSize="10" fill="#5c5549">AI</text>
      <text x="253" y="184" textAnchor="middle" fontSize="10" fill="#5c5549">Build</text>
      <text x="289" y="184" textAnchor="middle" fontSize="10" fill="#5c5549">App</text>
    </>
  )
}
