import type { MinimaxSetupDebugInfo } from '#/lib/api'
import { BrandIcon } from '#/components/ui/brand-icon'
import { Check, X } from 'lucide-react'

interface Props {
  minimaxInfo: MinimaxSetupDebugInfo | null
}

export function MinimaxDiagnosticsTab({ minimaxInfo }: Props) {
  const status = minimaxInfo?.status ?? null

  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-border/40 bg-background/50 p-4">
          <div className="flex items-center gap-2">
            <BrandIcon brand="minimax" size={18} />
            <p className="text-sm font-medium">Minimax Provider State</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className={`rounded-[1.2rem] border border-border/40 p-4 ${status?.api_key_configured ? 'bg-[var(--bauhaus-yellow)] text-black' : 'bg-foreground/6'}`}>
              <p className={`text-[0.68rem] font-semibold uppercase tracking-[0.26em] ${status?.api_key_configured ? 'text-black/55' : 'text-foreground/45'}`}>
                API Key
              </p>
              <div className="mt-2 flex items-center gap-2">
                {status?.api_key_configured
                  ? <Check size={16} className="shrink-0 text-black/70" strokeWidth={2.5} />
                  : <X size={16} className="shrink-0 text-foreground/50" strokeWidth={2.5} />
                }
                <p className={`text-lg font-semibold ${status?.api_key_configured ? 'text-black' : 'text-foreground/80'}`}>
                  {status?.api_key_configured ? 'Configured' : 'Not configured'}
                </p>
              </div>
              {status?.api_key_masked ? (
                <p className="mt-2 font-mono text-xs text-black/60">{status.api_key_masked}</p>
              ) : null}
            </div>

            <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">OpenCode Runtime</p>
              <div className="mt-2 space-y-1 text-sm text-foreground/80">
                <p>Installed: {status ? (status.opencode_installed ? 'Yes' : 'No') : 'Unknown'}</p>
                <p>Version: {status?.opencode_version ?? 'Unknown'}</p>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">Verification</p>
              <div className="mt-2 space-y-1 text-sm text-foreground/80">
                <p>Verified: {status ? (status.verified ? 'Yes' : 'No') : 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-border/40 bg-background p-4">
        <p className="text-sm font-medium">Setup Details</p>

        {status ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.2rem] border border-border/40 bg-background/40 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/38">How Minimax works</p>
              <p className="mt-2 text-sm text-foreground/75 leading-relaxed">
                Minimax is configured as an OpenCode provider — there is no separate binary. The API key is written to the
                OpenCode config file at <span className="font-mono text-text-terminal">~/.config/opencode/config.json</span> or{' '}
                <span className="font-mono text-text-terminal">~/.opencode/config.json</span> under{' '}
                <span className="font-mono text-text-terminal">providers.minimax.apiKey</span>.
              </p>
            </div>

            {status.verify_output ? (
              <div className="rounded-[1.2rem] border border-border/40 bg-background/40 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/38">Last Verify Output</p>
                <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-text-terminal">
                  {status.verify_output}
                </pre>
              </div>
            ) : null}

            {!status.opencode_installed && (
              <div className="rounded-[1.2rem] border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-red-400/70">Prerequisite Missing</p>
                <p className="mt-2 text-sm text-red-300/80">
                  OpenCode must be installed before Minimax can be configured.
                  Use the OpenCode wizard in the mobile app to install it.
                </p>
              </div>
            )}

            {status.opencode_installed && !status.api_key_configured && (
              <div className="rounded-[1.2rem] border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-yellow-400/70">API Key Missing</p>
                <p className="mt-2 text-sm text-yellow-300/80">
                  OpenCode is installed but no Minimax API key is configured.
                  Use the Minimax wizard in the mobile app to add your key.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.2rem] border border-dashed border-border/50 bg-background/30 p-4 text-sm text-foreground/52">
            No Minimax setup data yet.
          </div>
        )}
      </div>
    </div>
  )
}
