import { buttonVariants } from '#/components/ui/button'
import { HeroGraphic } from '#/components/landing/hero-graphic'

export function Hero() {
  return (
    <section className="flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground mb-8">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Coming soon
      </div>

      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
        Run your dev environment{' '}
        <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
          from your pocket
        </span>
      </h1>

      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Install on any Linux VPS, pair your phone, and control AI coding agents
        from anywhere. No laptop required.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
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

      <HeroGraphic className="mt-16 w-full max-w-lg" />
    </section>
  )
}
