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
import { PocketHeroSvg } from '../PocketHeroSvg'
import { ArchitectureHeroAnimation } from '../ArchitectureHeroAnimation'
import { brandAssets } from '../../shared/brand-assets'
import { BrandAssetIcon } from '../../shared/BrandAssetIcon'
import { architectureTextStyles } from '../../shared/theme'
import { HeroScene } from './HeroScene'

const PAPER = '#f7f1e3'

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
    <h1
      className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
      style={architectureTextStyles.heroTitle}
    >
      PocketDev
    </h1>
  )
}

function HeroDescription() {
  const [copied, setCopied] = useState(false)
  const installCommand = 'curl -fsSL https://pocketdev.run/install.sh | bash'
  
  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <><p
      className="mt-4 max-w-xl text-lg text-muted-foreground"
      style={architectureTextStyles.heroLead}
    >
      From pocket to production
    </p><pre className="mt-4 border border-border/40 rounded-lg bg-muted/50 p-3 text-xs text-foreground/80 flex items-center justify-between gap-3">
      <code className="overflow-x-auto">{installCommand}</code>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
        title="Copy to clipboard"
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </pre></>
    
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
