import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { ServerTerminal } from '#/components/ServerTerminal'
import { fetchAuthDebug, fetchTerminalDebug, type AuthDebugInfo, type TerminalDebugEntry } from '#/lib/api'
import { cn } from '#/lib/utils'
import { Bug, Maximize2, RefreshCw, Smartphone, Terminal, Waves } from 'lucide-react'

type DiagnosticsTab = 'terminal' | 'registry'

interface DiagnosticsPanelProps {
  onOpenTerminal: () => void
}

function formatShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function DiagnosticsPanel({ onOpenTerminal }: DiagnosticsPanelProps) {
  const [activeTab, setActiveTab] = useState<DiagnosticsTab>('terminal')
  const [info, setInfo] = useState<AuthDebugInfo | null>(null)
  const [termLog, setTermLog] = useState<TerminalDebugEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [authData, termData] = await Promise.all([
        fetchAuthDebug(),
        fetchTerminalDebug(),
      ])
      setInfo(authData)
      setTermLog(termData)
      setLastUpdated(new Date().toISOString())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!live) return

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }, 2500)

    return () => window.clearInterval(interval)
  }, [live, refresh])

  const logSummary = useMemo(() => {
    const latest = termLog[0]
    if (!latest) return 'No terminal WS activity yet.'
    return `${termLog.length} entries captured`
  }, [termLog])

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#111111_0%,#181818_100%)] text-[#f4f0e8] shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[#f4f0e8]/45">Diagnostics Desk</p>
            <Badge variant="outline" className="border-yellow-500/35 text-yellow-400">dev</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-[#f0c419]" />
            <h2 className="text-lg font-semibold">Terminal & Device Debug</h2>
          </div>
          <p className="text-sm text-[#f4f0e8]/58">
            One surface for the live shell, websocket trace, and registered device state.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-white/10 bg-black/30 p-1">
            {(['terminal', 'registry'] as const).map((tab) => (
              <Button
                key={tab}
                size="sm"
                variant={activeTab === tab ? 'secondary' : 'ghost'}
                className={cn(
                  'rounded-full px-3 text-[#f4f0e8]',
                  activeTab === tab ? 'bg-[#f0c419] text-black hover:bg-[#f0c419]/90' : 'hover:bg-white/10',
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'terminal' ? 'Terminal' : 'Registry'}
              </Button>
            ))}
          </div>
          <Button
            variant={live ? 'secondary' : 'outline'}
            size="sm"
            className={cn(
              live ? 'bg-[#f0c419] text-black hover:bg-[#f0c419]/90' : 'border-white/15 bg-white/8 text-[#f4f0e8] hover:bg-white/14',
            )}
            onClick={() => setLive((current) => !current)}
          >
            Live {live ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" className="border-white/15 bg-white/8 text-[#f4f0e8] hover:bg-white/14" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs text-[#f4f0e8]/55 sm:px-6">
        <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/70">
          {activeTab === 'terminal' ? logSummary : `${info?.deviceCount ?? 0} registered device${info?.deviceCount === 1 ? '' : 's'}`}
        </Badge>
        {lastUpdated ? (
          <span>Updated {formatShortTime(lastUpdated)}</span>
        ) : null}
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 px-3 pb-3 sm:px-4 sm:pb-4">
        {activeTab === 'terminal' ? (
          <div className="grid h-full gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-white/8 bg-black/35">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Live Shell</p>
                  <p className="text-xs text-[#f4f0e8]/50">Use the full-screen terminal for longer sessions.</p>
                </div>
                <Button variant="outline" size="sm" className="border-white/15 bg-white/8 text-[#f4f0e8] hover:bg-white/14" onClick={onOpenTerminal}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Full Screen
                </Button>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <ServerTerminal
                  defaultOpen
                  hideHeader
                  className="h-full rounded-[1.2rem] border border-white/6 bg-black text-[#f4f0e8] shadow-none"
                  heightClassName="h-full"
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#101010]">
              <div className="border-b border-white/8 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-[#f0c419]" />
                  <p className="text-sm font-medium">Terminal WS Log</p>
                </div>
                <p className="mt-1 text-xs text-[#f4f0e8]/50">
                  Scrollable trace panel, fixed to this card so it never forces the layout outward.
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-xs">
                {termLog.length === 0 ? (
                  <p className="rounded-xl border border-white/8 bg-black/30 p-3 text-[#f4f0e8]/50">
                    No websocket activity yet. Open a mobile workflow or use the shell to generate traffic.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {termLog.map((entry, index) => (
                      <div key={`${entry.ts}-${index}`} className="rounded-xl border border-white/8 bg-black/30 p-3 text-[#7fffd4]">
                        <div className="mb-1 text-[10px] uppercase tracking-[0.22em] text-[#f4f0e8]/35">
                          {formatShortTime(entry.ts)}
                        </div>
                        <div className="break-all text-[#9df6cd]">{entry.msg}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid h-full gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
              <p className="text-sm font-medium">Registry Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[1.2rem] border border-white/8 bg-[#f0c419] p-4 text-black">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Devices</p>
                  <p className="mt-2 text-3xl font-semibold">{info?.deviceCount ?? 0}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Health</p>
                  <p className="mt-2 text-sm text-[#f4f0e8]/80">
                    {info?.deviceCount ? 'Registry populated and ready for auth checks.' : 'No devices in DB. Reconnect attempts will fail until a device is paired again.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
              {info?.devices.length ? (
                <div className="space-y-3">
                  {info.devices.map((device) => (
                    <div key={device.id} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-[#f0c419]" />
                            <p className="truncate text-sm font-medium">{device.name ?? 'Unnamed device'}</p>
                          </div>
                          <p className="mt-1 text-xs text-[#f4f0e8]/50">{device.id}</p>
                        </div>
                        <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/75">{device.platform ?? 'unknown'}</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Public Key</p>
                          <p className="mt-1 font-mono text-xs text-[#f4f0e8]/72">{device.publicKeyPrefix}</p>
                        </div>
                        <div>
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Last Seen</p>
                          <p className="mt-1 text-xs text-[#f4f0e8]/72">{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-[#f4f0e8]/52">
                  Pair a device first, then this panel becomes the registry view for auth-oriented debugging.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
