import type { CSSProperties } from 'react'
import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { buttonVariants } from '#/components/ui/button'
import { HeroScrollSequence } from '#/components/architecture/animations/hero-sequence'
import { HeroLaptopOverlay } from '#/components/architecture/animations/hero-sequence/HeroLaptopOverlay'
import {
  AgentEndpointsSection,
  HowPocketDevWorksSection,
  RepoHistoryTransitionSection,
  SecurityModelSection,
  SetupReadinessSection,
  SystemOverviewSection,
  TechStackSection,
  WireProtocolSection,
} from '#/components/architecture/sections'
import { Footer } from '#/components/landing/Footer'
import {
  architectureTokens,
  blendHexColors,
} from '#/components/architecture/shared/theme'

export const Route = createFileRoute('/architecture')({
  component: ArchitecturePage,
})

const PAPER = '#f7f1e3'

function ArchitecturePage() {
  const howItWorksRef = useRef<HTMLDivElement>(null)
  const [heroProgress, setHeroProgress] = useState(0)
  const [lowerPageTakeoverProgress, setLowerPageTakeoverProgress] = useState(0)
  const lowerPageStyle: CSSProperties & Record<string, string | number> = {
    '--architecture-paper': blendHexColors(architectureTokens.colors.blue, PAPER, lowerPageTakeoverProgress),
    '--architecture-panel-alt': blendHexColors(architectureTokens.colors.blue, '#efe5cb', lowerPageTakeoverProgress),
    '--architecture-text': blendHexColors('#ffffff', '#201d18', lowerPageTakeoverProgress),
    '--architecture-text-secondary': blendHexColors('#dbeafe', '#5c5549', lowerPageTakeoverProgress),
    '--architecture-border': blendHexColors('#93c5fd', '#b7aa91', lowerPageTakeoverProgress),
    '--architecture-surface': `rgba(255,255,255, ${0.08 - lowerPageTakeoverProgress * 0.06})`,
    backgroundColor: blendHexColors(architectureTokens.colors.blue, PAPER, lowerPageTakeoverProgress),
  }

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
      <HeroScrollSequence onProgressChange={setHeroProgress} />

      <HeroLaptopOverlay heroProgress={heroProgress} howItWorksRef={howItWorksRef} />

      <HowPocketDevWorksSection sectionRef={howItWorksRef} />

      <RepoHistoryTransitionSection onTransitionProgress={setLowerPageTakeoverProgress} />

      <div style={lowerPageStyle}>
        <SystemOverviewSection />
        <SetupReadinessSection />
        <AgentEndpointsSection />
        <SecurityModelSection />
        <WireProtocolSection />
        <TechStackSection />

        <div className="flex justify-center px-6 py-12">
          <a href="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Back to home
          </a>
        </div>

        <Footer />
      </div>
    </div>
  )
}
