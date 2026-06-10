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
import { palette } from '@pocketdev/shared/theme'
import { APP_STORE_URL, DOCS_URL, GITHUB_URL } from '@pocketdev/shared/links'
import { CopyButton } from '@pocketdev/shared/components'
import { PocketHeroSvg } from '../PocketHeroSvg'
import { ArchitectureHeroAnimation } from '../ArchitectureHeroAnimation'
import { brandAssets } from '../../shared/brand-assets'
import { BrandAssetIcon } from '../../shared/BrandAssetIcon'
import { architectureTextStyles } from '../../shared/theme'
import { BetaInlineView } from './BetaInlineView'
import { AnimatePresence } from 'framer-motion'
import { PocketRevealScene } from './scenes/01-pocket-reveal'
import { DevOnTheGoScene } from './scenes/02-hero-developers'
import { LinuxAdminScene } from './scenes/03-hero-linux-admins'

const PAPER = palette.bauhaus.cream
const INSTALL_COMMAND = 'curl -fsSL https://pocketdev.run/install.sh | bash'
const INSTALL_COMMAND_LINES = [
  'curl -fsSL',
  'https://pocketdev.run/install.sh',
  '| bash',
]

// Scene scroll durations (vh). Change any value freely — all boundaries recalculate.
const SCROLL = {
  scene1:  132,  // pocket reveal
  scene2:  264,  // developers on the go
  scene3:  114,  // linux admins
  outro:    90,  // pills fade-in
} as const
const TOTAL_VH = SCROLL.scene1 + SCROLL.scene2 + SCROLL.scene3 + SCROLL.outro
const p = (vh: number) => vh / TOTAL_VH

// Derived scene boundaries (0 → 1 of total scroll progress)
const SCENE1_END   = p(SCROLL.scene1)
const SCENE2_START = SCENE1_END
const SCENE2_END   = p(SCROLL.scene1 + SCROLL.scene2)
const SCENE3_START = SCENE2_END
const SCENE3_END   = p(SCROLL.scene1 + SCROLL.scene2 + SCROLL.scene3)

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
  const [betaOpen, setBetaOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = betaOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [betaOpen])

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

  const headerOpacity = useTransform(scrollYProgress, [0, SCENE1_END * 0.55, SCENE1_END * 0.91], [1, 1, 0])
  const headerY       = useTransform(scrollYProgress, [SCENE1_END * 0.55, SCENE1_END], [0, -Math.max(vpSize.h, 420)])

  const outroStart   = SCENE3_END
  const outroLen     = 1 - outroStart
  const pillsOpacity = useTransform(
    scrollYProgress,
    [outroStart + outroLen * 0.20, outroStart + outroLen * 0.53, outroStart + outroLen * 0.60, outroStart + outroLen * 0.87],
    [0, 1, 1, 0],
  )
  const pillsY = useTransform(
    scrollYProgress,
    [outroStart + outroLen * 0.20, outroStart + outroLen * 0.53],
    [20, 0],
  )

  // Per-scene opacities — scene 1→2 cross-fades over a short window
  const scene1Opacity = useTransform(
    scrollYProgress,
    [SCENE1_END * 0.82, SCENE2_START + (SCENE2_END - SCENE2_START) * 0.05],
    [1, 0],
  )

  // Normalized 0→1 progress per scene
  const scene1Progress = Math.min(1, Math.max(0, progress / SCENE1_END))
  const scene2Progress = Math.min(1, Math.max(0, (progress - SCENE2_START) / (SCENE2_END - SCENE2_START)))
  const scene3Progress = Math.min(1, Math.max(0, (progress - SCENE3_START) / (SCENE3_END - SCENE3_START)))

  const spring = { type: 'spring', stiffness: 220, damping: 26 } as const

  if (reduceMotion) {
    return (
      <header className="flex flex-col items-center px-6 pt-24 pb-8 text-center">
        <HeroTitle />
        <HeroDescription onOpenBeta={() => setBetaOpen(true)} />
        <PocketHeroSvg className="mt-12 w-48 sm:w-56" />
        <ArchitectureHeroAnimation className="mt-12 w-full max-w-lg" />
        <Pills />
      </header>
    )
  }

  return (
    <section ref={sectionRef} className="relative" style={{ height: `${TOTAL_VH}vh`, backgroundColor: PAPER }}>
      <div className="sticky top-0 h-screen overflow-hidden" style={{ backgroundColor: PAPER }}>

        <motion.div
          className="absolute inset-x-0 top-0 z-10 flex flex-col items-center px-6 pt-24 text-center"
          style={{ opacity: headerOpacity, y: headerY }}
          animate={betaOpen ? { y: -vpSize.h, opacity: 0 } : {}}
          transition={spring}
        >
          <HeroTitle />
          <HeroDescription onOpenBeta={() => setBetaOpen(true)} />
        </motion.div>

        <motion.div
          className="absolute inset-0"
          animate={betaOpen ? { y: vpSize.h } : {}}
          transition={spring}
        >
          {/* Scene 1: Ball rises from pocket */}
          <motion.div className="absolute inset-0" style={{ opacity: scene1Opacity }}>
            <PocketRevealScene
              progress={scene1Progress}
              vpSize={vpSize}
              isDesktopLayout={isDesktopLayout}
            />
          </motion.div>

          {/* Scene 2: Developer on the go */}
          <motion.div className="absolute inset-0" style={{ opacity: 1 }}>
            <DevOnTheGoScene
              progress={scene2Progress}
              vpSize={vpSize}
              isDesktopLayout={isDesktopLayout}
            />
          </motion.div>

          {/* Scene 3: Linux admins */}
          <motion.div className="absolute inset-0" style={{ opacity: 1 }}>
            <LinuxAdminScene
              progress={scene3Progress}
              heroProgress={progress}
              vpSize={vpSize}
              isDesktopLayout={isDesktopLayout}
            />
          </motion.div>
        </motion.div>

        {/* Pills — fades in near the end */}
        <motion.div
          className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-6"
          style={{ opacity: pillsOpacity, y: pillsY }}
          animate={betaOpen ? { opacity: 0 } : {}}
          transition={spring}
        >
          <Pills />
        </motion.div>

        <AnimatePresence>
          {betaOpen && (
            <BetaInlineView onClose={() => setBetaOpen(false)} />
          )}
        </AnimatePresence>

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

function HeroDescription({ onOpenBeta }: { onOpenBeta: () => void }) {
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
              <span key={line} className="block break-all">{line}</span>
            ))}
          </code>
          <CopyButton
            value={INSTALL_COMMAND}
            label="Copy"
            className="w-full border-border/60 bg-transparent text-foreground hover:bg-muted/80 sm:w-auto"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] shadow-sm transition-opacity hover:opacity-80"
          style={{ backgroundColor: palette.bauhaus.black, color: palette.bauhaus.cream, border: `1px solid ${palette.bauhaus.black}` }}
        >
          <img src={brandAssets.appleWhite} alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />
          App Store
        </a>
        <button
          type="button"
          onClick={onOpenBeta}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] shadow-sm transition-opacity hover:opacity-80 cursor-pointer"
          style={{ backgroundColor: 'transparent', color: palette.bauhaus.black, border: `1px solid ${palette.bauhaus.black}80` }}
        >
          <img src={brandAssets.androidBlack} alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />
          Join the Beta
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-[0.15em] transition-opacity hover:opacity-60"
          style={{ color: palette.bauhaus.black }}
        >
          Docs ↗
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-[0.15em] transition-opacity hover:opacity-60"
          style={{ color: palette.bauhaus.black }}
        >
          <img src={brandAssets.githubBlack} alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />
          Open Source
        </a>
      </div>
    </>
  )
}

function Pills() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <IconPill icon={<SiApple size={14} color={`#${SiAppleHex}`} />} label="iOS" />
      <IconPill icon={<SiAndroid size={14} color={`#${SiAndroidHex}`} />} label="Android" />
      <IconPill icon={<SiClaude size={14} color={`#${SiClaudeHex}`} />} label="Claude" />
      <IconPill icon={<BrandAssetIcon src={brandAssets.codexBlack} alt="Codex" />} label="Codex" />
      <IconPill icon={<SiGithubcopilot size={14} color={`#${SiGithubcopilotHex}`} />} label="Copilot" />
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
