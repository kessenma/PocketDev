import { Button } from '#/components/ui/button'
import { StatusBadge } from '#/components/ui/status-badge'
import { ServerTerminal } from '#/components/ServerTerminal'
import type { ConnectionState } from '#/components/ServerTerminal'
import type { TerminalDebugEntry } from '#/lib/api'
import { cn } from '#/lib/utils'
import { Maximize2, Waves } from 'lucide-react'

interface Props {
  termLog: TerminalDebugEntry[]
  termConnState: ConnectionState
  onConnectionStateChange: (state: ConnectionState) => void
  onOpenTerminal: () => void
}

function formatShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const panelShell = 'rounded-[0.95rem] border-2 border-border bg-card'
const panelInset = 'rounded-[0.85rem] border-2 border-border bg-background'
const sectionTitle = 'font-heading text-sm font-semibold uppercase tracking-[0.12em]'

export function TerminalDiagnosticsTab({ termLog, termConnState, onConnectionStateChange, onOpenTerminal }: Props) {
  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <div className={cn('flex min-h-0 flex-col overflow-hidden', panelShell)}>
        <div className="flex items-center justify-between gap-3 border-b-2 border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <p className={sectionTitle}>Live Shell</p>
            <StatusBadge
              color={termConnState === 'connected' ? 'green' : termConnState === 'connecting' ? 'yellow' : 'neutral'}
              className={termConnState === 'connecting' ? 'animate-pulse' : ''}
            >
              {termConnState}
            </StatusBadge>
          </div>
          <p className="text-xs text-foreground/50">Use the full-screen terminal for longer sessions.</p>
          <Button variant="outline" size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={onOpenTerminal}>
            <Maximize2 className="mr-2 h-4 w-4" />
            Full Screen
          </Button>
        </div>
        <div className="min-h-0 flex-1 p-3">
          <ServerTerminal
            defaultOpen
            hideHeader
            onConnectionStateChange={onConnectionStateChange}
            className="h-full rounded-[0.8rem] border-2 border-[var(--border)] bg-black text-[#f5eedf] shadow-none"
            heightClassName="h-full"
          />
        </div>
      </div>

      <div className={cn('flex min-h-0 flex-col overflow-hidden', panelInset)}>
        <div className="border-b-2 border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-[var(--bauhaus-yellow)]" />
            <p className={sectionTitle}>Terminal WS Log</p>
          </div>
          <p className="mt-1 text-xs text-foreground/50">
            Scrollable trace panel, fixed to this card so it never forces the layout outward.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-xs">
          {termLog.length === 0 ? (
            <p className="rounded-[0.8rem] border-2 border-border bg-muted/50 p-3 text-foreground/50">
              No websocket activity yet. Open a mobile workflow or use the shell to generate traffic.
            </p>
          ) : (
            <div className="space-y-2">
              {termLog.map((entry, index) => (
                <div key={`${entry.ts}-${index}`} className="rounded-[0.8rem] border-2 border-border bg-background/40 p-3 text-text-terminal">
                  <div className="mb-1 font-heading text-[10px] uppercase tracking-[0.22em] text-foreground/35">
                    {formatShortTime(entry.ts)}
                  </div>
                  <div className="break-all text-text-terminal">{entry.msg}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
