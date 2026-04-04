import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { fetchPrerequisites, type ToolCheck, type PrerequisitesReport } from '#/lib/api'
import { Wrench, RefreshCw, Check, X, Rows3, LayoutGrid, Blocks } from 'lucide-react'

type LayoutMode = 'list' | 'grid' | 'bauhaus'

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

function toolIntentDetail(tool: ToolCheck): string | null {
  const serverWideIds = new Set(['node', 'npm', 'pnpm', 'bun', 'claude_cli', 'codex_cli'])

  if (tool.path && serverWideIds.has(tool.id)) {
    if (tool.path.startsWith('/usr/') || tool.path.startsWith('/opt/')) {
      return `Server-wide path: ${tool.path}`
    }
    return `Detected path: ${tool.path}`
  }

  if (tool.id === 'node' || tool.id === 'npm') {
    return tool.status === 'missing'
      ? 'Required for the server toolchain.'
      : 'Backs the server-wide JavaScript toolchain.'
  }

  if (tool.id === 'pnpm' || tool.id === 'bun') {
    return tool.status === 'missing'
      ? 'Optional server-wide package tool.'
      : 'Available across the server for package workflows.'
  }

  if (tool.id === 'claude_cli' || tool.id === 'codex_cli') {
    return tool.status === 'missing'
      ? 'Installs as a server-wide AI CLI.'
      : 'Available across the server for agent task launches.'
  }

  return null
}

function GitDetails({ tool }: { tool: ToolCheck }) {
  const sshExists = tool.details.ssh_key_exists === 'true'
  const githubConnected = tool.details.github_connected === 'true'
  const privateRepoAccess = tool.details.private_repo_access === 'true'

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
      <span className="flex items-center gap-1">
        {privateRepoAccess ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <X className="h-3 w-3 text-red-500" />
        )}
        Private Repos
      </span>
    </div>
  )
}

function GitHubCliDetails({ tool }: { tool: ToolCheck }) {
  const privateRepoAccess = tool.details.private_repo_access === 'true'

  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {tool.details.github_username ? (
        <span>@{tool.details.github_username}</span>
      ) : null}
      <span className="flex items-center gap-1">
        {privateRepoAccess ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <X className="h-3 w-3 text-red-500" />
        )}
        Private Repo Access
      </span>
    </div>
  )
}

function hasRichDetails(tool: ToolCheck) {
  return tool.id === 'git' || tool.id === 'github_cli' || !!tool.version || tool.auth_status === 'unauthenticated' || tool.status === 'misconfigured'
}

function getBauhausTileClass(tool: ToolCheck, index: number) {
  if (tool.id === 'git') return 'sm:col-span-2 sm:row-span-2 xl:col-span-4 xl:row-span-2'
  if (tool.id === 'github_cli') return 'sm:col-span-2 xl:col-span-3'
  if (tool.status === 'missing' && tool.required) return 'sm:col-span-1 sm:row-span-2 xl:col-span-2 xl:row-span-2'
  if (tool.status === 'misconfigured' || tool.auth_status === 'unauthenticated') return 'sm:col-span-2 xl:col-span-3'
  if (tool.version && tool.status === 'installed') return index % 3 === 0 ? 'sm:col-span-2 xl:col-span-3' : 'xl:col-span-2'
  return 'xl:col-span-2'
}

function ToolListRow({ tool }: { tool: ToolCheck }) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.35rem] border border-black/12 bg-black px-4 py-3 text-[#f4f0e8] shadow-[0_8px_20px_rgba(0,0,0,0.18)] sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">{tool.name}</span>
          {tool.required ? (
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Required</span>
          ) : null}
          {tool.version && tool.status !== 'missing' ? (
            <span className="font-mono text-xs text-[#f4f0e8]/55">v{tool.version}</span>
          ) : null}
        </div>
        <p className={cn('mt-1 text-sm font-medium', statusColor(tool))}>{statusLabel(tool)}</p>
        {toolIntentDetail(tool) ? (
          <p className="mt-1 text-xs text-[#f4f0e8]/52">{toolIntentDetail(tool)}</p>
        ) : null}
        {tool.id === 'git' && tool.status !== 'missing' ? (
          <GitDetails tool={tool} />
        ) : null}
        {tool.id === 'github_cli' && tool.status !== 'missing' ? (
          <GitHubCliDetails tool={tool} />
        ) : null}
      </div>
      <div className="flex items-center gap-2 self-start sm:pl-3">
        <div className={cn('h-3 w-3 rounded-full', statusDotColor(tool))} />
      </div>
    </div>
  )
}

function ToolGridTile({ tool, className }: { tool: ToolCheck, className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-[1.45rem] border border-black/12 bg-black p-4 text-[#f4f0e8] shadow-[0_10px_28px_rgba(0,0,0,0.2)]', className)}>
      <div className={cn('absolute right-0 top-0 h-14 w-14 rounded-bl-[1.45rem] opacity-95', statusDotColor(tool))} />
      <div className="relative flex h-full min-h-[168px] flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-tight">{tool.name}</p>
              {tool.required ? (
                <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/50">Required</p>
              ) : null}
            </div>
            <div className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', statusDotColor(tool))} />
          </div>
          {tool.version && tool.status !== 'missing' ? (
            <p className="font-mono text-xs text-[#f4f0e8]/62">v{tool.version}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <p className={cn('text-sm font-medium', statusColor(tool))}>{statusLabel(tool)}</p>
          {toolIntentDetail(tool) ? (
            <p className="text-xs text-[#f4f0e8]/52">{toolIntentDetail(tool)}</p>
          ) : null}
          {tool.id === 'git' && tool.status !== 'missing' ? (
            <GitDetails tool={tool} />
          ) : null}
          {tool.id === 'github_cli' && tool.status !== 'missing' ? (
            <GitHubCliDetails tool={tool} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function SetupStatus() {
  const [report, setReport] = useState<PrerequisitesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('bauhaus')

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
              Server Toolchain
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={report.ready ? 'default' : 'secondary'} className={report.ready ? 'bg-black text-[#f4f0e8]' : 'bg-[#f0c419] text-black'}>
                  {report.ready ? 'Ready' : 'Toolchain Incomplete'}
                </Badge>
                <Badge variant="outline" className="border-black/15 bg-white/50 text-black">
                  {report.os}
                </Badge>
              </div>
              <div className="rounded-full border border-black/10 bg-white/45 p-1">
                {([
                  ['list', Rows3, 'List'],
                  ['grid', LayoutGrid, 'Grid'],
                  ['bauhaus', Blocks, 'Bauhaus'],
                ] as const).map(([mode, Icon, label]) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={layoutMode === mode ? 'secondary' : 'ghost'}
                    className={cn(
                      'rounded-full px-3 text-black',
                      layoutMode === mode ? 'bg-black text-[#f4f0e8] hover:bg-black/92' : 'hover:bg-black/6',
                    )}
                    onClick={() => setLayoutMode(mode)}
                  >
                    <Icon className="mr-2 h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {layoutMode === 'list' ? (
              <div className="space-y-3">
                {report.tools.map((tool) => (
                  <ToolListRow key={tool.id} tool={tool} />
                ))}
              </div>
            ) : null}

            {layoutMode === 'grid' ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {report.tools.map((tool) => (
                  <ToolGridTile
                    key={tool.id}
                    tool={tool}
                    className={hasRichDetails(tool) ? 'min-h-[200px]' : 'min-h-[168px]'}
                  />
                ))}
              </div>
            ) : null}

            {layoutMode === 'bauhaus' ? (
              <div className="grid auto-rows-[68px] gap-3 sm:grid-cols-2 xl:grid-cols-12">
                {report.tools.map((tool, index) => (
                  <ToolGridTile
                    key={tool.id}
                    tool={tool}
                    className={cn('row-span-2', getBauhausTileClass(tool, index))}
                  />
                ))}
              </div>
            ) : null}

            <p className="text-xs uppercase tracking-[0.22em] text-black/55">
              This board reflects the server-wide developer toolchain that PocketDev checks and installs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
