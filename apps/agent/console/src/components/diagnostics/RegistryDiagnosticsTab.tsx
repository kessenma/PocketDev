import { Badge } from '#/components/ui/badge'
import type { AuthDebugInfo } from '#/lib/api'
import { Smartphone } from 'lucide-react'

interface Props {
  info: AuthDebugInfo | null
}

export function RegistryDiagnosticsTab({ info }: Props) {
  return (
    <div className="grid h-full gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="rounded-[1.5rem] border border-border/40 bg-background/50 p-4">
        <p className="text-sm font-medium">Registry Snapshot</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-[1.2rem] border border-border/40 bg-[var(--bauhaus-yellow)] p-4 text-black">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Devices</p>
            <p className="mt-2 text-3xl font-semibold">{info?.deviceCount ?? 0}</p>
          </div>
          <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">Health</p>
            <p className="mt-2 text-sm text-foreground/80">
              {info?.deviceCount ? 'Registry populated and ready for auth checks.' : 'No devices in DB. Reconnect attempts will fail until a device is paired again.'}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-border/40 bg-background p-3">
        {info?.devices.length ? (
          <div className="space-y-3">
            {info.devices.map((device) => (
              <div key={device.id} className="rounded-[1.2rem] border border-border/40 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-[var(--bauhaus-yellow)]" />
                      <p className="truncate text-sm font-medium">{device.name ?? 'Unnamed device'}</p>
                    </div>
                    <p className="mt-1 text-xs text-foreground/50">{device.id}</p>
                  </div>
                  <Badge variant="outline" className="border-border/50 text-foreground/75">{device.platform ?? 'unknown'}</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/38">Public Key</p>
                    <p className="mt-1 font-mono text-xs text-foreground/72">{device.publicKeyPrefix}</p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/38">Last Seen</p>
                    <p className="mt-1 text-xs text-foreground/72">{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[1.2rem] border border-dashed border-border/50 bg-background/30 p-6 text-center text-sm text-foreground/50">
            Pair a device first, then this panel becomes the registry view for auth-oriented debugging.
          </div>
        )}
      </div>
    </div>
  )
}
