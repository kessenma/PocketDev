import { useEffect, useState } from 'react'
import { palette } from '@pocketdev/shared/theme'

// Scene 3 ends at this hero progress value (mirrors LinuxAdminScene boundary)
const SCENE3_END = 0.77

const CONSOLE_VB = { w: 420, h: 320 }
const LAPTOP_VB_CX = 210
const LAPTOP_VB_CY = 185

function clamp(v: number, mn: number, mx: number) {
  return Math.min(mx, Math.max(mn, v))
}
function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function easeOut(t: number) {
  return 1 - (1 - t) ** 2
}

function getLaptopViewportCenter(vpW: number, vpH: number): { x: number; y: number } {
  const panelPad = 24
  const articlePad = vpW >= 640 ? 20 : 16
  const innerPad = vpW >= 640 ? 16 : 12
  const cardW = Math.min(vpW - panelPad * 2, 1152)
  const stageW = cardW - (articlePad + innerPad) * 2
  const stageH = Math.max(540, vpH * 0.86)
  const vbScale = Math.min(stageW / CONSOLE_VB.w, stageH / CONSOLE_VB.h)
  const renderedW = CONSOLE_VB.w * vbScale
  const renderedH = CONSOLE_VB.h * vbScale
  const titleAreaH = 100
  const cardH = (articlePad + innerPad) * 2 + stageH + titleAreaH
  const cardTop = (vpH - cardH) / 2
  const stageTop = cardTop + articlePad + innerPad
  const stageLeft = (vpW - stageW) / 2
  const svgOffsetX = (stageW - renderedW) / 2
  const svgOffsetY = (stageH - renderedH) / 2
  return {
    x: stageLeft + svgOffsetX + LAPTOP_VB_CX * vbScale,
    y: stageTop + svgOffsetY + LAPTOP_VB_CY * vbScale,
  }
}

export function HeroToConsoleOverlay({
  heroProgress,
  railProgress,
}: {
  heroProgress: number
  railProgress: number
}) {
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const { w, h } = vpSize
  const isDesktop = w >= 1024
  const settledR = isDesktop ? 54 : 46

  // Laptop center in viewport coordinates
  const laptopCenter = getLaptopViewportCenter(w, h)

  // Travel: move 85% of the way toward laptop during railProgress 0 → TRAVEL_DUR
  const TRAVEL_DUR   = 0.025
  const FADE_OUT_END = 0.04
  const travelP = easeOut(clamp(railProgress / TRAVEL_DUR, 0, 1)) * 0.85
  const cx = mix(w / 2, laptopCenter.x, travelP)
  const cy = mix(h / 2, laptopCenter.y, travelP)

  // No fade-in — snap on only after scene 3 is fully done to avoid any blink.
  // The scene owns its circle until SCENE3_END; we appear at the same position instantly.
  let opacity: number
  if (heroProgress < SCENE3_END) {
    opacity = 0
  } else if (railProgress > 0) {
    opacity = Math.max(0, 1 - railProgress / FADE_OUT_END)
  } else {
    opacity = 1
  }

  if (opacity <= 0) return null

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 8 }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 block h-full w-full"
        aria-hidden="true"
        style={{ opacity }}
      >
        <circle cx={cx} cy={cy} r={Math.max(settledR, 0.1)} fill={palette.bauhaus.blue} />
      </svg>
    </div>
  )
}
