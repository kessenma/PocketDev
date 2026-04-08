import { palette } from '@pocketdev/shared/theme'

/**
 * Bauhaus-style arm + hand reaching from the left screen edge to hold a phone.
 * One continuous path so the draw-on animation flows seamlessly from arm → fingers → thumb.
 */
export function HandDrawing({
  phoneCx,
  phoneCy,
  phoneScale = 1,
  drawProgress = 0,
  strokeColor = palette.bauhaus.red,
}: {
  phoneCx: number
  phoneCy: number
  phoneScale?: number
  /** 0 = invisible, 1 = fully drawn */
  drawProgress?: number
  strokeColor?: string
}) {
  if (drawProgress <= 0) return null

  const pw = 30 * phoneScale
  const ph = 55 * phoneScale
  const sw = 3 * phoneScale

  const phoneL = phoneCx - pw
  const phoneR = phoneCx + pw

  // Wrist arrival point (where the arm meets the hand)
  const wristX = phoneL - 6
  const wristY = phoneCy - ph * 0.1

  // Finger dimensions
  const fingerSpacing = ph * 0.18
  const fingerStartY = phoneCy - ph * 0.35
  const fingerCurl = 10 * phoneScale // how far fingers curl over the top

  // Build one continuous path:
  // 1. Arm from off-screen → wrist
  // 2. Wrist up to first finger position
  // 3. Each finger wraps over the phone and returns to the left side
  // 4. After last finger, line down to thumb position
  // 5. Thumb crosses the front

  let d = ''

  // --- ARM: off-screen left → S-curve → wrist ---
  d += `M -30 ${phoneCy + ph * 0.6}`
  d += ` C ${phoneCx * 0.15} ${phoneCy + ph * 1.2}, ${phoneCx * 0.35} ${phoneCy + ph * 0.9}, ${phoneCx * 0.5} ${phoneCy + ph * 0.4}`
  d += ` C ${phoneCx * 0.6} ${phoneCy}, ${phoneCx * 0.7} ${phoneCy - ph * 0.2}, ${wristX} ${wristY}`

  // --- WRIST → up to first finger ---
  d += ` L ${wristX} ${fingerStartY}`

  // --- FOUR FINGERS: each wraps over the phone right edge and returns ---
  for (let i = 0; i < 4; i++) {
    const y = fingerStartY + i * fingerSpacing
    const tipY = y - fingerCurl

    // Go along the left edge to this finger's height
    if (i > 0) {
      d += ` L ${phoneL - 4} ${y}`
    }

    // Finger wraps: left edge → over top → right side → back
    d += ` L ${phoneL + 2} ${y}`
    d += ` C ${phoneL + 2} ${tipY}, ${phoneR - 2} ${tipY}, ${phoneR + 4} ${y}`
    // Return along a slightly lower path
    d += ` C ${phoneR - 2} ${y + fingerCurl * 0.5}, ${phoneL + 2} ${y + fingerCurl * 0.5}, ${phoneL - 4} ${y + fingerCurl * 0.3}`
  }

  // --- DOWN TO THUMB ---
  const thumbY = phoneCy + ph * 0.15
  d += ` L ${phoneL - 4} ${thumbY}`

  // --- THUMB: crosses the phone face diagonally ---
  d += ` C ${phoneCx - pw * 0.4} ${thumbY + ph * 0.05}, ${phoneCx} ${phoneCy + ph * 0.25}, ${phoneCx + pw * 0.35} ${phoneCy + ph * 0.38}`

  return (
    <path
      d={d}
      fill="none"
      stroke={strokeColor}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray="1"
      strokeDashoffset={1 - drawProgress}
      opacity={0.6}
    />
  )
}
