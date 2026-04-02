import { motion } from 'framer-motion'
import {
  pathMobileToAgent,
  pathMobileToAgentLow,
  pathAgentToAI,
  pathAgentToAILow,
} from './FlowPaths'

const DURATION = 2.0

/**
 * Animated dashes that travel along the connection paths,
 * mirroring the hero graphic's SignalPulse style.
 *
 * Top paths flow forward (mobile→agent→AI),
 * bottom paths flow in reverse (AI→agent→mobile),
 * creating a continuous bidirectional loop.
 */

const pulses = [
  { d: pathMobileToAgent, delay: 0, color: '#2D5FE5', reverse: false },
  { d: pathMobileToAgentLow, delay: 0.3, color: '#2D5FE5', reverse: true },
  { d: pathAgentToAI, delay: 0.6, color: '#D93025', reverse: false },
  { d: pathAgentToAILow, delay: 0.9, color: '#D93025', reverse: true },
]

export function DataPulse() {
  return (
    <g>
      {pulses.map(({ d, delay, color, reverse }, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.08 1"
          initial={{ strokeDashoffset: reverse ? 0 : 1 }}
          animate={{ strokeDashoffset: reverse ? 1 : 0 }}
          transition={{
            duration: DURATION,
            delay,
            repeat: Infinity,
            repeatType: 'mirror',
            repeatDelay: 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </g>
  )
}
