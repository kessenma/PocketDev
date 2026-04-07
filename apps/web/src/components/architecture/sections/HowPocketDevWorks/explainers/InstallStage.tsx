import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { architectureFonts, architectureTokens } from '../../../shared/theme'
import { ExplainerBackdrop } from './ExplainerStage'
import { EXPLAINER_TIMINGS } from './constants'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mapProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

const SCRIPT = 'curl -fsSL https://pocketdev.run/install.sh | bash'

export function InstallStage({
  active,
  progress,
}: {
  active: boolean
  progress: number
}) {
  const reduceMotion = useReducedMotion()
  const sceneProgress = reduceMotion ? 1 : progress
  const shellReveal = mapProgress(sceneProgress, 0.04, 0.24)
  const tapProgress = mapProgress(sceneProgress, 0.3, 0.58)
  const birthProgress = mapProgress(sceneProgress, 0.35, 0.7)
  const settled = birthProgress > 0.96
  const tapX = 296
  const tapY = 106
  const agentX = 184
  const agentY = 42
  const agentScale = mix(0, 1, birthProgress)
  const agentOpacity = birthProgress
  const takeoverScale = mix(0.18, 7.8, birthProgress)

  return (
    <>
      <ExplainerBackdrop hideFrame />

      <motion.circle
        cx={agentX}
        cy={agentY}
        r="28"
        fill={palette.bauhaus.blue}
        animate={{
          opacity: birthProgress * 0.18,
          scale: takeoverScale,
        }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        style={{ transformOrigin: `${agentX}px ${agentY}px` }}
      />

      <motion.rect
        x="22"
        y="58"
        width="264"
        height="82"
        rx="22"
        fill="rgba(255,255,255,0.22)"
        stroke={architectureTokens.colors.border}
        strokeWidth="1.5"
        animate={{
          opacity: shellReveal,
          scale: tapProgress > 0.72 ? [1, 0.985, 1] : 1,
        }}
        transition={
          tapProgress > 0.72 && !reduceMotion
            ? { duration: EXPLAINER_TIMINGS.short, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }
            : { duration: 0.22, ease: 'easeOut' }
        }
        style={{ transformOrigin: '154px 99px' }}
      />
      <motion.circle
        cx="56"
        cy="78"
        r="4"
        fill={palette.bauhaus.red}
        animate={{ opacity: shellReveal }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      />
      <motion.circle
        cx="70"
        cy="78"
        r="4"
        fill={palette.bauhaus.yellow}
        animate={{ opacity: shellReveal }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      />
      <motion.circle
        cx="84"
        cy="78"
        r="4"
        fill={palette.bauhaus.blue}
        animate={{ opacity: shellReveal }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      />

      <motion.text
        x="154"
        y="106"
        textAnchor="middle"
        fontFamily={architectureFonts.mono}
        fontSize="8.3"
        fill={architectureTokens.colors.text}
        animate={{ opacity: shellReveal }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        {SCRIPT}
      </motion.text>

      <motion.text
        x="160"
        y="164"
        textAnchor="middle"
        fontFamily={architectureFonts.body}
        fontSize="10"
        letterSpacing="0.12em"
        fill={architectureTokens.colors.textSecondary}
        animate={{ opacity: shellReveal }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        SELF-HOSTED UBUNTU SERVER
      </motion.text>

      <motion.circle
        cx={tapX}
        cy={tapY}
        r="11"
        fill={palette.bauhaus.black}
        animate={
          tapProgress > 0.7 && active && !reduceMotion
            ? { opacity: [0.92, 0.92, 0.92], scale: [1, 1.08, 1] }
            : { opacity: tapProgress > 0 ? 0.92 : 0, scale: 1 }
        }
        transition={
          tapProgress > 0.7 && active && !reduceMotion
            ? { duration: 0.46, ease: 'easeInOut' }
            : { duration: 0.16, ease: 'easeOut' }
        }
        style={{ transformOrigin: `${tapX}px ${tapY}px` }}
      />
      <motion.rect
        x={tapX - 4}
        y={tapY + 5}
        width="8"
        height="18"
        rx="4"
        fill={palette.bauhaus.black}
        animate={{
          opacity: tapProgress > 0.12 ? 0.92 : 0,
          scaleY: tapProgress > 0.7 && active && !reduceMotion ? [1, 1.04, 1] : 1,
        }}
        transition={
          tapProgress > 0.7 && active && !reduceMotion
            ? { duration: 0.46, ease: 'easeInOut' }
            : { duration: 0.16, ease: 'easeOut' }
        }
        style={{ transformOrigin: `${tapX}px ${tapY + 14}px` }}
      />
      {[0, 1].map((ring) => (
        <motion.circle
          key={ring}
          cx={tapX}
          cy={tapY}
          r={8 + ring * 8}
          fill="none"
          stroke={architectureTokens.colors.blue}
          strokeWidth="1.5"
          animate={{
            opacity: tapProgress > 0.7 ? [0.75, 0] : 0,
            scale: tapProgress > 0.7 ? [0.8, 1.35] : 1,
          }}
          transition={
            tapProgress > 0.7 && !reduceMotion
              ? {
                  duration: 0.42,
                  ease: 'easeOut',
                  delay: ring * 0.12,
                }
              : { duration: 0.18, ease: 'easeOut' }
          }
          style={{ transformOrigin: `${tapX}px ${tapY}px` }}
        />
      ))}

      <motion.path
        d="M 286 88 C 262 68, 230 50, 196 44"
        fill="none"
        stroke={architectureTokens.colors.border}
        strokeDasharray="5 6"
        strokeWidth="1.5"
        strokeLinecap="round"
        pathLength={1}
        animate={{ opacity: birthProgress * 0.9, pathLength: birthProgress }}
        transition={{ duration: 0.22, ease: 'linear' }}
      />

      <motion.circle
        cx={agentX}
        cy={agentY}
        r="18"
        fill={palette.bauhaus.blue}
        animate={
          settled && active && !reduceMotion
            ? { scale: [1, 1.08, 1], opacity: [0.92, 1, 0.92] }
            : { scale: agentScale, opacity: agentOpacity }
        }
        transition={
          settled && active && !reduceMotion
            ? { duration: EXPLAINER_TIMINGS.long, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.24, ease: 'easeOut' }
        }
        style={{ transformOrigin: `${agentX}px ${agentY}px` }}
      />
      <motion.circle
        cx={agentX}
        cy={agentY}
        r="30"
        fill={palette.bauhaus.blue}
        animate={{ opacity: birthProgress * 0.14, scale: agentScale }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        style={{ transformOrigin: `${agentX}px ${agentY}px` }}
      />
    </>
  )
}
