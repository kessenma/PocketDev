import type { CSSProperties } from 'react'
import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { buttonVariants } from '#/components/ui/button'
import { HeroScrollSequence } from '#/components/architecture/animations/hero-sequence'
import { HeroLaptopOverlay } from '#/components/architecture/animations/hero-sequence/HeroLaptopOverlay'
import {
  AgentEndpointsSection,
  HowPocketDevWorksSection,
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

function ArchitecturePage() {
  const howItWorksRef = useRef<HTMLDivElement>(null)
  const [heroProgress, setHeroProgress] = useState(0)
  const [lowerPageTakeoverProgress, setLowerPageTakeoverProgress] = useState(0)
  const lowerPageStyle: CSSProperties & Record<string, string | number> = {
    '--architecture-paper': blendHexColors('#f7f1e3', architectureTokens.colors.blue, lowerPageTakeoverProgress),
    '--architecture-panel-alt': blendHexColors('#efe5cb', architectureTokens.colors.blue, Math.min(1, lowerPageTakeoverProgress * 1.12)),
    '--architecture-text': blendHexColors('#201d18', '#ffffff', lowerPageTakeoverProgress),
    '--architecture-text-secondary': blendHexColors('#5c5549', '#dbeafe', lowerPageTakeoverProgress),
    '--architecture-border': blendHexColors('#b7aa91', '#93c5fd', lowerPageTakeoverProgress),
    '--architecture-surface': `rgba(255,255,255, ${0.02 + lowerPageTakeoverProgress * 0.06})`,
    backgroundColor: blendHexColors('#f7f1e3', architectureTokens.colors.blue, lowerPageTakeoverProgress),
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

      <HowPocketDevWorksSection
        sectionRef={howItWorksRef}
        onLowerPageTakeoverChange={setLowerPageTakeoverProgress}
      />

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
