import { motion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'

/**
 * The total ping-pong cycle of SignalPulse:
 *   forward (2.4s) + repeatDelay (0.4s) + reverse (2.4s) + repeatDelay (0.4s) = 5.6s
 *
 * The phone pulses blue when the signal arrives (~43% through the cycle)
 * and fades back to black when the signal departs (~57%).
 */
const CYCLE = 5.6

export function PhoneShape() {
  return (
    <motion.rect
      x="155"
      y="390"
      width="60"
      height="100"
      rx="10"
      ry="10"
      animate={{
        fill: [
          palette.bauhaus.black,
          palette.bauhaus.black,
          palette.bauhaus.blue,
          palette.bauhaus.blue,
          palette.bauhaus.black,
          palette.bauhaus.black,
        ],
      }}
      transition={{
        duration: CYCLE,
        repeat: Infinity,
        times: [0, 0.38, 0.43, 0.55, 0.60, 1],
        ease: 'easeInOut',
      }}
    />
  )
}
