import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'
import { BauhausLaptop } from './HowPocketDevWorks/shared/BauhausLaptop'
import { architectureFonts, architectureTextStyles, architectureTokens } from '../shared/theme'

const blue = palette.bauhaus.blue
const red = palette.bauhaus.red
const yellow = palette.bauhaus.yellow

const SCRIPT = 'curl -fsSL https://pocketdev.run/install.sh | bash'

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function mapProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1)
}

export function GettingStartedSection() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)
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

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', setProgress)

  if (reduceMotion) {
    return (
      <section className="flex flex-col items-center px-6 py-16 text-center">
        <p className="text-sm uppercase tracking-widest" style={architectureTextStyles.sectionEyebrow}>
          Get started with
        </p>
        <p className="mt-2 text-lg" style={architectureTextStyles.bodyText}>
          {SCRIPT}
        </p>
      </section>
    )
  }

  // Text fades in after laptop settles
  const textFade = mapProgress(progress, 0.15, 0.45)

  // Laptop position — centered, matching hero zoom's final pan target
  const laptopCx = vpSize.w / 2
  const laptopCy = vpSize.h * (isDesktop ? 0.52 : 0.42)
  const baseScale = isDesktop ? 1.8 : 1.1

  // Text position — desktop: left of laptop, mobile: above laptop
  const textX = isDesktop ? laptopCx - 210 * baseScale : laptopCx
  const textY = isDesktop ? laptopCy - 10 : laptopCy - 110 * baseScale - 30
  const textAnchor = isDesktop ? 'end' : 'middle'
  const textSize = isDesktop ? 18 : 14

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: '200vh' }}
    >
      <div
        className="sticky top-0 flex h-screen items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#f7f1e3' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${vpSize.w} ${vpSize.h}`}
          className="absolute inset-0 block h-full w-full"
          style={{ pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {/* "get started with" text */}
          <text
            x={textX}
            y={textY}
            textAnchor={textAnchor}
            fill={architectureTokens.colors.textSecondary}
            fontFamily={architectureFonts.mono}
            fontSize={textSize}
            letterSpacing="0.06em"
            opacity={textFade}
          >
            get started with
          </text>

          {/* BauhausLaptop — matches hero zoom's final position/scale */}
          <BauhausLaptop
            cx={laptopCx}
            cy={laptopCy}
            scale={baseScale}
          >
            {/* Traffic lights */}
            <circle cx={-72} cy={-60} r={4} fill={red} />
            <circle cx={-58} cy={-60} r={4} fill={yellow} />
            <circle cx={-44} cy={-60} r={4} fill={blue} />
            {/* Curl command */}
            <text
              x={0}
              y={-20}
              textAnchor="middle"
              fontFamily={architectureFonts.mono}
              fontSize="11"
              fill={architectureTokens.colors.text}
            >
              {SCRIPT}
            </text>
            {/* Output lines */}
            <rect x={-72} y={0} width={80} height={3} rx={1.5} fill="rgba(255,255,255,0.35)" />
            <rect x={-72} y={10} width={55} height={3} rx={1.5} fill="rgba(255,255,255,0.25)" />
            <rect x={-72} y={20} width={68} height={3} rx={1.5} fill="rgba(255,255,255,0.3)" />
          </BauhausLaptop>
        </svg>
      </div>
    </section>
  )
}
