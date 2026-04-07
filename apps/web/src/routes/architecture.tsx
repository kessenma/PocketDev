import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
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
import { buttonVariants } from '#/components/ui/button'
import { ArchitectureHeroAnimation } from '#/components/architecture/animations/ArchitectureHeroAnimation'
import { PocketHeroSvg } from '#/components/architecture/animations/PocketHeroSvg'
import {
  AgentEndpointsSection,
  HowPocketDevWorksSection,
  SecurityModelSection,
  SetupReadinessSection,
  SystemOverviewSection,
  TechStackSection,
  WireProtocolSection,
} from '#/components/architecture/sections'
import { brandAssets } from '#/components/architecture/shared/brand-assets'
import { BrandAssetIcon } from '#/components/architecture/shared/BrandAssetIcon'
import { Footer } from '#/components/landing/Footer'
import {
  architectureTextStyles,
  architectureTokens,
  blendHexColors,
} from '#/components/architecture/shared/theme'

export const Route = createFileRoute('/architecture')({
  component: ArchitecturePage,
})

function ArchitecturePage() {
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
      <header className="flex flex-col items-center px-6 pt-24 pb-8 text-center">
        <a
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to home
        </a>
        <h1
          className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
          style={architectureTextStyles.heroTitle}
        >
          Architecture
        </h1>
        <p
          className="mt-4 max-w-xl text-lg text-muted-foreground"
          style={architectureTextStyles.heroLead}
        >
          A deeper look at how PocketDev connects your devices to a self-hosted
          agent, your files on the server, and the external AI providers that
          power coding workflows from anywhere.
        </p>
        <PocketHeroSvg className="mt-12 w-48 sm:w-56" />
        <ArchitectureHeroAnimation className="mt-12 w-full max-w-lg" />
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
            icon={<SiGithubcopilot size={14} color={`#${SiGithubcopilotHex}`} />}
            label="Copilot"
          />
        </div>
      </header>

      <SystemOverviewSection />
      <HowPocketDevWorksSection onLowerPageTakeoverChange={setLowerPageTakeoverProgress} />

      <div style={lowerPageStyle}>
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

function IconPill({
  icon,
  label,
}: {
  icon: ReactNode
  label: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-transparent px-3 py-1.5 text-xs text-foreground/80">
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </div>
  )
}
