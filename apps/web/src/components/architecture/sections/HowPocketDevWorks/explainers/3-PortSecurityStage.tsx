import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { SvgAutoWrapText } from '../../../shared/SvgAutoWrapText'
import { architectureTokens, architectureFonts } from '../../../shared/theme'
import { BauhausPhone } from '../shared/BauhausPhone'
import { BauhausLaptop } from '../shared/BauhausLaptop'

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}
function mapP(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}
function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t)
}
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

// ── Door geometry ─────────────────────────────────────────────────────────────
const DOOR_W = 120
const DOOR_H = 210

// ── Bauhaus key SVG paths (from bauhaus_key.svg) ──────────────────────────────
// Combined transform M1*M2 ≈ translate(0, -350) so phone-local coords are:
//   x_phone = (x_path - KEY_OX) * KEY_S
//   y_phone = (y_path - KEY_OY) * KEY_S
const KEY_S  = 0.033
const KEY_OX = 494    // x center of bounding box in path coords
const KEY_OY = 498.5  // y center (after -350 shift)

// Key geometry in path coords:
//   Bow center x ≈ 207, Bit right x ≈ 896
//   → phone-local: bit right ≈ 13.3, bow-to-bit = 22.8 units
const BIT_RIGHT_PHONE  = (896 - KEY_OX) * KEY_S  // ≈ 13.3
const BOW_CY_PHONE     = (488 - KEY_OY) * KEY_S  // ≈ -0.3 ≈ 0

// Outer bow silhouette only (first subpath of the blue compound path)
const BOW_OUTER_D = 'M321.93,458.121L321.93,518.867C314.168,519.782 310.87,521.776 305.502,525.59C288.143,537.921 283.024,595.877 235.585,612.239C169.571,635.007 149.386,601.716 142.062,597.986C140.764,597.325 124.869,580.513 121.642,576.679C116.926,571.076 92.38,541.914 92.211,489.985C92.016,430.309 116.045,406.385 127.855,393.049C130.57,389.984 146.788,373.477 153.042,368.828C178.189,350.133 213.828,351.149 230.544,357.877C234.863,359.615 262.799,370.859 276.898,393.058C296.292,423.592 291.464,449.742 321.93,458.121Z'
// Yellow shaft
const SHAFT_D = 'M629.267,532.713C621.669,530.796 613.965,525.711 602.913,525.126C600.575,525.002 396.818,519.3 393.322,519.229C350.869,518.356 332.365,517.636 321.93,518.867L321.93,458.121C329.53,460.211 339.328,461.195 352.246,460.865C359.955,460.668 446.284,458.463 448.604,458.123C454.994,457.187 454.898,457.722 461.162,458.904C466.408,459.895 589.206,460.132 598.711,460.063C619.257,459.914 616.702,450.862 627.574,449.697C628.152,449.635 628.717,449.587 629.267,449.553L629.267,532.713Z'
// Red bit + teeth
const BIT_D = 'M629.267,449.553C648.754,448.332 650.885,463.83 666.159,458.283C675.507,454.888 678.776,460.627 680.493,461.77C687.056,466.139 861.17,463.288 876.05,465.517C887.45,467.225 898.987,492.973 896.401,500.213C893.167,509.262 887.963,517.838 887.082,519.291C884.673,523.261 878.678,522.091 873.983,521.909C843.481,520.723 843.168,521.117 841.553,523.15C839.342,525.932 840.761,612.145 839.797,633.784C839.163,648.007 833.141,646.755 787.672,646.335C749.886,645.986 710.134,646.73 707.451,644.154C701.241,638.193 708.526,524.985 703.521,520.72C701.451,518.956 681.875,518.935 681.045,519.203C677.157,520.46 679.21,528.838 672.615,527.459C660.301,524.883 659.018,517.912 650.801,525.657C642.31,533.662 635.828,534.369 629.267,532.713L629.267,449.553Z'

// Starting shapes as cubic-bezier paths in phone-local coords
const CIRCLE_D   = 'M-12,-4 C-8.686,-4 -6,-1.314 -6,2 C-6,5.314 -8.686,8 -12,8 C-15.314,8 -18,5.314 -18,2 C-18,-1.314 -15.314,-4 -12,-4 Z'
const TRIANGLE_D = 'M0,-7 L5.5,3.5 L-5.5,3.5 Z'
const SQUARE_D   = 'M6,-6 L18,-6 L18,6 L6,6 Z'

type CurveData = (string | number)[][]

interface MorphLib {
  circleCurve:   CurveData
  bowCurve:      CurveData
  triangleCurve: CurveData
  shaftCurve:    CurveData
  squareCurve:   CurveData
  bitCurve:      CurveData
  curveCalc:   (a: CurveData, b: CurveData, t: number) => CurveData
  path2string: (c: CurveData) => string
}

export function PortSecurityStage({
  progress,
  isDesktopLayout,
  hideBlueCircle = false,
  hidePhone = false,
  hideLaptop = false,
  hideDoor = false,
  doorPreviewProgress = 0,
  assetsRevealP = 1,
}: {
  progress: number
  active?: boolean
  isDesktopLayout: boolean
  hideBlueCircle?: boolean
  hidePhone?: boolean
  hideLaptop?: boolean
  hideDoor?: boolean
  doorPreviewProgress?: number
  assetsRevealP?: number
}) {
  const reduceMotion = useReducedMotion()
  const p = reduceMotion ? 1 : progress

  const [vpSize, setVpSize] = useState({ w: 840, h: 1280 })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  // Load svg-morpheus-ts dynamically (has window refs — not SSR-safe at module level)
  const [morphLib, setMorphLib] = useState<MorphLib | null>(null)
  const morphLibLoading = useRef(false)
  useEffect(() => {
    if (morphLibLoading.current) return
    morphLibLoading.current = true
    import('svg-morpheus-ts').then(({ path2curve, path2string, curveCalc }) => {
      function toPhoneLocal(curve: CurveData): CurveData {
        return curve.map(seg => {
          if (seg[0] === 'M') return ['M', ((seg[1] as number) - KEY_OX) * KEY_S, ((seg[2] as number) - KEY_OY) * KEY_S]
          if (seg[0] === 'C') return ['C',
            ((seg[1] as number) - KEY_OX) * KEY_S, ((seg[2] as number) - KEY_OY) * KEY_S,
            ((seg[3] as number) - KEY_OX) * KEY_S, ((seg[4] as number) - KEY_OY) * KEY_S,
            ((seg[5] as number) - KEY_OX) * KEY_S, ((seg[6] as number) - KEY_OY) * KEY_S,
          ]
          return seg
        })
      }
      const bowPhoneD   = path2string(toPhoneLocal(path2curve(BOW_OUTER_D) as CurveData))
      const shaftPhoneD = path2string(toPhoneLocal(path2curve(SHAFT_D) as CurveData))
      const bitPhoneD   = path2string(toPhoneLocal(path2curve(BIT_D) as CurveData))

      const [circleCurve, bowCurve]     = path2curve(CIRCLE_D,   bowPhoneD)   as [CurveData, CurveData]
      const [triangleCurve, shaftCurve] = path2curve(TRIANGLE_D, shaftPhoneD) as [CurveData, CurveData]
      const [squareCurve, bitCurve]     = path2curve(SQUARE_D,   bitPhoneD)   as [CurveData, CurveData]

      setMorphLib({
        circleCurve, bowCurve,
        triangleCurve, shaftCurve,
        squareCurve, bitCurve,
        curveCalc: curveCalc as MorphLib['curveCalc'],
        path2string: path2string as MorphLib['path2string'],
      })
    })
  }, [])

  const viewBox = `0 0 ${vpSize.w} ${vpSize.h}`
  const scale = Math.min(vpSize.w, vpSize.h) / 320
  const animCenterX = vpSize.w / 2
  const animCenterY = vpSize.h * (isDesktopLayout ? 0.42 : 0.40)

  // ── Layout — same as Connect scene end state ──────────────────────────────
  // Desktop: laptop at (-50, 0), phone at (80, -6)
  // Mobile:  laptop at (0, -40), phone at (0, 80)
  const laptopLocalCx = isDesktopLayout ? -50 : 0
  const laptopLocalCy = isDesktopLayout ? 0 : -40
  const laptopScale   = isDesktopLayout ? 0.62 : 0.56

  const phoneCx    = isDesktopLayout ? 80 : 0
  const phoneCy    = isDesktopLayout ? -6 : 80
  const phoneScale = 52 / 60

  // ── Door position — centered over laptop ──────────────────────────────────
  const doorTx = laptopLocalCx  // Desktop: -50, Mobile: 0
  const doorTy = laptopLocalCy  // Desktop:  0,  Mobile: -40

  // ── Timeline ──────────────────────────────────────────────────────────────
  // Door drops in from above. Two drivers, whichever is further along wins:
  //   1. doorPreviewProgress — driven by scene 2's slide-out (0→1, stays at 1)
  //      so the door starts falling while scene 2's text is still exiting.
  //   2. scene-local p — fallback when there was no preroll (e.g. reduced-motion or direct link)
  const doorSlideP  = easeInOut(Math.max(clamp(doorPreviewProgress, 0, 1), mapP(p, 0.00, 0.25)))
  const labelsP     = mapP(p, 0.08, 0.22)
  const morphT      = easeInOut(mapP(p, 0.08, 0.20))  // shapes → key on phone, aligned with text reveal

  const keyDepartP  = mapP(p, 0.40, 0.48)  // key slides from phone to door
  const keyInsertP  = mapP(p, 0.48, 0.51)  // key slides into handle
  const keyTurnP    = mapP(p, 0.51, 0.54)  // key foreshortens into lock
  const doorOpenP   = mapP(p, 0.53, 0.60)
  const consoleRevP = mapP(p, 0.54, 0.60)
  const circleGrowP = mapP(p, 0.00, 0.18)
  const circleMoveP = mapP(p, 0.51, 0.54)

  // ── Door drop-in — falls from above the viewport to its resting position ───
  // Start Y puts the door bottom just above the viewport top in local coords.
  const doorStartY  = doorTy - animCenterY / scale - DOOR_H / 2 - 10
  const doorGroupTy = mix(doorStartY, doorTy, doorSlideP)

  // ── Key wrapper transform — one continuous journey from phone to door ──────
  // Scale factor: match bauhaus key's bow-to-bit distance to phone-local scale
  // Mobile: sDoor = 1.62, Desktop: sDoor = 2.06
  const KEY_S_DOOR = isDesktopLayout ? 2.06 : 1.62

  // TX_DOOR: position key so bit right tip (+ 12 insert units) reaches door knob
  // Door knob at x = doorTx + mix(-DOOR_W/2, DOOR_W/2, 0.14) = doorTx - 43.2 in anim coords
  // TX_DOOR + BIT_RIGHT_PHONE * KEY_S_DOOR + 12 = doorTx - 43.2
  // TX_DOOR = doorTx - 55.2 - BIT_RIGHT_PHONE * KEY_S_DOOR
  // Desktop: -50 - 55.2 - 13.266 * 2.06 ≈ -132.5
  // Mobile:   0 - 55.2 - 13.266 * 1.62 ≈ -76.7
  const TX_DOOR = doorTx - 55.2 - BIT_RIGHT_PHONE * KEY_S_DOOR

  // TY_DOOR: center key vertically at door center
  // Desktop: ~0, Mobile: ~-40
  const TY_DOOR = doorTy - BOW_CY_PHONE * KEY_S_DOOR

  const keyDepartT  = easeInOut(keyDepartP)
  const keyInsertTx = easeInOut(keyInsertP) * 12       // 12 anim-group units toward handle
  const keyTurnScaleX = 1 - easeInOut(keyTurnP)
  const keyTurnFadeOut = easeOutQuad(mapP(keyTurnP, 0.75, 1.0))
  const morphedKeyOpacity = (hidePhone ? 0 : assetsRevealP) * (1 - keyTurnFadeOut)

  // Outer wrapper: phone position → door position
  const wrapTx = mix(phoneCx, TX_DOOR, keyDepartT) + keyInsertTx
  const wrapTy = mix(phoneCy, TY_DOOR, keyDepartT)
  const wrapS  = mix(phoneScale, KEY_S_DOOR, keyDepartT)

  // Foreshortening pivot: bit right edge in phone-local (shrinks key INTO the lock from right)
  const TURN_PIVOT = BIT_RIGHT_PHONE  // ≈ 13.3

  // ── Text layout ──────────────────────────────────────────────────────────
  const subSz   = isDesktopLayout ? Math.min(vpSize.w * 0.015, 20) : Math.min(vpSize.w * 0.04, 18)
  const subLH   = Math.round(subSz * 1.55)
  const subY    = vpSize.h * (isDesktopLayout ? 0.82 : 0.78)
  const subX    = isDesktopLayout ? vpSize.w * 0.58 : vpSize.w * 0.50

  // ── Door geometry (hinge at right side of door face) ─────────────────────
  const HINGE_X    = DOOR_W / 2  // = 60, hinge at right edge relative to door center
  const openAngle  = easeInOut(doorOpenP) * (Math.PI * 0.52)
  const cosA       = Math.cos(openAngle)
  const sinA       = Math.sin(openAngle)
  // Free (left) edge swings rightward as door opens
  // At closed: freeX = HINGE_X - DOOR_W = -60 (relative to doorGroupTx)
  const freeX      = HINGE_X - DOOR_W * cosA
  const yConv      = sinA * 10
  // Door enters solid (opacity 1); only fades out when it swings open
  const doorOpacity = 1 - easeOutQuad(mapP(doorOpenP, 0.72, 1.0))
  const doorFacePoints = [
    `${freeX.toFixed(2)},${(-DOOR_H / 2 + yConv).toFixed(2)}`,
    `${HINGE_X},${-DOOR_H / 2}`,
    `${HINGE_X},${DOOR_H / 2}`,
    `${freeX.toFixed(2)},${(DOOR_H / 2 - yConv).toFixed(2)}`,
  ].join(' ')
  const edgeW = sinA * 6
  const edgeX2 = freeX - (cosA >= 0 ? 1 : -1) * edgeW
  const doorEdgePoints = [
    `${edgeX2.toFixed(2)},${(-DOOR_H / 2 + yConv + 2).toFixed(2)}`,
    `${freeX.toFixed(2)},${(-DOOR_H / 2 + yConv).toFixed(2)}`,
    `${freeX.toFixed(2)},${(DOOR_H / 2 - yConv).toFixed(2)}`,
    `${edgeX2.toFixed(2)},${(DOOR_H / 2 - yConv - 2).toFixed(2)}`,
  ].join(' ')

  // Door face center x (in door-local coords, for text centering)
  // When closed: center = (freeX + HINGE_X) / 2 = (-60 + 60)/2 = 0
  // Text is centered at x=0 in door-local coords (which maps to doorGroupTx in anim-group)
  const doorFaceCenterX = (freeX + HINGE_X) / 2
  // Only show label text while door is mostly closed
  const doorLabelOpacity = doorOpacity

  // Morphed paths (curveCalc at current morphT)
  const morphedBowD   = morphLib ? morphLib.path2string(morphLib.curveCalc(morphLib.circleCurve,   morphLib.bowCurve,   morphT)) : null
  const morphedShaftD = morphLib ? morphLib.path2string(morphLib.curveCalc(morphLib.triangleCurve, morphLib.shaftCurve, morphT)) : null
  const morphedBitD   = morphLib ? morphLib.path2string(morphLib.curveCalc(morphLib.squareCurve,   morphLib.bitCurve,   morphT)) : null

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox}
      className="block h-full w-full"
      style={{ backgroundColor: architectureTokens.colors.paper }}
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="100%" height="100%" fill={architectureTokens.colors.paper} />

      {/* Subtitle — bottom of screen */}
      <SvgAutoWrapText x={subX} y={subY} font={`${subSz}px ${architectureFonts.body}`}
        maxWidth={vpSize.w * (isDesktopLayout ? 0.38 : 0.42)} lineHeight={subLH}
        fill={architectureTokens.colors.textSecondary} fontFamily={architectureFonts.body}
        fontSize={subSz} opacity={labelsP}>
        {'Then optionally lock your server port (for security) and unlock it with the PocketDev mobile app when you need to access it.'}
      </SvgAutoWrapText>

      <g transform={`translate(${animCenterX} ${animCenterY}) scale(${scale})`}>

        {/* ── Laptop — sits behind door ──────────────────────────────────────────── */}
        <g opacity={hideLaptop ? 0 : assetsRevealP}>
        <BauhausLaptop cx={laptopLocalCx} cy={laptopLocalCy} scale={laptopScale}>
          <circle cx={-74} cy={-112} r={3} fill={palette.bauhaus.red} />
          <circle cx={-63} cy={-112} r={3} fill={palette.bauhaus.yellow} />
          <circle cx={-52} cy={-112} r={3} fill={palette.bauhaus.blue} />
          <rect x={-78} y={-112} width={156} height={18} rx={4} fill="rgba(255,255,255,0.06)" />
          <rect x={-72} y={-109} width={12} height={12} rx={3} fill={palette.bauhaus.yellow} />
          <rect x={-56} y={-108} width={40} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={-56} y={-103} width={24} height={2.5} rx={1} fill="rgba(255,255,255,0.25)" />
          <rect x={20}  y={-108} width={18} height={6} rx={3} fill={palette.bauhaus.yellow} opacity={0.7} />
          <rect x={42}  y={-108} width={14} height={6} rx={3} fill={palette.bauhaus.blue} opacity={0.5} />
          <rect x={-78} y={-88} width={74} height={66} rx={6} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
          <text x={-70} y={-78} fontFamily="var(--font-sans), sans-serif" fontSize="4.5" fontWeight="600" fill="rgba(255,255,255,0.6)">Pairing</text>
          <rect x={2} y={-88} width={74} height={66} rx={6} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
          <text x={10} y={-78} fontFamily="var(--font-sans), sans-serif" fontSize="4.5" fontWeight="600" fill="rgba(255,255,255,0.6)">Devices</text>
          {[0, 1, 2].map((i) => (
            <g key={`dev-${i}`}>
              <rect x={10} y={-70 + i * 16} width={58} height={12} rx={4} fill="rgba(255,255,255,0.04)" />
              <circle cx={18} cy={-64 + i * 16} r={3} fill={i === 0 ? palette.bauhaus.blue : 'rgba(255,255,255,0.15)'} />
              <rect x={24} y={-66 + i * 16} width={i === 0 ? 30 : 20 + i * 4} height={3} rx={1.5} fill={i === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'} />
            </g>
          ))}
          <text x={0} y={-17} textAnchor="middle" fontFamily={architectureFonts.body} fontSize="5" letterSpacing="0.16em" fill="rgba(255,255,255,0.5)">SERVER CONTROL BOARD</text>
        </BauhausLaptop>
        </g>

        {/* ── Big blue circle ─────────────────────────────────────────── */}
        {!hideBlueCircle && (() => {
          const startCx = phoneCx + (-12) * phoneScale
          const startCy = phoneCy + 2 * phoneScale
          const startR  = 6 * phoneScale
          const growCx  = mix(startCx, phoneCx, circleGrowP)
          const growCy  = mix(startCy, phoneCy, circleGrowP)
          const growR   = mix(startR, 26, circleGrowP)
          return <circle cx={mix(growCx, 100, circleMoveP)} cy={mix(growCy, 0, circleMoveP)}
            r={growR} fill={palette.bauhaus.blue} opacity={0.96} />
        })()}

        {/* ── Door assembly — drops from above, hinge line travels with it ── */}
        {/* Hidden during the Connect→PortSecurity slide; overlay owns the door then. */}
        {doorSlideP > 0 && !hideDoor && (
          <g transform={`translate(${doorTx} ${doorGroupTy})`} opacity={doorOpacity}>
            {/* Hinge line (door frame) */}
            <line
              x1={HINGE_X} y1={-DOOR_H / 2 - 20}
              x2={HINGE_X} y2={DOOR_H / 2 + 20}
              stroke="rgba(255,255,255,0.14)" strokeWidth="4"
            />
            {/* Door face */}
            {sinA > 0.04 && <polygon points={doorEdgePoints} fill="rgba(255,255,255,0.07)" />}
            <polygon points={doorFacePoints} fill={palette.bauhaus.black} />
            <polygon points={doorFacePoints} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
            {(HINGE_X - freeX) > 12 && [-50, 0, 50].map((dy) => (
              <line key={dy} x1={freeX + 6} y1={dy} x2={HINGE_X - 6} y2={dy}
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
            ))}
            {[0.25, 0.75].map((frac, i) => (
              <circle key={i} cx={HINGE_X} cy={-DOOR_H / 2 + DOOR_H * frac} r={3.5}
                fill="rgba(255,255,255,0.20)" />
            ))}
            <circle cx={mix(freeX, HINGE_X, 0.14)} cy={4} r={4.5} fill="rgba(255,255,255,0.22)" />

            {/* ── "LOCK THE PORT" label on door face ──────────────────── */}
            <text
              x={doorFaceCenterX}
              y={-18}
              textAnchor="middle"
              fontFamily={architectureFonts.mono}
              fontSize="7"
              fontWeight="600"
              letterSpacing="0.12em"
              fill="rgba(255,255,255,0.75)"
              opacity={doorLabelOpacity}
            >
              LOCK THE PORT
            </text>
          </g>
        )}

        {/* ── Unlock pulse — centered on door position ─────────────────── */}
        {keyTurnP > 0 && keyTurnP < 1 && (
          <rect
            x={doorTx - DOOR_W / 2} y={doorTy - DOOR_H / 2}
            width={DOOR_W} height={DOOR_H}
            fill={palette.bauhaus.blue}
            opacity={Math.sin(keyTurnP * Math.PI) * 0.28}
          />
        )}

        {/* ── Phone body only (no children — key is a sibling group) ─── */}
        <g opacity={hidePhone ? 0 : assetsRevealP}>
          <BauhausPhone cx={phoneCx} cy={phoneCy} scale={phoneScale}>
            {/* Always truthy so BauhausPhone doesn't flash its default UI when morphLib loads.
                Opacity 0 once morphLib is ready — the morph key group takes over. */}
            <g opacity={morphLib ? 0 : (1 - morphT)}>
              <circle cx={-12} cy={2} r={6} fill={palette.bauhaus.blue} />
              <polygon points="0,-7 5.5,3.5 -5.5,3.5" fill={palette.bauhaus.yellow} />
              <rect x={6} y={-6} width={12} height={12} rx={1.5} fill={palette.bauhaus.red} />
            </g>
          </BauhausPhone>
        </g>

        {/* ── Key: morphs on phone, then continuously slides to door ─────
            Single group with animated wrapper transform — no disappear/reappear.
            Rendered AFTER phone so it draws on top during on-phone phase.   */}
        {morphedKeyOpacity > 0.01 && morphedBowD && morphedShaftD && morphedBitD && (
          <g transform={`translate(${wrapTx} ${wrapTy}) scale(${wrapS})`}
             opacity={morphedKeyOpacity}>
            {/* Foreshortening: key shrinks INTO the lock from the bit side */}
            <g transform={`translate(${TURN_PIVOT} 0) scale(${keyTurnScaleX} 1) translate(${-TURN_PIVOT} 0)`}>
              <path d={morphedBowD}   fill={palette.bauhaus.blue} />
              <path d={morphedShaftD} fill={palette.bauhaus.yellow} />
              <path d={morphedBitD}   fill={palette.bauhaus.red} />
            </g>
          </g>
        )}

        {/* ── Dashed signal line (after door opens) ───────────────────── */}
        {consoleRevP > 0 && (
          <motion.line
            x1={phoneCx + 22 * phoneScale} y1={phoneCy}
            x2={doorTx - DOOR_W / 2 - 4} y2={doorTy}
            stroke={palette.bauhaus.blue} strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4"
            animate={{
              opacity: easeOutQuad(consoleRevP) * (1 - circleMoveP),
              strokeDashoffset: [0, -18],
            }}
            transition={{
              opacity: { duration: 0.2 },
              strokeDashoffset: { duration: 1.0, repeat: Infinity, ease: 'linear' },
            }}
          />
        )}

      </g>
    </svg>
  )
}
