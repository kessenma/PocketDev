import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import {
  SiAndroid,
  SiAndroidHex,
  SiApple,
  SiAppleHex,
  SiClaude,
  SiClaudeHex,
  SiGithubcopilot,
  SiGithubcopilotHex,
} from '@icons-pack/react-simple-icons'
import { CopyButton } from '@pocketdev/shared/components'
import { PocketHeroSvg } from '../PocketHeroSvg'
import { ArchitectureHeroAnimation } from '../ArchitectureHeroAnimation'
import { brandAssets } from '../../shared/brand-assets'
import { BrandAssetIcon } from '../../shared/BrandAssetIcon'
import { architectureTextStyles } from '../../shared/theme'
import { HeroScene } from './HeroScene'

const PAPER = '#f7f1e3'
const INSTALL_COMMAND = 'curl -fsSL https://pocketdev.run/install.sh | bash'
const INSTALL_COMMAND_LINES = [
  'curl -fsSL',
  'https://pocketdev.run/install.sh',
  '| bash',
]

export function HeroScrollSequence({
  onProgressChange,
}: {
  onProgressChange?: (progress: number) => void
}) {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })
  const [isDesktopLayout, setIsDesktopLayout] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () =>
      setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktopLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setProgress(latest)
    onProgressChange?.(latest)
  })

  // Header slides up off-screen as the pocket fades — gone for good
  const headerOpacity = useTransform(
    scrollYProgress,
    [0, 0.25, 0.40],
    [1, 1, 0],
  )
  const headerY = useTransform(
    scrollYProgress,
    [0.25, 0.42],
    [0, -300],
  )
  const pillsOpacity = useTransform(scrollYProgress, [0.78, 0.86, 0.88, 0.94], [0, 1, 1, 0])
  const pillsY = useTransform(scrollYProgress, [0.78, 0.86], [20, 0])

  // Hide the hero laptop when zoom is complete so the overlay takes over
  const hideLaptop = progress >= 1.0

  if (reduceMotion) {
    return (
      <header className="flex flex-col items-center px-6 pt-24 pb-8 text-center">
        <HeroTitle />
        <HeroDescription />
        <PocketHeroSvg className="mt-12 w-48 sm:w-56" />
        <ArchitectureHeroAnimation className="mt-12 w-full max-w-lg" />
        <Pills />
      </header>
    )
  }

  return (
    <section ref={sectionRef} className="relative" style={{ height: '400vh' }}>
      <div
        className="sticky top-0 h-screen overflow-hidden"
        style={{ backgroundColor: PAPER }}
      >
        {/* Header text overlay */}
        <motion.div
          className="absolute inset-x-0 top-0 z-10 flex flex-col items-center px-6 pt-24 text-center"
          style={{ opacity: headerOpacity, y: headerY }}
        >
          <HeroTitle />
          <HeroDescription />
        </motion.div>

        {/* SVG animation */}
        <HeroScene
          progress={progress}
          vpSize={vpSize}
          isDesktopLayout={isDesktopLayout}
          hideLaptop={hideLaptop}
        />

        {/* Pills overlay */}
        <motion.div
          className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-6"
          style={{ opacity: pillsOpacity, y: pillsY }}
        >
          <Pills />
        </motion.div>
      </div>
    </section>
  )
}

function HeroTitle() {
  return (
    <div className="flex flex-col items-center">
      <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-foreground/70 shadow-sm backdrop-blur-sm">
        Private Mobile Beta
      </span>
      <h1
        className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
        style={architectureTextStyles.heroTitle}
      >
        PocketDev
      </h1>
    </div>
  )
}

function HeroDescription() {
  return (
    <>
      <p
        className="mt-4 max-w-xl text-lg text-muted-foreground"
        style={architectureTextStyles.heroLead}
      >
        From pocket to production
      </p>
      <div className="mt-5 w-full max-w-[min(92vw,40rem)] rounded-2xl border border-border/50 bg-background/70 p-3 text-left shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <code className="min-w-0 flex-1 rounded-xl bg-muted/70 px-3 py-2 font-mono text-[0.72rem] leading-relaxed text-foreground/85 sm:text-xs">
            {INSTALL_COMMAND_LINES.map((line) => (
              <span key={line} className="block break-all">
                {line}
              </span>
            ))}
          </code>
          <CopyButton
            value={INSTALL_COMMAND}
            label="Copy"
            className="w-full border-border/60 bg-transparent text-foreground hover:bg-muted/80 sm:w-auto"
          />
        </div>
      </div>
    </>
  )
}

function Pills() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <IconPill
        icon={<SiApple size={14} color={`#${SiAppleHex}`} />}
        label="iOS"
      />
      <IconPill
        icon={<SiAndroid size={14} color={`#${SiAndroidHex}`} />}
        label="Android"
      />
      <IconPill
        icon={<SiClaude size={14} color={`#${SiClaudeHex}`} />}
        label="Claude"
      />
      <IconPill
        icon={<BrandAssetIcon src={brandAssets.codexBlack} alt="Codex" />}
        label="Codex"
      />
      <IconPill
        icon={
          <SiGithubcopilot size={14} color={`#${SiGithubcopilotHex}`} />
        }
        label="Copilot"
      />
    </div>
  )
}

function IconPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-transparent px-3 py-1.5 text-xs text-foreground/80">
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </div>
  )
}
