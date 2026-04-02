import { Badge } from '#/components/ui/badge'

export function Architecture() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-12">
          Architecture
        </h2>

        <div className="flex flex-col items-center gap-3">
          <Badge variant="outline" className="px-4 py-2 text-sm font-mono">
            Mobile App
          </Badge>

          <Arrow />

          <div className="rounded-lg border border-border bg-muted/50 px-5 py-3 text-center font-mono text-sm">
            <span className="text-muted-foreground">HTTPS / WebSocket</span>
          </div>

          <Arrow />

          <Badge variant="outline" className="px-4 py-2 text-sm font-mono">
            PocketDev Agent
          </Badge>

          <Arrow />

          <Badge variant="outline" className="px-4 py-2 text-sm font-mono">
            Claude / Codex / CLI
          </Badge>

          <Arrow />

          <Badge variant="outline" className="px-4 py-2 text-sm font-mono">
            Filesystem + Dev Server
          </Badge>
        </div>
      </div>
    </section>
  )
}

function Arrow() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" viewBox="0 0 16 24" className="text-muted-foreground">
      <path d="M8 0v20M3 16l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
