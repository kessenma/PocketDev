import { Badge } from '#/components/ui/badge'
import type { CodexAuthDebugInfo } from '#/lib/api'
import { cn } from '#/lib/utils'
import { KeyRound, Waves } from 'lucide-react'

interface Props {
  codexInfo: CodexAuthDebugInfo | null
}

function formatShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function CodexDiagnosticsTab({ codexInfo }: Props) {
  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">Codex Auth State</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.2rem] border border-white/8 bg-[#f0c419] p-4 text-black">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Active Sessions</p>
              <p className="mt-2 text-3xl font-semibold">{codexInfo?.activeSessionCount ?? 0}</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Persisted CLI State</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>Path: {codexInfo?.persistedState?.path ?? 'Not stored'}</p>
                <p>Version: {codexInfo?.persistedState?.version ?? 'Unknown'}</p>
                <p>Authenticated: {codexInfo?.persistedState ? (codexInfo.persistedState.authenticated ? 'Yes' : 'No') : 'Unknown'}</p>
                <p>Updated: {codexInfo?.persistedState?.updatedAt ? new Date(codexInfo.persistedState.updatedAt).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
          <p className="text-sm font-medium">Last Callback Replay</p>
          {codexInfo?.lastReplayDebug ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3">
                <p className="text-xs uppercase tracking-[0.22em] text-[#f4f0e8]/38">Result</p>
                <p className={cn('mt-2 font-medium', codexInfo.lastReplayDebug.success ? 'text-green-400' : 'text-red-400')}>
                  {codexInfo.lastReplayDebug.success ? 'Replay succeeded' : 'Replay failed'}
                </p>
                <p className="mt-1 text-sm text-[#f4f0e8]/70">{codexInfo.lastReplayDebug.error ?? 'No error reported'}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3">
                <p className="text-xs uppercase tracking-[0.22em] text-[#f4f0e8]/38">Input Callback URL</p>
                <p className="mt-2 break-all font-mono text-xs text-[#9df6cd]">{codexInfo.lastReplayDebug.inputCallbackUrl ?? 'None'}</p>
                <p className="mt-2 text-xs text-[#f4f0e8]/45">{new Date(codexInfo.lastReplayDebug.recordedAt).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No callback replay attempts yet.
            </div>
          )}
        </div>
      </div>

      <div className="grid min-h-0 gap-3">
        <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
          <div className="mb-3 flex items-center gap-2">
            <Waves className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">Replay Attempts</p>
          </div>
          {codexInfo?.lastReplayDebug?.attempts.length ? (
            <div className="space-y-2">
              {codexInfo.lastReplayDebug.attempts.map((attempt, index) => (
                <div key={`${attempt}-${index}`} className="rounded-xl border border-white/8 bg-black/30 p-3 font-mono text-xs text-[#9df6cd]">
                  {attempt}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No replay attempts captured yet.
            </div>
          )}
        </div>

        <div className="grid min-h-0 gap-3 lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
            <p className="text-sm font-medium">Active Codex Sessions</p>
            <div className="mt-3 space-y-3">
              {codexInfo?.sessions.length ? (
                codexInfo.sessions.map((session) => (
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
                      <p>Prompt: {session.prompt ?? 'None'}</p>
                      <p>Error: {session.error ?? 'None'}</p>
                      <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
                      {session.authUrl ? (
                        <p className="break-all font-mono text-[11px] text-[#9df6cd]">{session.authUrl}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                  No active Codex auth sessions.
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
            <p className="text-sm font-medium">Recent Codex Output</p>
            <div className="mt-3 space-y-3">
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Last Replay Prompt</p>
                <p className="mt-2 text-sm text-[#f4f0e8]/80">{codexInfo?.lastReplayDebug?.sessionPrompt ?? 'None'}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Output Excerpt</p>
                <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-[#9df6cd]">
                  {codexInfo?.lastReplayDebug?.sessionOutputExcerpt ?? codexInfo?.sessions[0]?.outputExcerpt ?? 'No Codex output captured yet.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
