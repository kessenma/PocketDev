import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { HeroScrollSequence } from '#/components/architecture/animations/hero-sequence'
import {
  DocsCalloutSection,
  HowPocketDevWorksSection,
  RepoHistoryTransitionSection,
  TridentDiagramSection,
} from '#/components/architecture/sections'
import { GrowsToAgentOverlay } from '#/components/architecture/sections/GrowsToAgentOverlay'
import { HeroToConsoleOverlay } from '#/components/architecture/sections/HeroToConsoleOverlay'
import { Footer } from '#/components/landing/Footer'
import { architectureTokens } from '#/components/architecture/shared/theme'

function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <>{children}</> : <>{fallback}</>
}

export const Route = createFileRoute('/')({
  component: ArchitecturePage,
})

const PRE_TRAVEL = 1.0  // circle completes full journey during RepoHistory exit

function ArchitecturePage() {
  const howItWorksRef = useRef<HTMLDivElement>(null)
  const [heroProgress, setHeroProgress] = useState(0)
  const [howItWorksRailProgress, setHowItWorksRailProgress] = useState(0)
  const [repoHistoryProgress, setRepoHistoryProgress] = useState(0)
  const [tridentProgress, setTridentProgress] = useState(0)
  const [badgePosition, setBadgePosition] = useState({ x: 0, y: 0 })
  const [vpSize, setVpSize] = useState({ w: 1280, h: 800 })

  useEffect(() => {
    const sync = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const isDesktopLayout = vpSize.w >= 1024
  const agentX = isDesktopLayout ? vpSize.w * 0.32 : vpSize.w * 0.4
  const agentY = isDesktopLayout ? vpSize.h * 0.48 : vpSize.h * 0.52
  // With PRE_TRAVEL = 1.0 the circle arrives at agentX/agentY during exit,
  // so TridentBuildScene starts with the circle already settled.
  // badgePosition.y goes negative after the section scrolls off the top of the viewport —
  // check !== 0 (uninitialized) rather than > 0 so seedY is still passed correctly.
  const seedX = badgePosition.x !== 0 ? badgePosition.x + (agentX - badgePosition.x) * PRE_TRAVEL : undefined
  const seedY = badgePosition.y !== 0 ? badgePosition.y + (agentY - badgePosition.y) * PRE_TRAVEL : undefined

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: architectureTokens.colors.paper,
        backgroundImage: `
          radial-gradient(circle at top left, ${architectureTokens.colors.yellow}12 0, transparent 26%),
          radial-gradient(circle at 82% 18%, ${architectureTokens.colors.blue}10 0, transparent 24%),
          linear-gradient(180deg, ${architectureTokens.colors.panelAlt}55 0%, transparent 18%)
        `,
      }}
    >
      <ClientOnly>
        <HeroScrollSequence onProgressChange={setHeroProgress} />
        <HowPocketDevWorksSection
          sectionRef={howItWorksRef}
          onRailProgress={setHowItWorksRailProgress}
        />
        <RepoHistoryTransitionSection
          onTransitionProgress={setRepoHistoryProgress}
          onGrowsBadgePosition={(x, y) => setBadgePosition({ x, y })}
        />
        <TridentDiagramSection
          onProgress={setTridentProgress}
          seedX={seedX}
          seedY={seedY}
        />
        <GrowsToAgentOverlay
          repoHistoryProgress={repoHistoryProgress}
          tridentProgress={tridentProgress}
          badgeX={badgePosition.x}
          badgeY={badgePosition.y}
        />
        <HeroToConsoleOverlay
          heroProgress={heroProgress}
          railProgress={howItWorksRailProgress}
        />
      </ClientOnly>

      <DocsCalloutSection />

      <Footer />
    </div>
  )
}
