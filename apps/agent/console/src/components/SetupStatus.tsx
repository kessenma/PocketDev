import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { fetchPrerequisites, type ToolCheck, type PrerequisitesReport } from '#/lib/api'
import { Wrench, RefreshCw, Check, X, Rows3, LayoutGrid, Blocks } from 'lucide-react'

type LayoutMode = 'list' | 'grid' | 'bauhaus'

const PACKAGE_MANAGER_TOOL_IDS = ['node', 'npm', 'pnpm', 'bun'] as const
const AI_ASSISTANT_TOOL_IDS = ['claude_cli', 'codex_cli', 'copilot_cli'] as const
const LANGUAGE_TOOL_IDS = ['python'] as const

function getToolById(report: PrerequisitesReport | null, toolId: string): ToolCheck | undefined {
  return report?.tools.find((tool) => tool.id === toolId)
}

function normalizeTool(tool: ToolCheck): ToolCheck {
  if (tool.id === 'copilot_cli' && tool.status === 'installed' && tool.details.trust_configured !== 'true') {
    return {
      ...tool,
      status: 'misconfigured',
    }
  }

  return tool
}

function isToolConfigured(tool: ToolCheck | undefined): boolean {
  if (!tool) return false
  const normalized = normalizeTool(tool)
  if (normalized.status !== 'installed') return false
  if (normalized.auth_status === 'unauthenticated') return false
  return true
}

function getPackageManagersTool(report: PrerequisitesReport | null): ToolCheck {
  const tools = PACKAGE_MANAGER_TOOL_IDS
    .map((id) => getToolById(report, id))
    .filter((tool): tool is ToolCheck => !!tool)

  const installedCount = tools.filter((tool) => normalizeTool(tool).status === 'installed').length
  const allInstalled = PACKAGE_MANAGER_TOOL_IDS.every((id) => getToolById(report, id)?.status === 'installed')
  const anyInstalled = installedCount > 0

  return {
    id: 'npm',
    name: 'Package Managers',
    status: allInstalled ? 'installed' : (anyInstalled ? 'misconfigured' : 'missing'),
    auth_status: 'not_applicable',
    version: null,
    path: null,
    required: true,
    details: {
      summary: `${installedCount}/${PACKAGE_MANAGER_TOOL_IDS.length} ready`,
    },
  }
}

function getRequiredSetupTools(report: PrerequisitesReport | null): ToolCheck[] {
  const gitTool = getToolById(report, 'git')
  return [gitTool, getPackageManagersTool(report)].filter((tool): tool is ToolCheck => !!tool)
}

function getAiAssistantTools(report: PrerequisitesReport | null): ToolCheck[] {
  return AI_ASSISTANT_TOOL_IDS
    .map((id) => getToolById(report, id))
    .filter((tool): tool is ToolCheck => !!tool)
    .map(normalizeTool)
}

function getLanguageTools(report: PrerequisitesReport | null): ToolCheck[] {
  return LANGUAGE_TOOL_IDS
    .map((id) => getToolById(report, id))
    .filter((tool): tool is ToolCheck => !!tool)
    .map(normalizeTool)
}

function getSupportingTools(report: PrerequisitesReport | null): ToolCheck[] {
  if (!report) return []
  const primaryIds = new Set(['git', ...PACKAGE_MANAGER_TOOL_IDS, ...AI_ASSISTANT_TOOL_IDS, ...LANGUAGE_TOOL_IDS])
  return report.tools
    .filter((tool) => !primaryIds.has(tool.id))
    .map(normalizeTool)
}

function getSetupStatus(report: PrerequisitesReport | null) {
  const requiredReady = getRequiredSetupTools(report).every((tool) => isToolConfigured(tool))
  const aiReady = getAiAssistantTools(report).some((tool) => isToolConfigured(tool))
  const languageReady = getLanguageTools(report).every((tool) => isToolConfigured(tool))

  return {
    requiredReady,
    aiReady,
    languageReady,
    ready: requiredReady && aiReady && languageReady,
  }
}

function statusColor(tool: ToolCheck): string {
  const normalized = normalizeTool(tool)
  if (normalized.status === 'missing') return 'text-red-500'
  if (normalized.status === 'misconfigured' || normalized.auth_status === 'unauthenticated') return 'text-yellow-500'
  return 'text-green-500'
}

function statusDotColor(tool: ToolCheck): string {
  const normalized = normalizeTool(tool)
  if (normalized.status === 'missing') return 'bg-red-500'
  if (normalized.status === 'misconfigured' || normalized.auth_status === 'unauthenticated') return 'bg-yellow-500'
  return 'bg-green-500'
}

function statusLabel(tool: ToolCheck): string {
  const normalized = normalizeTool(tool)
  if (tool.name === 'Package Managers') {
    if (normalized.status === 'installed') return 'Ready'
    return tool.details.summary ? `Needs setup · ${tool.details.summary}` : 'Needs setup'
  }
  if (tool.id === 'copilot_cli' && normalized.status === 'misconfigured') return 'Needs trust setup'
  if (normalized.status === 'missing') return 'Not installed'
  if (normalized.status === 'misconfigured') return 'Needs configuration'
  if (normalized.auth_status === 'unauthenticated') return 'Not authenticated'
  if (normalized.auth_status === 'authenticated') return 'Ready'
  return normalized.version ? `v${normalized.version}` : 'Installed'
}

function toolIntentDetail(tool: ToolCheck): string | null {
  const serverWideIds = new Set(['node', 'npm', 'pnpm', 'bun', 'claude_cli', 'codex_cli', 'copilot_cli'])

  if (tool.name === 'Package Managers') {
    return 'Installs the shared Node.js, npm, pnpm, and Bun toolchain for workspace tasks.'
  }

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

  if (tool.id === 'copilot_cli') {
    return tool.details.trust_configured === 'true'
      ? 'Available through GitHub Copilot CLI for workspace assistance.'
      : 'Install and trust GitHub Copilot CLI to use it from this server.'
  }

  if (tool.id === 'python') {
    return tool.status === 'installed'
      ? 'Python runtime with pip and venv is available for workspace tasks.'
      : 'Adds Python with pip and venv for language tooling.'
  }

  if (tool.id === 'tmux') {
    return tool.status === 'installed'
      ? 'Available for GitHub Copilot trust and terminal session orchestration.'
      : 'Needed by PocketDev when configuring GitHub Copilot trust.'
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
  const normalized = normalizeTool(tool)
  return tool.id === 'git' || tool.id === 'github_cli' || !!tool.version || normalized.auth_status === 'unauthenticated' || normalized.status === 'misconfigured'
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
    <div className="flex flex-col gap-3 rounded-[0.95rem] border-2 border-[var(--border)] bg-[#1a1713] px-4 py-3 text-[#f5eedf] shadow-[0_8px_20px_rgba(0,0,0,0.18)] sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-semibold uppercase tracking-[0.12em]">{tool.name}</span>
          {tool.required ? (
            <span className="font-heading text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-[#f5eedf]/45">Required</span>
          ) : null}
          {tool.version && tool.status !== 'missing' ? (
            <span className="font-mono text-xs text-[#f5eedf]/55">v{tool.version}</span>
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
    <div className={cn('relative overflow-hidden rounded-[0.95rem] border-2 border-[var(--border)] bg-[#1a1713] p-4 text-[#f5eedf] shadow-[0_10px_28px_rgba(0,0,0,0.2)]', className)}>
      <div className={cn('absolute right-0 top-0 h-14 w-14 rounded-bl-[0.95rem] opacity-95', statusDotColor(tool))} />
      <div className="relative flex h-full min-h-[168px] flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-sm font-semibold uppercase tracking-[0.12em]">{tool.name}</p>
              {tool.required ? (
                <p className="mt-1 font-heading text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-[#f5eedf]/50">Required</p>
              ) : null}
            </div>
            <div className={cn('mt-1 h-3 w-3 shrink-0', statusDotColor(tool))} />
          </div>
          {tool.version && tool.status !== 'missing' ? (
            <p className="font-mono text-xs text-[#f5eedf]/62">v{tool.version}</p>
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

function Section({
  title,
  hint,
  tools,
  layoutMode,
}: {
  title: string
  hint: string
  tools: ToolCheck[]
  layoutMode: LayoutMode
}) {
  if (!tools.length) return null

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="font-heading text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-black/52">{title}</p>
        <p className="text-sm text-black/62">{hint}</p>
      </div>

      {layoutMode === 'list' ? (
        <div className="space-y-3">
          {tools.map((tool) => (
            <ToolListRow key={`${title}-${tool.id}-${tool.name}`} tool={tool} />
          ))}
        </div>
      ) : null}

      {layoutMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool) => (
            <ToolGridTile
              key={`${title}-${tool.id}-${tool.name}`}
              tool={tool}
              className={hasRichDetails(tool) ? 'min-h-[200px]' : 'min-h-[168px]'}
            />
          ))}
        </div>
      ) : null}

      {layoutMode === 'bauhaus' ? (
        <div className="grid auto-rows-[68px] gap-3 sm:grid-cols-2 xl:grid-cols-12">
          {tools.map((tool, index) => (
            <ToolGridTile
              key={`${title}-${tool.id}-${tool.name}`}
              tool={tool}
              className={cn('row-span-2', getBauhausTileClass(tool, index))}
            />
          ))}
        </div>
      ) : null}
    </section>
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

  const setupStatus = getSetupStatus(report)
  const requiredTools = getRequiredSetupTools(report)
  const aiTools = getAiAssistantTools(report)
  const languageTools = getLanguageTools(report)
  const supportingTools = getSupportingTools(report)

  return (
    <Card className="rounded-[1.1rem] border-2 border-[var(--border)] bg-[linear-gradient(135deg,#f4efdf_0%,#f4efdf_78%,#2d5fe5_78%,#2d5fe5_100%)] text-black shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-heading text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-black/50">Readiness Grid</p>
            <CardTitle className="flex items-center gap-2 text-black">
              <Wrench className="h-5 w-5" />
              Server Toolchain
            </CardTitle>
          </div>
          <Button variant="outline" size="sm" className="border-black/35 bg-white/70 text-black hover:bg-white" onClick={load} disabled={loading}>
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
                <Badge variant={setupStatus.ready ? 'default' : 'secondary'} className={setupStatus.ready ? 'bg-black text-[#f4f0e8]' : 'bg-[#f0c419] text-black'}>
                  {setupStatus.ready ? 'Ready' : 'Setup Incomplete'}
                </Badge>
                <Badge variant="outline" className="border-black/30 bg-white/55 text-black">
                  {report.os}
                </Badge>
              </div>
              <div className="rounded-[0.8rem] border-2 border-black/15 bg-white/45 p-1">
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
                      'rounded-[0.7rem] px-3 text-black',
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

            <Section
              title="Required Setup"
              hint="Complete Git and package managers."
              tools={requiredTools}
              layoutMode={layoutMode}
            />

            <Section
              title="AI Assistant"
              hint="Choose at least one: Claude, Codex, or GitHub Copilot."
              tools={aiTools}
              layoutMode={layoutMode}
            />

            <Section
              title="Language"
              hint="Set up Python for workspace language support."
              tools={languageTools}
              layoutMode={layoutMode}
            />

            <Section
              title="Supporting Tools"
              hint="Additional server-wide tools detected outside the main setup flow."
              tools={supportingTools}
              layoutMode={layoutMode}
            />

            <p className="font-heading text-xs uppercase tracking-[0.22em] text-black/55">
              This board reflects the server-wide setup flow PocketDev uses across mobile and console.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
