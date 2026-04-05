import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import {
  pathAgentToFiles,
  pathAgentToFilesLow,
  pathAgentToProvider,
  pathAgentToProviderLow,
  pathConsoleToAgent,
  pathMobileToAgent,
  pathMobileToAgentLow,
} from './FlowPaths'

const pulses = [
  { d: pathMobileToAgent, delay: 0.1, color: palette.bauhaus.blue, reverse: false },
  { d: pathMobileToAgentLow, delay: 0.32, color: palette.bauhaus.blue, reverse: true },
  { d: pathConsoleToAgent, delay: 0.55, color: palette.bauhaus.red, reverse: false },
  { d: pathAgentToFiles, delay: 0.82, color: palette.bauhaus.yellow, reverse: false },
  { d: pathAgentToFilesLow, delay: 1.04, color: palette.bauhaus.yellow, reverse: true },
  { d: pathAgentToProvider, delay: 1.28, color: palette.bauhaus.red, reverse: false },
  { d: pathAgentToProviderLow, delay: 1.52, color: palette.bauhaus.red, reverse: true },
]

export function DataPulse({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion || !active) {
    return null
  }

  return (
    <g>
      {pulses.map(({ d, delay, color, reverse }) => (
        <motion.path
          key={`${d}-${color}`}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.09 1"
          initial={{ strokeDashoffset: reverse ? 0 : 1, opacity: 0 }}
          animate={{ strokeDashoffset: reverse ? 1 : 0, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 2.2,
            delay,
            repeat: Infinity,
            repeatDelay: 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </g>
  )
}
