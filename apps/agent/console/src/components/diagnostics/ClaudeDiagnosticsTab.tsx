import { Badge } from '#/components/ui/badge'
import type { ClaudeAuthDebugInfo } from '#/lib/api'
import { Sparkles } from 'lucide-react'

interface Props {
  claudeInfo: ClaudeAuthDebugInfo | null
}

function formatShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ClaudeDiagnosticsTab({ claudeInfo }: Props) {
  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">Claude Auth State</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.2rem] border border-white/8 bg-[#f0c419] p-4 text-black">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Active Sessions</p>
              <p className="mt-2 text-3xl font-semibold">{claudeInfo?.activeSessionCount ?? 0}</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Persisted CLI State</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>Path: {claudeInfo?.persistedState?.path ?? 'Not stored'}</p>
                <p>Version: {claudeInfo?.persistedState?.version ?? 'Unknown'}</p>
                <p>Authenticated: {claudeInfo?.persistedState ? (claudeInfo.persistedState.authenticated ? 'Yes' : 'No') : 'Unknown'}</p>
                <p>Updated: {claudeInfo?.persistedState?.updatedAt ? new Date(claudeInfo.persistedState.updatedAt).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
        <p className="text-sm font-medium">Active Claude Sessions</p>
        <div className="mt-3 space-y-3">
          {claudeInfo?.sessions.length ? (
            claudeInfo.sessions.map((session) => (
              <div key={session.sessionId} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.state}</p>
                    <p className="mt-1 break-all font-mono text-xs text-[#f4f0e8]/50">{session.sessionId}</p>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/75">
                    {session.authenticated ? 'Authenticated' : session.completed ? 'Completed' : 'Active'}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2 text-xs text-[#f4f0e8]/72">
                  <p>Theme handled: {session.themeHandled ? 'Yes' : 'No'}</p>
                  <p>Method handled: {session.methodHandled ? 'Yes' : 'No'}</p>
                  <p>Prompt: {session.prompt ?? 'None'}</p>
                  <p>Error: {session.error ?? 'None'}</p>
                  <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
                  {session.authUrl ? (
                    <p className="break-all font-mono text-[11px] text-[#9df6cd]">{session.authUrl}</p>
                  ) : null}
                </div>
                {session.outputExcerpt ? (
                  <div className="mt-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Output Excerpt</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-[#9df6cd]">
                      {session.outputExcerpt}
                    </pre>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No active Claude auth sessions. Open the Claude wizard on the mobile app to start one.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
