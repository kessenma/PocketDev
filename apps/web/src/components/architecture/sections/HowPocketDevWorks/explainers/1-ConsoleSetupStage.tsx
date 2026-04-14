import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { measureTextWidth } from '../../../shared/pretext-measure'
import { architectureFonts } from '../../../shared/theme'
import { BauhausLaptop } from '../shared/BauhausLaptop'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mapProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

// Easing
function easeOut(t: number) {
  return 1 - (1 - t) * (1 - t)
}

// Light text for content inside the dark laptop screen
const SCREEN_TEXT = 'rgba(255,255,255,0.88)'
const SCREEN_TEXT_DIM = 'rgba(255,255,255,0.5)'

// SSH + install lines that type out inside the terminal
const SSH_LINE = '$ ssh root@203.0.113.5'
const PROMPT_LINE = 'root@server:~#'
const CURL_LINE = '# curl -fsSL pocketdev.run/install.sh | bash'
const URL_LINE = '→ http://203.0.113.5:4387/PocketDev/setup'

// Form field layout (relative to screen inner area, centered)
const FIELDS = [
  { label: 'Email', yOffset: -28 },
  { label: 'Password', yOffset: -4 },
  { label: 'Confirm', yOffset: 20 },
] as const

// Install progress steps
const INSTALL_STEPS = [
  'Installing packages',
  'Setting up Bun',
  'Downloading agent',
  'Starting service',
] as const

export function ConsoleSetupStage({
  progress,
  active = false,
  hideLaptop = false,
}: {
  progress: number
  active?: boolean
  hideLaptop?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const p = reduceMotion ? 1 : progress

  // --- Timeline segments ---
  // Everything must complete by p≈0.82 (holdRatio) so the overlay can take over during slide
  const zoomP = easeOut(mapProgress(p, 0.0, 0.10))
  const sshP = mapProgress(p, 0.08, 0.18)
  const curlP = mapProgress(p, 0.18, 0.24)
  const installP = mapProgress(p, 0.24, 0.36)
  const urlP = mapProgress(p, 0.36, 0.44)
  const morphP = mapProgress(p, 0.44, 0.52)
  const formFillP = mapProgress(p, 0.50, 0.62)
  const tapP = mapProgress(p, 0.62, 0.68)
  const dashboardP = mapProgress(p, 0.68, 0.82)
  // --- Laptop zoom ---
  // viewBox is 420x320. Laptop origin (hinge) needs to be far enough down
  // that screen top (origin - 125*scale) stays in bounds.
  const laptopScale = mix(0.7, 1.42, zoomP)
  const laptopCx = 210
  const laptopCy = mix(170, 200, zoomP)

  // --- Blue circle — "agent born" after Create Account tap ---
  // Appears at button center during tap, flies RIGHT and outside the laptop
  // so the overlay can pick it up behind the laptop during the slide transition.
  const circleBirthP = clamp((p - 0.66) / 0.01, 0, 1) // instant pop during tap
  const circleGrowP = easeOut(clamp((p - 0.68) / 0.10, 0, 1)) // grow after tap completes
  const circleMoveP = easeOut(clamp((p - 0.68) / 0.10, 0, 1)) // move with grow
  // Start: Create Account button center in laptop-local coords (0, -19)
  // End: right side, outside laptop bounds (120, -65) — center-right of laptop body
  const circleLocalCx = mix(0, 120, circleMoveP)
  const circleLocalCy = mix(-19, -65, circleMoveP)
  const circleR = mix(4, 28, circleGrowP)
  // Convert laptop-local to viewBox coords
  const circleCx = laptopCx + circleLocalCx * laptopScale
  const circleCy = laptopCy + circleLocalCy * laptopScale
  const circleVbR = circleR * laptopScale

  // Screen inner bounds (from BauhausLaptop: w=180, h=120, screen inner starts at +8,+8 and is 164x104)
  // In local coords: x=-82..82, y=-117..-13
  const screenCx = 0
  const screenCy = -65 // center of screen inner area

  // --- Terminal phase ---
  const showTerminal = morphP < 1
  const terminalOpacity = 1 - morphP

  // SSH text
  const sshTyped = SSH_LINE.slice(0, Math.round(SSH_LINE.length * sshP))
  const showPrompt = sshP >= 1

  // Curl text
  const curlTyped = curlP > 0 ? CURL_LINE.slice(0, Math.round(CURL_LINE.length * curlP)) : ''

  // Install progress
  const stepsComplete = Math.floor(installP * INSTALL_STEPS.length)

  // URL
  const showUrl = urlP > 0

  // --- Form phase ---
  const showForm = morphP > 0
  const formOpacity = morphP

  // Tap animation
  const tapX = screenCx
  const tapY = screenCy + 42
  const showTap = tapP > 0.1 && tapP < 0.95

  // Dashboard
  const showDashboard = dashboardP > 0

  return (
    <>
      <g opacity={hideLaptop || !active ? 0 : 1}>
      <BauhausLaptop cx={laptopCx} cy={laptopCy} scale={laptopScale}>
      {/* Traffic light dots — terminal flavor */}
      <circle cx={-74} cy={-112} r={3} fill={palette.bauhaus.red} />
      <circle cx={-63} cy={-112} r={3} fill={palette.bauhaus.yellow} />
      <circle cx={-52} cy={-112} r={3} fill={palette.bauhaus.blue} />

      {/* ─── Terminal content ─── */}
      {showTerminal && (
        <g opacity={terminalOpacity}>
          {/* SSH line */}
          <text
            x={-74}
            y={-96}
            fontFamily={architectureFonts.mono}
            fontSize="6.5"
            fill={SCREEN_TEXT}
          >
            {sshTyped}
          </text>

          {/* Blinking cursor after SSH — x measured via Canvas instead of char-count estimate */}
          {sshP > 0 && sshP < 1 && (
            <motion.rect
              x={-74 + measureTextWidth(sshTyped, `6.5px ${architectureFonts.mono}`)}
              y={-101}
              width={4}
              height={7}
              fill={palette.bauhaus.yellow}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}

          {/* Server prompt */}
          {showPrompt && (
            <text
              x={-74}
              y={-86}
              fontFamily={architectureFonts.mono}
              fontSize="6.5"
              fill={palette.bauhaus.yellow}
            >
              {PROMPT_LINE}
            </text>
          )}

          {/* Curl command */}
          {curlP > 0 && (
            <text
              x={-74}
              y={-76}
              fontFamily={architectureFonts.mono}
              fontSize="5.8"
              fill={SCREEN_TEXT}
            >
              {curlTyped}
            </text>
          )}

          {/* Install progress bars */}
          {installP > 0 && INSTALL_STEPS.map((step, i) => {
            const stepP = clamp((installP - i * 0.25) / 0.25, 0, 1)
            if (stepP <= 0) return null
            const barY = -64 + i * 11
            return (
              <g key={step}>
                <text
                  x={-74}
                  y={barY}
                  fontFamily={architectureFonts.mono}
                  fontSize="5"
                  fill="rgba(255,255,255,0.5)"
                >
                  {step}
                </text>
                {/* Progress bar track */}
                <rect
                  x={-10}
                  y={barY - 5}
                  width={84}
                  height={4}
                  rx={2}
                  fill="rgba(255,255,255,0.08)"
                />
                {/* Progress bar fill */}
                <rect
                  x={-10}
                  y={barY - 5}
                  width={84 * stepP}
                  height={4}
                  rx={2}
                  fill={stepP >= 1 ? palette.bauhaus.blue : palette.bauhaus.yellow}
                />
                {/* Checkmark dot */}
                {stepP >= 1 && i < stepsComplete && (
                  <circle
                    cx={80}
                    cy={barY - 3}
                    r={2.5}
                    fill={palette.bauhaus.blue}
                  />
                )}
              </g>
            )
          })}

          {/* URL output */}
          {showUrl && (
            <>
              {/* Glow behind URL */}
              <motion.rect
                x={-76}
                y={-25}
                width={152}
                height={12}
                rx={4}
                fill={palette.bauhaus.yellow}
                animate={{ opacity: urlP > 0.8 ? [0.08, 0.14, 0.08] : urlP * 0.1 }}
                transition={
                  urlP > 0.8
                    ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              />
              <text
                x={screenCx}
                y={-17}
                textAnchor="middle"
                fontFamily={architectureFonts.mono}
                fontSize="6"
                fontWeight="700"
                fill={palette.bauhaus.yellow}
              >
                {URL_LINE}
              </text>
            </>
          )}
        </g>
      )}

      {/* ─── Form content ─── */}
      {showForm && !showDashboard && (
        <g opacity={formOpacity}>
          {/* Title */}
          <text
            x={screenCx}
            y={screenCy - 42}
            textAnchor="middle"
            fontFamily="var(--font-sans), sans-serif"
            fontSize="7"
            fontWeight="700"
            fill={SCREEN_TEXT}
          >
            Create Admin Account
          </text>

          {/* Form fields */}
          {FIELDS.map((field, i) => {
            const fieldReveal = clamp((formFillP - i * 0.2) / 0.4, 0, 1)
            const fieldY = screenCy + field.yOffset
            return (
              <g key={field.label} opacity={fieldReveal > 0 ? 1 : 0}>
                {/* Label */}
                <text
                  x={-52}
                  y={fieldY - 3}
                  fontFamily="var(--font-sans), sans-serif"
                  fontSize="4.5"
                  fill={SCREEN_TEXT_DIM}
                >
                  {field.label}
                </text>
                {/* Field rect */}
                <rect
                  x={-52}
                  y={fieldY}
                  width={104}
                  height={14}
                  rx={4}
                  fill="rgba(255,255,255,0.06)"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="0.8"
                />
                {/* Fill indicator — yellow cursor dot that extends */}
                {fieldReveal > 0 && (
                  <rect
                    x={-48}
                    y={fieldY + 4}
                    width={Math.min(fieldReveal * 60, 58)}
                    height={5}
                    rx={2.5}
                    fill={i === 0 ? palette.bauhaus.yellow : 'rgba(255,255,255,0.4)'}
                    opacity={0.7}
                  />
                )}
              </g>
            )
          })}

          {/* Create Account button */}
          <motion.rect
            x={-30}
            y={screenCy + 36}
            width={60}
            height={16}
            rx={6}
            fill={palette.bauhaus.yellow}
            animate={{
              opacity: formFillP > 0.8 ? 1 : formFillP * 0.5,
              scale: tapP > 0.3 && tapP < 0.7 ? 0.95 : 1,
            }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ transformOrigin: `${screenCx}px ${screenCy + 44}px` }}
          />
          <text
            x={screenCx}
            y={screenCy + 47}
            textAnchor="middle"
            fontFamily="var(--font-sans), sans-serif"
            fontSize="5.5"
            fontWeight="700"
            fill={palette.bauhaus.black}
            opacity={formFillP > 0.8 ? 1 : 0}
          >
            Create Account
          </text>

          {/* Tap ripple rings on Create Account button */}
          {showTap && (
            <>
              {tapP > 0.5 && [0, 1].map((ring) => (
                <motion.circle
                  key={ring}
                  cx={tapX}
                  cy={tapY + 4}
                  r={6 + ring * 6}
                  fill="none"
                  stroke={palette.bauhaus.blue}
                  strokeWidth="1.2"
                  animate={{
                    opacity: [0.7, 0],
                    scale: [0.8, 1.4],
                  }}
                  transition={{
                    duration: 0.4,
                    ease: 'easeOut',
                    delay: ring * 0.1,
                  }}
                  style={{ transformOrigin: `${tapX}px ${tapY + 4}px` }}
                />
              ))}
            </>
          )}
        </g>
      )}

      {/* ─── Dashboard content ─── */}
      {showDashboard && (
        <g opacity={dashboardP}>
          {/* Header bar */}
          <rect
            x={-78}
            y={-112}
            width={156}
            height={18}
            rx={4}
            fill="rgba(255,255,255,0.06)"
          />
          {/* Yellow server icon */}
          <rect
            x={-72}
            y={-109}
            width={12}
            height={12}
            rx={3}
            fill={palette.bauhaus.yellow}
          />
          {/* Header text lines */}
          <rect x={-56} y={-108} width={40} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={-56} y={-103} width={24} height={2.5} rx={1} fill="rgba(255,255,255,0.25)" />
          {/* Status badges */}
          <rect x={20} y={-108} width={18} height={6} rx={3} fill={palette.bauhaus.yellow} opacity={0.7} />
          <rect x={42} y={-108} width={14} height={6} rx={3} fill={palette.bauhaus.blue} opacity={0.5} />

          {/* Card grid — 2 columns */}
          {/* Left card — Connection / QR */}
          <rect
            x={-78}
            y={-88}
            width={74}
            height={66}
            rx={6}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.6"
          />
          <text
            x={-70}
            y={-78}
            fontFamily="var(--font-sans), sans-serif"
            fontSize="4.5"
            fontWeight="600"
            fill="rgba(255,255,255,0.6)"
          >
            Pairing
          </text>


          {/* Right card — Devices */}
          <rect
            x={2}
            y={-88}
            width={74}
            height={66}
            rx={6}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.6"
          />
          <text
            x={10}
            y={-78}
            fontFamily="var(--font-sans), sans-serif"
            fontSize="4.5"
            fontWeight="600"
            fill="rgba(255,255,255,0.6)"
          >
            Devices
          </text>
          {/* Device list placeholders */}
          {[0, 1, 2].map((i) => (
            <g key={`device-${i}`}>
              <rect
                x={10}
                y={-70 + i * 16}
                width={58}
                height={12}
                rx={4}
                fill="rgba(255,255,255,0.04)"
              />
              <circle
                cx={18}
                cy={-64 + i * 16}
                r={3}
                fill={i === 0 ? palette.bauhaus.blue : 'rgba(255,255,255,0.15)'}
              />
              <rect
                x={24}
                y={-66 + i * 16}
                width={i === 0 ? 30 : 20 + i * 4}
                height={3}
                rx={1.5}
                fill={i === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'}
              />
            </g>
          ))}

          {/* Console label */}
          <text
            x={screenCx}
            y={-17}
            textAnchor="middle"
            fontFamily={architectureFonts.body}
            fontSize="5"
            letterSpacing="0.16em"
            fill={SCREEN_TEXT_DIM}
          >
            SERVER CONTROL BOARD
          </text>
        </g>
      )}
    </BauhausLaptop>

      {/* Blue circle — rendered after laptop so it paints on top */}
      {circleBirthP > 0 && (
        <circle
          cx={circleCx}
          cy={circleCy}
          r={circleVbR}
          fill={palette.bauhaus.blue}
        />
      )}
    </g>
    </>
  )
}
