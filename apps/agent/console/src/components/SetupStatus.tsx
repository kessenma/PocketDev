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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Server Setup
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {report && (
          <div className="space-y-3">
            {/* Readiness badge */}
            <div className="flex items-center gap-2">
              <Badge variant={report.ready ? 'default' : 'secondary'}>
                {report.ready ? 'Ready' : 'Setup Incomplete'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {report.os}
              </span>
            </div>

            {/* Tool list */}
            <div className="divide-y divide-border rounded-lg border border-border">
              {report.tools.map((tool) => (
                <div key={tool.id} className="flex items-start gap-3 px-3 py-2.5">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotColor(tool)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tool.name}</span>
                      {tool.required && (
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">Required</span>
                      )}
                      {tool.version && tool.status !== 'missing' && (
                        <span className="font-mono text-xs text-muted-foreground">v{tool.version}</span>
                      )}
                    </div>
                    <p className={`text-xs ${statusColor(tool)}`}>
                      {statusLabel(tool)}
                    </p>
                    {tool.id === 'git' && tool.status !== 'missing' && (
                      <GitDetails tool={tool} />
                    )}
                  </div>
                  {tool.status !== 'installed' && tool.status !== 'misconfigured' ? null : null}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Use the PocketDev mobile app to install and configure tools.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
