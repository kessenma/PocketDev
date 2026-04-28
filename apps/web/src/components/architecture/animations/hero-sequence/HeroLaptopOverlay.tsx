import { useEffect, useState } from 'react'
import { BauhausLaptop } from '../../sections/HowPocketDevWorks/shared/BauhausLaptop'

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function HeroLaptopOverlay({ heroProgress }: { heroProgress: number }) {
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Fades in as scene 03 builds up, then stays visible
  const opacity = clamp((heroProgress - 0.62) / 0.08, 0, 1)

  if (opacity <= 0) return null

  const laptopScale = isDesktop ? 0.65 : 0.5
  const cx = vpSize.w / 2
  const cy = vpSize.h * (isDesktop ? 0.78 : 0.80)

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 20, opacity }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
        className="block h-full w-full"
        aria-hidden="true"
      >
        <BauhausLaptop cx={cx} cy={cy} scale={laptopScale} />
      </svg>
    </div>
  )
}
