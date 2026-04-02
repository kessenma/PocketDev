import { motion } from 'framer-motion'
import { routePaths } from './RoutingLines'

const PULSE_DURATION = 2.4
const STAGGER = 0.12

/**
 * Animated pulse that ping-pongs along each routing line,
 * simulating bidirectional communication between server and phone.
 * Uses stroke-dashoffset with repeatType "mirror" so the dash
 * travels forward then reverses back.
 */
export function SignalPulse() {
  return (
    <g>
      {routePaths.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="#2D5FE5"
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.06 1"
          initial={{ strokeDashoffset: 1 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{
            duration: PULSE_DURATION,
            delay: i * STAGGER,
            repeat: Infinity,
            repeatType: 'mirror',
            repeatDelay: 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </g>
  )
}
