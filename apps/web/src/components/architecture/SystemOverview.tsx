import { Badge } from '#/components/ui/badge'

export function SystemOverview() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          System Overview
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Three components, one connection. The mobile app talks to an agent
          process on your server, which orchestrates AI tools and your filesystem.
        </p>

        <div className="flex flex-col items-center gap-3">
          {/* Mobile */}
          <div className="w-full max-w-sm rounded-lg border border-border bg-card/50 p-4 text-center">
            <Badge variant="outline" className="px-3 py-1.5 text-xs font-mono mb-2">
              iOS / iPad App
            </Badge>
            <p className="text-xs text-muted-foreground">
              Task control, live streaming, file diffs, terminal
            </p>
          </div>

          <ConnectorArrow label="HTTPS + WebSocket (port 4387)" />

          {/* Agent */}
          <div className="w-full max-w-sm rounded-lg border border-border bg-card/50 p-4 text-center">
            <Badge variant="outline" className="px-3 py-1.5 text-xs font-mono mb-2">
              PocketDev Agent
            </Badge>
            <p className="text-xs text-muted-foreground">
              Bun + Elysia single-process server with SQLite
            </p>
          </div>

          <ConnectorArrow label="Process spawn + PTY" />

          {/* AI + Filesystem */}
          <div className="flex w-full max-w-sm gap-3">
            <div className="flex-1 rounded-lg border border-border bg-card/50 p-4 text-center">
              <Badge variant="outline" className="px-3 py-1.5 text-xs font-mono mb-2">
                Claude / Codex
              </Badge>
              <p className="text-xs text-muted-foreground">AI coding agents</p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-card/50 p-4 text-center">
              <Badge variant="outline" className="px-3 py-1.5 text-xs font-mono mb-2">
                Filesystem
              </Badge>
              <p className="text-xs text-muted-foreground">Files, git, dev server</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ConnectorArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="20" viewBox="0 0 16 20" className="text-muted-foreground">
        <path d="M8 0v16M3 12l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
    </div>
  )
}
