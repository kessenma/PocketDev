import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { fetchPrerequisites, type ToolCheck, type PrerequisitesReport } from '#/lib/api'
import { Wrench, RefreshCw, Check, X, AlertTriangle } from 'lucide-react'

function statusColor(tool: ToolCheck): string {
  if (tool.status === 'missing') return 'text-red-500'
  if (tool.status === 'misconfigured' || tool.auth_status === 'unauthenticated') return 'text-yellow-500'
  return 'text-green-500'
}

function statusDotColor(tool: ToolCheck): string {
  if (tool.status === 'missing') return 'bg-red-500'
  if (tool.status === 'misconfigured' || tool.auth_status === 'unauthenticated') return 'bg-yellow-500'
  return 'bg-green-500'
}

function statusLabel(tool: ToolCheck): string {
  if (tool.status === 'missing') return 'Not installed'
  if (tool.status === 'misconfigured') return 'Needs configuration'
  if (tool.auth_status === 'unauthenticated') return 'Not authenticated'
  if (tool.auth_status === 'authenticated') return 'Ready'
  return tool.version ? `v${tool.version}` : 'Installed'
}

function GitDetails({ tool }: { tool: ToolCheck }) {
  const sshExists = tool.details.ssh_key_exists === 'true'
  const githubConnected = tool.details.github_connected === 'true'

  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {tool.details.user_name && (
        <span>{tool.details.user_name} &lt;{tool.details.user_email}&gt;</span>
      )}
      <span className="flex items-center gap-1">
        {sshExists ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <X className="h-3 w-3 text-red-500" />
        )}
        SSH Key
      </span>
      <span className="flex items-center gap-1">
        {githubConnected ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <X className="h-3 w-3 text-red-500" />
        )}
        GitHub
      </span>
    </div>
  )
}

export function SetupStatus() {
  const [report, setReport] = useState<PrerequisitesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPrerequisites()
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Card className="rounded-[2rem] border border-black/10 bg-[linear-gradient(135deg,#f4f0e8_0%,#f4f0e8_76%,#1d4ed8_76%,#1d4ed8_100%)] text-black shadow-[0_16px_60px_rgba(0,0,0,0.18)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-black/50">Readiness Grid</p>
            <CardTitle className="flex items-center gap-2 text-black">
              <Wrench className="h-5 w-5" />
              Server Setup
            </CardTitle>
          </div>
          <Button variant="outline" size="sm" className="border-black/15 bg-white/60 text-black hover:bg-white" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {report && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={report.ready ? 'default' : 'secondary'} className={report.ready ? 'bg-black text-[#f4f0e8]' : 'bg-[#f0c419] text-black'}>
                {report.ready ? 'Ready' : 'Setup Incomplete'}
              </Badge>
              <Badge variant="outline" className="border-black/15 bg-white/50 text-black">
                {report.os}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {report.tools.map((tool) => (
                <div
                  key={tool.id}
                  className="relative aspect-square overflow-hidden rounded-[1.6rem] border border-black/12 bg-black p-4 text-[#f4f0e8] shadow-[0_10px_32px_rgba(0,0,0,0.2)]"
                >
                  <div className={`absolute right-0 top-0 h-16 w-16 rounded-bl-[1.6rem] ${statusDotColor(tool)} opacity-95`} />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold tracking-tight">{tool.name}</p>
                          {tool.required && (
                            <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/55">Required</p>
                          )}
                        </div>
                        <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${statusDotColor(tool)}`} />
                      </div>
                      {tool.version && tool.status !== 'missing' ? (
                        <p className="font-mono text-xs text-[#f4f0e8]/65">v{tool.version}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <p className={`text-sm font-medium ${statusColor(tool)}`}>
                        {statusLabel(tool)}
                      </p>
                      {tool.id === 'git' && tool.status !== 'missing' ? (
                        <GitDetails tool={tool} />
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs uppercase tracking-[0.22em] text-black/55">
              Install and authenticate tools from the PocketDev mobile app.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
