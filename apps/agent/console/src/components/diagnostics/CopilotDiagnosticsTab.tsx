import { Badge } from '#/components/ui/badge'
import type { CopilotAuthDebugInfo } from '#/lib/api'
import { BrandIcon } from '#/components/ui/brand-icon'

interface Props {
  copilotInfo: CopilotAuthDebugInfo | null
}

function formatShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function CopilotDiagnosticsTab({ copilotInfo }: Props) {
  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-border/40 bg-background/50 p-4">
          <div className="flex items-center gap-2">
            <BrandIcon brand="copilot" size={18} />
            <p className="text-sm font-medium">Copilot Trust State</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.2rem] border border-border/40 bg-[var(--bauhaus-yellow)] p-4 text-black">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Active Sessions</p>
              <p className="mt-2 text-3xl font-semibold">{copilotInfo?.activeSessionCount ?? 0}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">Persisted CLI State</p>
              <div className="mt-2 space-y-1 text-sm text-foreground/80">
                <p>Path: {copilotInfo?.persistedState?.path ?? 'Not stored'}</p>
                <p>Version: {copilotInfo?.persistedState?.version ?? 'Unknown'}</p>
                <p>Authenticated: {copilotInfo?.persistedState ? (copilotInfo.persistedState.authenticated ? 'Yes' : 'No') : 'Unknown'}</p>
                <p>Updated: {copilotInfo?.persistedState?.updatedAt ? new Date(copilotInfo.persistedState.updatedAt).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">Live Trust Check</p>
              <div className="mt-2 space-y-1 text-sm text-foreground/80">
                <p>Target: {copilotInfo?.liveStatusTarget ?? 'Unknown'}</p>
                <p>Trust configured: {copilotInfo?.liveStatus.trustConfigured ? 'Yes' : 'No'}</p>
                <p>Markers: {copilotInfo?.trustMarkers.length ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/40 bg-background p-4">
          <p className="text-sm font-medium">Trust Marker Paths</p>
          <div className="mt-3 space-y-2">
            {copilotInfo?.trustMarkers.length ? (
              copilotInfo.trustMarkers.map((marker) => (
                <div key={marker} className="rounded-[1.2rem] border border-border/40 bg-background/40 p-3 font-mono text-xs text-text-terminal">
                  {marker}
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border/50 bg-background/30 p-4 text-sm text-foreground/50">
                No remembered Copilot trust markers yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/40 bg-background p-4">
          <p className="text-sm font-medium">Recent Copilot Events</p>
          <div className="mt-3 space-y-2">
            {copilotInfo?.events.length ? (
              copilotInfo.events.map((event, index) => (
                <div key={`${event.ts}-${index}`} className="rounded-[1.2rem] border border-border/40 bg-background/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/38">
                    {formatShortTime(event.ts)} {event.sessionId ? `· ${event.sessionId.slice(0, 8)}` : ''}
                  </p>
                  <p className="mt-2 break-words font-mono text-xs text-text-terminal">{event.message}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border/50 bg-background/30 p-4 text-sm text-foreground/50">
                No Copilot trust events captured yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-border/40 bg-background p-3">
        <p className="text-sm font-medium">Active Copilot Sessions</p>
        <div className="mt-3 space-y-3">
          {copilotInfo?.sessions.length ? (
            copilotInfo.sessions.map((session) => (
              <div key={session.sessionId} className="rounded-[1.2rem] border border-border/40 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.state}</p>
                    <p className="mt-1 break-all font-mono text-xs text-foreground/50">{session.sessionId}</p>
                  </div>
                  <Badge variant="outline" className="border-border/50 text-foreground/75">
                    {session.trusted ? 'Trusted' : session.completed ? 'Completed' : 'Active'}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2 text-xs text-foreground/72">
                  <p>Trust handled: {session.trustHandled ? 'Yes' : 'No'}</p>
                  <p>Fallback attempted: {session.fallbackTrustAttempted ? 'Yes' : 'No'}</p>
                  <p>UI ready: {session.uiReady ? 'Yes' : 'No'}</p>
                  <p>Trust target: {session.trustTarget ?? 'Unknown'}</p>
                  <p>Prompt: {session.prompt ?? 'None'}</p>
                  <p>Error: {session.error ?? 'None'}</p>
                  <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
                </div>
                {session.outputExcerpt ? (
                  <div className="mt-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/38">Output Excerpt</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-text-terminal">
                      {session.outputExcerpt}
                    </pre>
                    {session.rawOutputExcerpt ? (
                      <>
                        <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/38">Raw Output Excerpt</p>
                        <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
                          {session.rawOutputExcerpt}
                        </pre>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 bg-background/30 p-4 text-sm text-foreground/50">
              No active Copilot trust sessions. Open the Copilot wizard on the mobile app to start one.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
