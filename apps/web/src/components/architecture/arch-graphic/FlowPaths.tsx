import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'

export const pathWebToAgent = 'M 216 78 C 246 80, 274 98, 292 118'
export const pathMobileToAgent = 'M 128 160 C 184 136, 226 132, 266 144'
export const pathMobileToAgentLow = 'M 128 174 C 186 198, 226 198, 272 176'
export const pathConsoleToAgent = 'M 260 252 C 286 238, 294 218, 302 194'
export const pathAgentToFiles = 'M 372 160 C 400 154, 420 154, 446 162'
export const pathAgentToFilesLow = 'M 370 176 C 398 190, 420 192, 446 188'
export const pathAgentToProvider = 'M 368 136 C 438 96, 500 90, 552 108'
export const pathAgentToProviderLow = 'M 370 148 C 438 126, 500 130, 552 146'

const allPaths = [
  pathMobileToAgent,
  pathMobileToAgentLow,
  pathConsoleToAgent,
  pathAgentToFiles,
  pathAgentToFilesLow,
  pathAgentToProvider,
  pathAgentToProviderLow,
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
