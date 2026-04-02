import { createFileRoute } from '@tanstack/react-router'
import { buttonVariants } from '#/components/ui/button'
import { SystemOverview } from '#/components/architecture/SystemOverview'
import { AgentEndpoints } from '#/components/architecture/AgentEndpoints'
import { SecurityModel } from '#/components/architecture/SecurityModel'
import { WireProtocol } from '#/components/architecture/WireProtocol'
import { TechStack } from '#/components/architecture/TechStack'
import { Footer } from '#/components/landing/Footer'
import { ArchGraphic } from '#/components/architecture/arch-graphic'

export const Route = createFileRoute('/architecture')({
  component: ArchitecturePage,
})

function ArchitecturePage() {
  return (
    <div className="min-h-screen">
      <header className="flex flex-col items-center px-6 pt-24 pb-8 text-center">
        <a
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to home
        </a>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Architecture
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          A deeper look at how PocketDev connects your phone to AI coding agents
          running on remote servers.
        </p>
        <ArchGraphic className="mt-12 w-full max-w-lg" />
      </header>

      <SystemOverview />
      <AgentEndpoints />
      <SecurityModel />
      <WireProtocol />
      <TechStack />

      <div className="flex justify-center px-6 py-12">
        <a href="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Back to home
        </a>
      </div>

      <Footer />
    </div>
  )
}
