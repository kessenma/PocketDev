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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'
import { ArchitectureHeroAnimation } from '#/components/architecture/animations/ArchitectureHeroAnimation'
import { PocketHeroSvg } from '#/components/architecture/animations/PocketHeroSvg'
import {
  HowPocketDevWorksSection,
  SecurityModelSection,
  TechStackSection,
} from '#/components/architecture/sections'
import { brandAssets } from '#/components/architecture/shared/brand-assets'
import { BrandAssetIcon } from '#/components/architecture/shared/BrandAssetIcon'
import { InstallCommand } from '#/components/landing/InstallCommand'
import { Features } from '#/components/landing/Features'
import { Footer } from '#/components/landing/Footer'
import {
  architectureTextStyles,
  architectureTokens,
  blendHexColors,
} from '#/components/architecture/shared/theme'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
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
      {/* Hero */}
      <header className="flex flex-col items-center px-6 pt-24 pb-8 text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-8"
          style={{
            borderColor: architectureTokens.colors.border,
            color: architectureTokens.colors.textSecondary,
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Coming soon
        </div>

        <h1
          className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl"
          style={architectureTextStyles.heroTitle}
        >
          Run your dev environment{' '}
          <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
            from your pocket
          </span>
        </h1>

        <p
          className="mt-4 max-w-xl text-lg"
          style={architectureTextStyles.heroLead}
        >
          Install on any Linux VPS, pair your phone, and control AI coding agents
          from anywhere. No laptop required.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <a href="#install" className={buttonVariants({ size: 'lg' })}>
            Get Started
          </a>
          <a
            href="https://github.com/kessenma/PocketDev"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            View on GitHub
          </a>
        </div>

        <PocketHeroSvg className="mt-12 w-48 sm:w-56" />
        <ArchitectureHeroAnimation className="mt-12 w-full max-w-lg" />

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <IconPill icon={<SiApple size={14} color={`#${SiAppleHex}`} />} label="iOS" />
          <IconPill icon={<SiAndroid size={14} color={`#${SiAndroidHex}`} />} label="Android" />
          <IconPill icon={<SiClaude size={14} color={`#${SiClaudeHex}`} />} label="Claude" />
          <IconPill icon={<BrandAssetIcon src={brandAssets.codexBlack} alt="Codex" />} label="Codex" />
          <IconPill icon={<SiGithubcopilot size={14} color={`#${SiGithubcopilotHex}`} />} label="Copilot" />
        </div>
      </header>

      <InstallCommand />
      <Features />

      <HowPocketDevWorksSection onLowerPageTakeoverChange={setLowerPageTakeoverProgress} />

      <div style={lowerPageStyle}>
        {/* CTA strip */}
        <section className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--architecture-text)' }}
          >
            Ready to get started?
          </h2>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <a href="#install" className={buttonVariants({ size: 'lg' })}>
              Get Started
            </a>
            <a
              href="https://github.com/kessenma/PocketDev"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              View on GitHub
            </a>
          </div>
        </section>

        {/* Tech deep-dive accordion */}
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <Accordion>
            <AccordionItem value="tech-deep-dive">
              <AccordionTrigger
                className="text-base font-semibold"
                style={{ color: 'var(--architecture-text)' }}
              >
                Under the hood
              </AccordionTrigger>
              <AccordionContent>
                <TechStackSection />
                <SecurityModelSection />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <Footer />
      </div>
    </div>
  )
}

function IconPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
      style={{
        borderColor: architectureTokens.colors.border,
        color: architectureTokens.colors.textSecondary,
      }}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </div>
  )
}
