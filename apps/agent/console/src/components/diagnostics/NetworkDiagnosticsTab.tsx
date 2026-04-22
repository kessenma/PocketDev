import { useMemo } from 'react'
import { StatusBadge } from '#/components/ui/status-badge'
import type { StatusBadgeColor } from '#/components/ui/status-badge'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import type { NetworkDebugInfo } from '#/lib/api'
import { useLockStatus } from '#/context/LockStatusContext'
import { DomainSettings } from '#/components/DomainSettings'
import { Wifi, WifiOff, Shield, Radio, Lock, Unlock } from 'lucide-react'

interface Props {
  networkInfo: NetworkDebugInfo | null
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
  const hours = Math.floor(ms / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  return `${hours}h ${mins}m`
}

function eventColor(type: string): string {
  switch (type) {
    case 'connect': return 'border-green-500/50 text-green-400'
    case 'disconnect': return 'border-red-500/50 text-red-400'
    case 'auth_rejected': return 'border-orange-500/50 text-orange-400'
    case 'stale_closed': return 'border-yellow-500/50 text-yellow-400'
    default: return 'border-border/50 text-foreground/75'
  }
}

function eventBadgeColor(type: string): StatusBadgeColor {
  switch (type) {
    case 'connect': return 'green'
    case 'disconnect': return 'red'
    case 'auth_rejected': return 'orange'
    case 'stale_closed': return 'yellow'
    default: return 'neutral'
  }
}

function eventIcon(type: string) {
  switch (type) {
    case 'connect': return <Wifi className="h-3 w-3 text-green-400" />
    case 'disconnect': return <WifiOff className="h-3 w-3 text-red-400" />
    case 'auth_rejected': return <Shield className="h-3 w-3 text-orange-400" />
    case 'stale_closed': return <Radio className="h-3 w-3 text-yellow-400" />
    default: return null
  }
}

export function NetworkDiagnosticsTab({ networkInfo }: Props) {
  const clientCount = networkInfo?.websocket.connectedClients.length ?? 0
  const eventCount = networkInfo?.websocket.recentEvents.length ?? 0

  const { lockStatus, lockLoading, toggleFirewall, lockPort, unlockPort } = useLockStatus()

  const connectDisconnectPairs = useMemo(() => {
    if (!networkInfo) return { connects: 0, disconnects: 0, authRejected: 0, stalesClosed: 0 }
    const events = networkInfo.websocket.recentEvents
    return {
      connects: events.filter((e) => e.type === 'connect').length,
      disconnects: events.filter((e) => e.type === 'disconnect').length,
      authRejected: events.filter((e) => e.type === 'auth_rejected').length,
      stalesClosed: events.filter((e) => e.type === 'stale_closed').length,
    }
  }, [networkInfo])

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top row: clients + event log */}
      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
        {/* Left: Connected clients + stats */}
        <div className="flex flex-col gap-3">
          <div className="rounded-[1.5rem] border border-border/40 bg-background/50 p-4">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-[var(--bauhaus-yellow)]" />
              <p className="text-sm font-medium">WebSocket Clients</p>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.2rem] border border-border/40 bg-[var(--bauhaus-yellow)] p-4 text-black">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Connected</p>
                <p className="mt-2 text-3xl font-semibold">{clientCount}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">Connects</p>
                  <p className="mt-1 text-xl font-semibold text-green-400">{connectDisconnectPairs.connects}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">Disconnects</p>
                  <p className="mt-1 text-xl font-semibold text-red-400">{connectDisconnectPairs.disconnects}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">Auth Rejected</p>
                  <p className="mt-1 text-xl font-semibold text-orange-400">{connectDisconnectPairs.authRejected}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">Stales Closed</p>
                  <p className="mt-1 text-xl font-semibold text-yellow-400">{connectDisconnectPairs.stalesClosed}</p>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-border/40 bg-foreground/6 p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-foreground/45">Server Uptime</p>
                <p className="mt-1 text-sm text-foreground/80">
                  {networkInfo ? formatDuration(networkInfo.server.uptime) : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Connected client details */}
          <div className="rounded-[1.5rem] border border-border/40 bg-background p-4">
            <p className="text-sm font-medium">Active Connections</p>
            <div className="mt-3 space-y-2">
              {clientCount > 0 ? (
                networkInfo!.websocket.connectedClients.map((client) => (
                  <div key={client.deviceId} className="rounded-[1.2rem] border border-border/40 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-mono text-xs text-text-terminal">{client.deviceId}</p>
                      <StatusBadge color="green">connected</StatusBadge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-foreground/60">
                      <p>Duration: {formatDuration(client.connectedDuration)}</p>
                      <p>Messages: {client.messageCount}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-border/50 bg-background/30 p-4 text-sm text-foreground/52">
                  No devices connected. Connect the mobile app to see clients here.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Connection event log */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-border/40 bg-background">
          <div className="border-b border-border/40 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Connection Event Log</p>
              <StatusBadge color="neutral">
                {eventCount} event{eventCount === 1 ? '' : 's'}
              </StatusBadge>
            </div>
            <p className="mt-1 text-xs text-foreground/40">
              Last 50 WebSocket events — newest first. Use timestamps to correlate with mobile logs.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {eventCount > 0 ? (
              <div className="space-y-2">
                {networkInfo!.websocket.recentEvents.map((event, index) => (
                  <div
                    key={`${event.timestamp}-${index}`}
                    className={cn(
                      'rounded-[1.2rem] border bg-background/40 p-3',
                      eventColor(event.type),
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-0.5">
                        {eventIcon(event.type)}
                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/70">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <StatusBadge color={eventBadgeColor(event.type)}>
                        {event.type}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-foreground/70">
                      device: {event.deviceId}
                    </p>
                    {event.detail && (
                      <p className="mt-1 font-mono text-xs text-foreground/50">
                        {event.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[1.2rem] border border-dashed border-border/50 bg-background/30 p-6 text-center text-sm text-foreground/52">
                No WebSocket events yet. Connect the mobile app to start capturing connection events.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Port Security */}
      <div className="rounded-[1.5rem] border border-border/40 bg-background/50 p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--bauhaus-yellow)]" />
          <p className="text-sm font-medium">Port Security</p>
          {lockStatus && (
            <StatusBadge color={lockStatus.locked ? 'red' : 'green'}>
              {lockStatus.locked ? 'Locked' : 'Open'}
            </StatusBadge>
          )}
        </div>

        {lockStatus ? (
          <div className="mt-4 space-y-3">
            {!lockStatus.firewallAvailable && (
              <p className="rounded-[1rem] border border-yellow-600/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/8 dark:text-yellow-300/80">
                iptables unavailable — network-level locking requires root and iptables on the server.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 text-xs text-foreground/55">
              <div className="rounded-[1rem] border border-border/40 bg-foreground/5 p-2">
                <p className="uppercase tracking-wider text-[0.6rem] text-foreground/40">Wake Port</p>
                <p className="mt-1 font-mono">{lockStatus.wakePort}</p>
              </div>
              <div className="rounded-[1rem] border border-border/40 bg-foreground/5 p-2">
                <p className="uppercase tracking-wider text-[0.6rem] text-foreground/40">Auto-lock</p>
                <p className="mt-1 font-mono">
                  {lockStatus.autoLockMinutes > 0 ? `${lockStatus.autoLockMinutes}m` : 'off'}
                </p>
              </div>
              <div className="rounded-[1rem] border border-border/40 bg-foreground/5 p-2">
                <p className="uppercase tracking-wider text-[0.6rem] text-foreground/40">Clients</p>
                <p className="mt-1 font-mono">{lockStatus.activeClients}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={lockLoading}
                onClick={toggleFirewall}
                className={cn(
                  'rounded-[0.9rem] border text-xs',
                  lockStatus.firewallEnabled
                    ? 'border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10'
                    : 'border-border/40 text-foreground/60 hover:bg-foreground/8',
                )}
              >
                {lockStatus.firewallEnabled ? 'Disable Network Lock' : 'Enable Network Lock'}
              </Button>
              {lockStatus.firewallEnabled && (
                lockStatus.locked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={lockLoading}
                    onClick={unlockPort}
                    className="rounded-[0.9rem] border border-green-500/30 text-xs text-green-400 hover:bg-green-500/10"
                  >
                    <Unlock className="mr-1.5 h-3 w-3" />
                    Unlock Port
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={lockLoading}
                    onClick={lockPort}
                    className="rounded-[0.9rem] border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10"
                  >
                    <Lock className="mr-1.5 h-3 w-3" />
                    Lock Port Now
                  </Button>
                )
              )}
            </div>

            {!lockStatus.firewallEnabled && (
              <p className="text-xs text-foreground/35">
                Enable to allow iptables-level port blocking. The mobile app can lock/unlock the port remotely via the wake server on port {lockStatus.wakePort}.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-foreground/40">Loading security status…</p>
        )}
      </div>

      {/* Bottom row: Domain & HTTPS settings */}
      <DomainSettings />
    </div>
  )
}
