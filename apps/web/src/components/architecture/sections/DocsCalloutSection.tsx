import { buttonVariants } from '#/components/ui/button'

export function DocsCalloutSection() {
  return (
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
  )
}
