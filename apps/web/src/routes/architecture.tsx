import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { buttonVariants } from '#/components/ui/button'
import { HeroScrollSequence } from '#/components/architecture/animations/hero-sequence'
import { HeroLaptopOverlay } from '#/components/architecture/animations/hero-sequence/HeroLaptopOverlay'
import {
  HowPocketDevWorksSection,
  RepoHistoryTransitionSection,
} from '#/components/architecture/sections'
import { Footer } from '#/components/landing/Footer'
import { architectureTokens } from '#/components/architecture/shared/theme'

function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <>{children}</> : <>{fallback}</>
}

export const Route = createFileRoute('/architecture')({
  component: ArchitecturePage,
})

function ArchitecturePage() {
  const howItWorksRef = useRef<HTMLDivElement>(null)
  const [heroProgress, setHeroProgress] = useState(0)

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
        <HeroLaptopOverlay heroProgress={heroProgress} howItWorksRef={howItWorksRef} />
        <HowPocketDevWorksSection sectionRef={howItWorksRef} />
        <RepoHistoryTransitionSection />
      </ClientOnly>

      <div className="flex flex-col items-center gap-6 px-6 py-20 text-center">
        <p className="text-sm uppercase tracking-widest text-neutral-500" style={{ fontFamily: 'var(--font-mono), monospace' }}>
          Want the full picture?
        </p>
        <h2
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ fontFamily: 'var(--font-display), var(--font-heading), sans-serif', letterSpacing: '-0.03em' }}
        >
          Read the docs
        </h2>
        <p className="max-w-md text-base text-neutral-500">
          Deep-dives on the wire protocol, security model, agent endpoints, and more.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="https://docs.pocketdev.run/"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'default', size: 'lg' })}
          >
            Learn more in the docs
          </a>
          <a href="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Back to home
          </a>
        </div>
      </div>

      <Footer />
    </div>
  )
}
