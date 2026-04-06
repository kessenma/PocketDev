import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens } from '../../shared/theme'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export function DiagramLayers({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion()

  return (
    <g>
      <motion.rect
        x="250"
        y="72"
        width="250"
        height="148"
        rx="18"
        fill="none"
        stroke={architectureTokens.colors.borderStrong}
        strokeWidth="1.5"
        strokeDasharray="7 5"
        opacity={0.78}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={
          reduceMotion || !active
            ? { opacity: 0.78, strokeDashoffset: 0 }
            : { opacity: 0.78, strokeDashoffset: [0, -24] }
        }
        transition={
          reduceMotion || !active
            ? undefined
            : { opacity: { duration: 0.45 }, strokeDashoffset: { duration: 4, repeat: Infinity, ease: 'linear' } }
        }
      />

      <motion.g
        variants={fadeUp}
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
        transition={reduceMotion ? undefined : { duration: 0.45, delay: 0.14, ease: 'easeOut' }}
      >
        <motion.rect
          x="72"
          y="120"
          width="56"
          height="92"
          rx="12"
          fill={palette.bauhaus.black}
          animate={
            reduceMotion || !active
              ? { fill: palette.bauhaus.black }
              : {
                  fill: [
                    palette.bauhaus.black,
                    palette.bauhaus.black,
                    palette.bauhaus.blue,
                    palette.bauhaus.black,
                  ],
                }
          }
          transition={reduceMotion || !active ? undefined : { duration: 4.8, repeat: Infinity, times: [0, 0.35, 0.6, 1], ease: 'easeInOut' }}
        />
        <rect x="92" y="132" width="16" height="4" rx="2" fill="rgba(255,255,255,0.85)" />
      </motion.g>

      <motion.g
        variants={fadeUp}
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
        transition={reduceMotion ? undefined : { duration: 0.45, delay: 0.22, ease: 'easeOut' }}
      >
        <rect x="110" y="236" width="150" height="34" rx="10" fill={palette.bauhaus.red} />
        <rect x="124" y="247" width="56" height="10" rx="4" fill="rgba(255,255,255,0.88)" />
        <motion.rect
          x="194"
          y="247"
          width="28"
          height="10"
          rx="4"
          fill={palette.bauhaus.yellow}
          animate={reduceMotion || !active ? { x: 194 } : { x: [194, 220, 194] }}
          transition={reduceMotion || !active ? undefined : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>

      <motion.circle
        cx="316"
        cy="156"
        r="54"
        fill={palette.bauhaus.blue}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.78 }}
        animate={
          reduceMotion || !active
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: [1, 1.05, 1] }
        }
        transition={
          reduceMotion || !active
            ? undefined
            : {
                opacity: { duration: 0.5, delay: 0.28 },
                scale: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.28 },
              }
        }
        style={{ transformOrigin: '316px 156px' }}
      />

      <motion.g
        initial={reduceMotion ? false : { opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={reduceMotion ? undefined : { duration: 0.5, delay: 0.36, ease: 'easeOut' }}
      >
        <rect x="448" y="132" width="52" height="68" rx="8" fill={palette.bauhaus.black} />
        <rect x="448" y="132" width="52" height="16" rx="8" fill={palette.bauhaus.yellow} />
        <motion.rect
          x="460"
          y="156"
          width="28"
          height="10"
          rx="4"
          fill="rgba(255,255,255,0.92)"
          animate={reduceMotion || !active ? { width: 28 } : { width: [28, 20, 28] }}
          transition={reduceMotion || !active ? undefined : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.rect
          x="460"
          y="174"
          width="20"
          height="10"
          rx="4"
          fill={palette.bauhaus.blue}
          animate={reduceMotion || !active ? { width: 20 } : { width: [20, 28, 20] }}
          transition={reduceMotion || !active ? undefined : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>

      <motion.g
        initial={reduceMotion ? false : { opacity: 0, x: 16, y: -6 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={reduceMotion ? undefined : { duration: 0.5, delay: 0.46, ease: 'easeOut' }}
      >
        <rect x="552" y="92" width="46" height="72" rx="10" fill={palette.bauhaus.black} />
        <rect x="552" y="92" width="46" height="18" rx="10" fill={palette.bauhaus.red} />
        <motion.rect
          x="565"
          y="120"
          width="20"
          height="20"
          rx="4"
          fill={palette.bauhaus.yellow}
          animate={reduceMotion || !active ? { opacity: 1, scale: 1 } : { opacity: [1, 0.65, 1], scale: [1, 0.94, 1] }}
          transition={reduceMotion || !active ? undefined : { duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '575px 130px' }}
        />
        <motion.rect
          x="562"
          y="146"
          width="26"
          height="8"
          rx="4"
          fill="rgba(255,255,255,0.92)"
          animate={reduceMotion || !active ? { width: 26 } : { width: [26, 16, 26] }}
          transition={reduceMotion || !active ? undefined : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>
    </g>
  )
}
