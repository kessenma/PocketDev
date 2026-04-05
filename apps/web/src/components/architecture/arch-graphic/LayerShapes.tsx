import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export function LayerShapes({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion()

  return (
    <g>
      <motion.rect
        x="250"
        y="72"
        width="240"
        height="148"
        rx="18"
        fill="none"
        stroke="#71717a"
        strokeWidth="1.5"
        strokeDasharray="7 5"
        opacity={0.55}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={
          reduceMotion || !active
            ? { opacity: 0.55, strokeDashoffset: 0 }
            : { opacity: 0.55, strokeDashoffset: [0, -24] }
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
        transition={reduceMotion ? undefined : { duration: 0.45, delay: 0.05, ease: 'easeOut' }}
      >
        <rect x="72" y="62" width="144" height="24" rx="8" fill={palette.bauhaus.yellow} />
        <motion.rect
          x="88"
          y="69"
          width="36"
          height="8"
          rx="3"
          fill={palette.bauhaus.black}
          animate={reduceMotion || !active ? { x: 88 } : { x: [88, 164, 88] }}
          transition={reduceMotion || !active ? undefined : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>

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
        <rect x="430" y="110" width="56" height="92" rx="8" fill={palette.bauhaus.black} />
        <rect x="430" y="110" width="56" height="18" rx="8" fill={palette.bauhaus.yellow} />
        <motion.rect
          x="444"
          y="138"
          width="28"
          height="28"
          rx="4"
          fill={palette.bauhaus.red}
          animate={reduceMotion || !active ? { opacity: 1, scale: 1 } : { opacity: [1, 0.65, 1], scale: [1, 0.94, 1] }}
          transition={reduceMotion || !active ? undefined : { duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '458px 152px' }}
        />
        <motion.rect
          x="444"
          y="174"
          width="20"
          height="8"
          rx="4"
          fill="rgba(255,255,255,0.92)"
          animate={reduceMotion || !active ? { width: 20 } : { width: [20, 28, 20] }}
          transition={reduceMotion || !active ? undefined : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <rect x="468" y="174" width="8" height="8" rx="4" fill={palette.bauhaus.blue} />
      </motion.g>
    </g>
  )
}
