import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import {
  pathAgentToTools,
  pathAgentToToolsLow,
  pathConsoleToAgent,
  pathMobileToAgent,
  pathMobileToAgentLow,
  pathWebToAgent,
} from './FlowPaths'

const pulses = [
  { d: pathWebToAgent, delay: 0.1, color: palette.bauhaus.yellow, reverse: false },
  { d: pathMobileToAgent, delay: 0.35, color: palette.bauhaus.blue, reverse: false },
  { d: pathMobileToAgentLow, delay: 0.55, color: palette.bauhaus.blue, reverse: true },
  { d: pathConsoleToAgent, delay: 0.85, color: palette.bauhaus.red, reverse: false },
  { d: pathAgentToTools, delay: 1.1, color: palette.bauhaus.red, reverse: false },
  { d: pathAgentToToolsLow, delay: 1.35, color: palette.bauhaus.yellow, reverse: true },
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
