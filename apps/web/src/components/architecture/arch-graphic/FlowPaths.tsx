import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'

export const pathWebToAgent = 'M 216 78 C 246 80, 274 98, 292 118'
export const pathMobileToAgent = 'M 128 160 C 184 136, 226 132, 266 144'
export const pathMobileToAgentLow = 'M 128 174 C 186 198, 226 198, 272 176'
export const pathConsoleToAgent = 'M 260 252 C 286 238, 294 218, 302 194'
export const pathAgentToTools = 'M 370 144 C 392 132, 411 128, 430 130'
export const pathAgentToToolsLow = 'M 370 168 C 394 178, 412 180, 430 182'

const allPaths = [
  pathWebToAgent,
  pathMobileToAgent,
  pathMobileToAgentLow,
  pathConsoleToAgent,
  pathAgentToTools,
  pathAgentToToolsLow,
]

export function FlowPaths({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion()

  return (
    <g>
      {allPaths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke={palette.bauhaus.black}
          strokeWidth="4"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={reduceMotion || !active ? { pathLength: 1, opacity: 1 } : { pathLength: 1, opacity: 1 }}
          transition={reduceMotion || !active ? undefined : { duration: 0.8, delay: 0.18 + i * 0.08, ease: 'easeOut' }}
        />
      ))}
    </g>
  )
}
