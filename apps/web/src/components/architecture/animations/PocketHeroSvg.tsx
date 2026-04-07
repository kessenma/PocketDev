import { useRef } from 'react'
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'

const blue = palette.bauhaus.blue
const red = palette.bauhaus.red
const yellow = palette.bauhaus.yellow

const POCKET_CX = 200
const BALL_R = 32
const BALL_HIDDEN_Y = 400 // deep inside pocket, fully behind fill
const BALL_PEEK_Y = 70 // peeking just above pocket opening
const BALL_END_Y = -80 // floated well above

// Pocket fill path — closed shape matching the outline, filled with background color
// to mask the ball while it's inside the pocket
const POCKET_FILL_PATH = `
  M 120 108
  C 118 108, 112 110, 110 116
  L 108 140
  C 106 180, 104 240, 108 300
  C 110 340, 118 370, 130 390
  C 145 415, 170 425, 200 428
  C 230 430, 260 420, 278 400
  C 290 386, 296 365, 298 340
  L 302 260 L 304 200 L 306 160
  C 307 140, 306 120, 300 112
  C 296 108, 290 106, 284 108
  Z
`

export function PocketHeroSvg({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 1', 'start -0.3'],
  })

  // Ball rises: hidden (0) → peeks out at pocket opening (0.6) → floats above (1)
  const ballY = useTransform(scrollYProgress, [0, 0.6, 1], [BALL_HIDDEN_Y, BALL_PEEK_Y, BALL_END_Y])
  const ballOpacity = useTransform(scrollYProgress, [0, 0.15, 0.5], [0, 0.5, 1])
  // Scales up as it exits
  const ballScale = useTransform(scrollYProgress, [0.3, 1], [0.7, 1])

  const staticBallY = reduceMotion ? BALL_END_Y : undefined
  const staticOpacity = reduceMotion ? 1 : undefined

  return (
    <div ref={containerRef} className={className}>
      <svg
        viewBox="0 0 400 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible"
        aria-label="PocketDev pocket illustration"
      >
        {/* Small red square — upper left accent */}
        <rect x="68" y="32" width="14" height="14" fill={red} />

        {/* Blue ball — AI emerging from pocket (behind pocket fill) */}
        {reduceMotion ? (
          <circle cx={POCKET_CX} cy={staticBallY} r={BALL_R} fill={blue} opacity={staticOpacity} />
        ) : (
          <motion.circle
            cx={POCKET_CX}
            cy={ballY}
            r={BALL_R}
            fill={blue}
            opacity={ballOpacity}
            style={{ scale: ballScale, transformOrigin: `${POCKET_CX}px 200px` }}
          />
        )}

        {/* Pocket fill — background-colored mask so ball is hidden inside */}
        <path d={POCKET_FILL_PATH} fill="#f7f1e3" stroke="none" />

        {/* Pocket outline — hand-drawn style with slight irregularity */}
        <path
          d="
            M 120 108
            C 118 108, 112 110, 110 116
            L 108 140
            C 106 180, 104 240, 108 300
            C 110 340, 118 370, 130 390
            C 145 415, 170 425, 200 428
            C 230 430, 260 420, 278 400
            C 290 386, 296 365, 298 340
            L 302 260
            L 304 200
            L 306 160
            C 307 140, 306 120, 300 112
            C 296 108, 290 106, 284 108
          "
          stroke={blue}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        {/* Second pocket line for hand-drawn doubled effect */}
        <path
          d="
            M 122 110
            C 120 110, 114 112, 112 118
            L 110 142
            C 108 182, 106 242, 110 302
            C 112 342, 120 372, 132 392
            C 147 417, 172 427, 202 430
            C 232 432, 262 422, 280 402
            C 292 388, 298 367, 300 342
            L 304 262
            L 306 202
            L 308 162
            C 309 142, 308 122, 302 114
            C 298 110, 292 108, 286 110
          "
          stroke={blue}
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
        />

        {/* Yellow triangle — upper left, rendered above pocket fill */}
        <defs>
          <clipPath id="pocket-triangle-clip">
            <polygon points="148,50 88,170 208,170" />
          </clipPath>
        </defs>
        <g clipPath="url(#pocket-triangle-clip)">
          {Array.from({ length: 22 }, (_, i) => (
            <line
              key={i}
              x1="80"
              y1={54 + i * 5.5}
              x2="216"
              y2={54 + i * 5.5}
              stroke={yellow}
              strokeWidth="3"
            />
          ))}
        </g>

        {/* Waistband / top edge */}
        <path
          d="
            M 110 108
            L 200 96
            L 300 92
            L 340 94
            L 340 120
            L 300 118
            L 200 112
            L 110 122
            Z
          "
          stroke={blue}
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        {/* Belt loop / vertical stitching detail */}
        <rect x="226" y="94" width="28" height="28" stroke={blue} strokeWidth="1.2" fill="none" opacity="0.5" />
        {/* Vertical stitch lines inside belt loop */}
        {Array.from({ length: 5 }, (_, i) => (
          <line
            key={`stitch-${i}`}
            x1={232 + i * 4}
            y1="98"
            x2={232 + i * 4}
            y2="118"
            stroke={blue}
            strokeWidth="0.8"
            opacity="0.4"
          />
        ))}

        {/* Solid blue rectangle — bottom left */}
        <rect x="30" y="380" width="80" height="100" fill={blue} />

        {/* Solid blue vertical bar — right side */}
        <rect x="350" y="60" width="30" height="420" fill={blue} />

        {/* Side seam stitching — right side of pocket */}
        <path
          d="M 320 100 C 322 200, 324 300, 320 420 C 318 440, 316 460, 314 480"
          stroke={blue}
          strokeWidth="1"
          strokeDasharray="4 3"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M 324 100 C 326 200, 328 300, 324 420 C 322 440, 320 460, 318 480"
          stroke={blue}
          strokeWidth="0.8"
          strokeDasharray="3 4"
          fill="none"
          opacity="0.3"
        />
      </svg>
    </div>
  )
}
