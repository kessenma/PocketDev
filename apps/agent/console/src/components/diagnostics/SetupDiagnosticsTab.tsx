import { Badge } from '#/components/ui/badge'
import type { SetupDebugInfo } from '#/lib/api'
import { cn } from '#/lib/utils'
import { ShieldCheck } from 'lucide-react'

interface Props {
  setupInfo: SetupDebugInfo | null
}

function statusColor(status: string): string {
  switch (status) {
    case 'installed': return 'text-green-400'
    case 'missing': return 'text-red-400'
    case 'misconfigured': return 'text-yellow-400'
    default: return 'text-[#f4f0e8]/70'
  }
}

function authColor(auth: string): string {
  switch (auth) {
    case 'authenticated': return 'text-green-400'
    case 'unauthenticated': return 'text-red-400'
    case 'not_applicable': return 'text-[#f4f0e8]/40'
    default: return 'text-[#f4f0e8]/70'
  }
}

export function SetupDiagnosticsTab({ setupInfo }: Props) {
  const claude = setupInfo?.providers.claude
  const codex = setupInfo?.providers.codex

  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">Provider Readiness</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className={cn(
              'rounded-[1.2rem] border border-white/8 p-4',
              claude?.authenticated ? 'bg-[#f0c419] text-black' : 'bg-white/6',
            )}>
              <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.26em]', claude?.authenticated ? 'text-black/55' : 'text-[#f4f0e8]/45')}>Claude CLI</p>
              <div className={cn('mt-2 space-y-1 text-sm', claude?.authenticated ? 'text-black/80' : 'text-[#f4f0e8]/80')}>
                <p>Installed: {claude?.installed ? 'Yes' : 'No'}</p>
                <p>Authenticated: {claude?.authenticated ? 'Yes' : 'No'}</p>
                <p>Version: {claude?.version ?? 'Unknown'}</p>
                <p>Path: {claude?.path ?? 'Not found'}</p>
              </div>
            </div>
            <div className={cn(
              'rounded-[1.2rem] border border-white/8 p-4',
              codex?.authenticated ? 'bg-[#f0c419] text-black' : 'bg-white/6',
            )}>
              <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.26em]', codex?.authenticated ? 'text-black/55' : 'text-[#f4f0e8]/45')}>Codex CLI</p>
              <div className={cn('mt-2 space-y-1 text-sm', codex?.authenticated ? 'text-black/80' : 'text-[#f4f0e8]/80')}>
                <p>Installed: {codex?.installed ? 'Yes' : 'No'}</p>
                <p>Authenticated: {codex?.authenticated ? 'Yes' : 'No'}</p>
                <p>Version: {codex?.version ?? 'Unknown'}</p>
                <p>Path: {codex?.path ?? 'Not found'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
          <p className="text-sm font-medium">System Info</p>
          <div className="mt-3 rounded-[1.2rem] border border-white/8 bg-black/30 p-3 text-sm text-[#f4f0e8]/78">
            <p>OS: {setupInfo?.prerequisites.os ?? 'Unknown'}</p>
            <p>Arch: {setupInfo?.prerequisites.arch ?? 'Unknown'}</p>
            <p>Overall ready: {setupInfo?.prerequisites.ready ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
        <p className="text-sm font-medium">Prerequisites Tool Check</p>
        <div className="mt-3 space-y-2">
          {setupInfo?.prerequisites.tools.length ? (
            setupInfo.prerequisites.tools.map((tool) => (
              <div key={tool.id} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="mt-1 font-mono text-xs text-[#f4f0e8]/50">{tool.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={cn('border-white/10', statusColor(tool.status))}>
                      {tool.status}
                    </Badge>
                    {tool.auth_status !== 'not_applicable' && (
                      <Badge variant="outline" className={cn('border-white/10', authColor(tool.auth_status))}>
                        {tool.auth_status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-[#f4f0e8]/60">
                  {tool.version && <span>v{tool.version} · </span>}
                  {tool.path && <span className="font-mono">{tool.path}</span>}
                  {tool.required && <span className="ml-2 text-yellow-400">(required)</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No prerequisites data. Refresh to load.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
