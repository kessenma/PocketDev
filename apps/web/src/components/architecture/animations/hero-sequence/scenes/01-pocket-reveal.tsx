import { palette, fontFamilyTokens } from '@pocketdev/shared/theme'
import { architectureTheme, architectureTokens } from '../../../shared/theme'

const blue = palette.bauhaus.blue
const red = palette.bauhaus.red
const yellow = palette.bauhaus.yellow
const PAPER = architectureTheme.canvas

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
function mapP(v: number, lo: number, hi: number) {
  return clamp((v - lo) / (hi - lo), 0, 1)
}
function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

const POCKET_FILL = `M 120 108 C 118 108, 112 110, 110 116 L 108 140 C 106 180, 104 240, 108 300 C 110 340, 118 370, 130 390 C 145 415, 170 425, 200 428 C 230 430, 260 420, 278 400 C 290 386, 296 365, 298 340 L 302 260 L 304 200 L 306 160 C 307 140, 306 120, 300 112 C 296 108, 290 106, 284 108 Z`
const POCKET_OUTLINE_1 = `M 120 108 C 118 108, 112 110, 110 116 L 108 140 C 106 180, 104 240, 108 300 C 110 340, 118 370, 130 390 C 145 415, 170 425, 200 428 C 230 430, 260 420, 278 400 C 290 386, 296 365, 298 340 L 302 260 L 304 200 L 306 160 C 307 140, 306 120, 300 112 C 296 108, 290 106, 284 108`
const POCKET_OUTLINE_2 = `M 122 110 C 120 110, 114 112, 112 118 L 110 142 C 108 182, 106 242, 110 302 C 112 342, 120 372, 132 392 C 147 417, 172 427, 202 430 C 232 432, 262 422, 280 402 C 292 388, 298 367, 300 342 L 304 262 L 306 202 L 308 162 C 309 142, 308 122, 302 114 C 298 110, 292 108, 286 110`
const WAISTBAND = `M 110 108 L 200 96 L 300 92 L 340 94 L 340 120 L 300 118 L 200 112 L 110 122 Z`
const SEAM_1 = 'M 320 100 C 322 200, 324 300, 320 420 C 318 440, 316 460, 314 480'
const SEAM_2 = 'M 324 100 C 326 200, 328 300, 324 420 C 322 440, 320 460, 318 480'

type Props = {
  /** Normalized 0→1, maps to global hero progress 0→0.28 */
  progress: number
  vpSize: { w: number; h: number }
  isDesktopLayout: boolean
}

export function PocketRevealScene({ progress: p, vpSize, isDesktopLayout }: Props) {
  const { w, h } = vpSize

  // global 0→0.17 → local 0→0.607
  const ballRise = mapP(p, 0, 0.607)
  // global 0.17→0.28 → local 0.607→1.0
  const pocketFade = mapP(p, 0.607, 1.0)
  // Radius grows during pocket fade so it reaches settledR by scene end
  const rProgress = mapP(p, 0.607, 1.0)
  // global 0→0.10 → local 0→0.357
  const circleAlpha = mapP(p, 0, 0.357)

  const settledR = isDesktopLayout ? 54 : 46
  const pS = Math.min(w * 0.5, h * 0.3) / 400
  const pocketR = pS * 32
  const circleR = mix(pocketR, settledR, rProgress)

  const pTx = w / 2 - 200 * pS
  const pTy = h * 0.6 + 80 * pS
  const startY = pTy + 400 * pS
  const peekY = pTy + 70 * pS
  const emergeY = h * 0.5

  // Ball rises: deep inside pocket → peek → center
  const circleX = w / 2
  let circleY: number
  if (ballRise < 0.6) {
    circleY = mix(startY, peekY, ballRise / 0.6)
  } else {
    circleY = mix(peekY, emergeY, (ballRise - 0.6) / 0.4)
  }

  const pocketSlideY = pocketFade * (h * 0.8)

  // Text sweeps in from left → holds at center → exits right, all within scene 01
  const taglineIn     = mapP(p, 0.38, 0.58)
  const taglineInEase = taglineIn < 0.5
    ? 2 * taglineIn * taglineIn
    : 1 - Math.pow(-2 * taglineIn + 2, 2) / 2
  const taglineOut     = mapP(p, 0.70, 0.95)   // ease-in exit: accelerates right
  const taglineOutEase = taglineOut * taglineOut

  const taglineX = taglineOut > 0
    ? w / 2 + w * 0.85 * taglineOutEase          // exits off-screen right
    : mix(-w * 0.3, w / 2, taglineInEase)        // enters from off-screen left
  const taglineOp = taglineOut > 0
    ? 1 - taglineOut                              // fades during exit
    : mapP(p, 0.35, 0.52)                         // fades in during entry
  const taglineY    = h * 0.5 + settledR + 26
  const taglineSize = isDesktopLayout ? 17 : 13
  const textColor   = architectureTokens.colors.text
  const displayFont = fontFamilyTokens.display

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${h}`}
      className="absolute inset-0 block h-full w-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="pocket-triangle-clip">
          <polygon points="148,50 88,170 208,170" />
        </clipPath>
      </defs>

      {/* Pocket — slides off bottom as ball escapes */}
      <g transform={`translate(${pTx}, ${pTy + pocketSlideY}) scale(${pS})`}>
        <path d={POCKET_FILL} fill={PAPER} stroke="none" />
        <path d={POCKET_OUTLINE_1} stroke={blue} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d={POCKET_OUTLINE_2} stroke={blue} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
        <g clipPath="url(#pocket-triangle-clip)">
          {Array.from({ length: 22 }, (_, i) => (
            <line key={i} x1="80" y1={54 + i * 5.5} x2="216" y2={54 + i * 5.5} stroke={yellow} strokeWidth="3" />
          ))}
        </g>
        <rect x="68" y="32" width="14" height="14" fill={red} />
        <path d={WAISTBAND} stroke={blue} strokeWidth="1.5" fill="none" opacity="0.6" />
        <rect x="226" y="94" width="28" height="28" stroke={blue} strokeWidth="1.2" fill="none" opacity="0.5" />
        {Array.from({ length: 5 }, (_, i) => (
          <line key={i} x1={232 + i * 4} y1="98" x2={232 + i * 4} y2="118" stroke={blue} strokeWidth="0.8" opacity="0.4" />
        ))}
        <rect x="30" y="380" width="80" height="100" fill={blue} />
        <rect x="350" y="60" width="30" height="420" fill={blue} />
        <path d={SEAM_1} stroke={blue} strokeWidth="1" strokeDasharray="4 3" fill="none" opacity="0.4" />
        <path d={SEAM_2} stroke={blue} strokeWidth="0.8" strokeDasharray="3 4" fill="none" opacity="0.3" />
      </g>

      {/* Blue circle — rises from pocket, hands off to WhoIsItForScrollScene at center */}
      <circle
        cx={circleX}
        cy={circleY}
        r={Math.max(circleR, 0.1)}
        fill={blue}
        opacity={circleAlpha}
      />

      {/* Tagline — appears after ball settles, carried into scene 02 */}
      <text
        x={taglineX}
        y={taglineY}
        textAnchor="middle"
        fontSize={taglineSize}
        fontWeight="700"
        fill={textColor}
        fontFamily={displayFont}
        letterSpacing="-0.03em"
        opacity={taglineOp}
      >
        {'Built for developers on the '}
        <tspan fontStyle="italic">go</tspan>
      </text>
    </svg>
  )
}
