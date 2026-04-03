import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { fetchAuthDebug, fetchTerminalDebug, type AuthDebugInfo, type TerminalDebugEntry } from '#/lib/api'
import { Bug, RefreshCw, Clock, Smartphone, Terminal } from 'lucide-react'

export function AuthDebugPanel() {
  const [info, setInfo] = useState<AuthDebugInfo | null>(null)
  const [termLog, setTermLog] = useState<TerminalDebugEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [showTermLog, setShowTermLog] = useState(false)

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <Card className="border-dashed border-yellow-500/40">
      <CardHeader className="cursor-pointer" onClick={() => { setExpanded(!expanded); if (!expanded && !info) refresh() }}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bug className="h-4 w-4 text-yellow-500" />
          Auth &amp; Terminal Debug
          <Badge variant="outline" className="text-xs font-normal text-yellow-600">dev</Badge>
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {info && (
            <>
              {/* Server time */}
              <div className="rounded-md border p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" /> Server Time
                </div>
                <p className="font-mono text-sm">{info.serverTimeISO}</p>
                <p className="font-mono text-xs text-muted-foreground">epoch: {info.serverTime}</p>
              </div>

              {/* Devices */}
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Smartphone className="h-3 w-3" /> Registered Devices ({info.deviceCount})
                </div>
                {info.devices.length === 0 && (
                  <p className="text-sm text-destructive font-medium">No devices in DB — reconnect will always 401!</p>
                )}
                {info.devices.map((d) => (
                  <div key={d.id} className="rounded border bg-muted/50 p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{d.name ?? 'unnamed'}</span>
                      <Badge variant="secondary" className="text-xs">{d.platform ?? '?'}</Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground break-all">id: {d.id}</p>
                    <p className="font-mono text-xs text-muted-foreground">pubkey: {d.publicKeyPrefix}</p>
                    <p className="text-xs text-muted-foreground">last seen: {d.lastSeenAt ?? 'never'}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Terminal WS log */}
          <div className="rounded-md border p-3 space-y-2">
            <button
              className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground"
              onClick={() => setShowTermLog(!showTermLog)}
            >
              <Terminal className="h-3 w-3" />
              Terminal WS Log ({termLog.length} entries)
              <span className="ml-auto text-xs">{showTermLog ? '▲' : '▼'}</span>
            </button>

            {showTermLog && (
              <div className="max-h-80 overflow-y-auto rounded bg-black/90 p-2 font-mono text-xs text-green-400 space-y-0.5">
                {termLog.length === 0 && (
                  <p className="text-muted-foreground">No terminal WS activity yet. Open a wizard on the mobile app to generate logs.</p>
                )}
                {termLog.map((entry, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="shrink-0 text-green-700">{entry.ts.split('T')[1]?.slice(0, 12)}</span>
                    <span className="break-all">{entry.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
