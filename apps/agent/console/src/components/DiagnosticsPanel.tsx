import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type { ConnectionState } from '#/components/ServerTerminal'
import {
  fetchAuthDebug,
  fetchCodexAuthDebug,
  fetchClaudeAuthDebug,
  fetchCopilotAuthDebug,
  fetchGitHubAuthDebug,
  fetchProjectsDebug,
  fetchTerminalDebug,
  fetchTasksDebug,
  fetchSetupDebug,
  fetchPythonDebug,
  fetchRustDebug,
  fetchGoDebug,
  fetchTypeScriptDebug,
  fetchNetworkDebug,
  fetchGitHistoryDebug,
  fetchOfflineSnapshots,
  fetchPushDebug,
  fetchMinimaxSetupDebug,
  type AuthDebugInfo,
  type CodexAuthDebugInfo,
  type ClaudeAuthDebugInfo,
  type CopilotAuthDebugInfo,
  type GitHubAuthDebugInfo,
  type ProjectsDebugInfo,
  type TerminalDebugEntry,
  type TasksDebugInfo,
  type SetupDebugInfo,
  type PythonDebugInfo,
  type RustDebugInfo,
  type GoDebugInfo,
  type TypeScriptDebugInfo,
  type NetworkDebugInfo,
  type GitHistoryDebugInfo,
  type OfflineSnapshot,
  type PushDebugInfo,
  type MinimaxSetupDebugInfo,
} from '#/lib/api'
import { Bug, RefreshCw } from 'lucide-react'
import { cn } from '#/lib/utils'
import { BrandIcon, type BrandKey } from '#/components/ui/brand-icon'
import { RegistryDiagnosticsTab } from '#/components/diagnostics/RegistryDiagnosticsTab'
import { SetupDiagnosticsTab } from '#/components/diagnostics/SetupDiagnosticsTab'
import { LanguagesDiagnosticsTab } from '#/components/diagnostics/LanguagesDiagnosticsTab'
import { NetworkDiagnosticsTab } from '#/components/diagnostics/NetworkDiagnosticsTab'
import { GitHubDiagnosticsTab } from '#/components/diagnostics/GitHubDiagnosticsTab'
import { PushDiagnosticsTab } from '#/components/diagnostics/PushDiagnosticsTab'
import { TerminalDiagnosticsTab } from '#/components/diagnostics/TerminalDiagnosticsTab'

type DiagnosticsTab = 'terminal' | 'setup' | 'registry' | 'github' | 'languages' | 'network' | 'push'

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
  const [codexInfo, setCodexInfo] = useState<CodexAuthDebugInfo | null>(null)
  const [claudeInfo, setClaudeInfo] = useState<ClaudeAuthDebugInfo | null>(null)
  const [copilotInfo, setCopilotInfo] = useState<CopilotAuthDebugInfo | null>(null)
  const [githubInfo, setGitHubInfo] = useState<GitHubAuthDebugInfo | null>(null)
  const [projectsInfo, setProjectsInfo] = useState<ProjectsDebugInfo | null>(null)
  const [tasksInfo, setTasksInfo] = useState<TasksDebugInfo | null>(null)
  const [setupInfo, setSetupInfo] = useState<SetupDebugInfo | null>(null)
  const [pythonInfo, setPythonInfo] = useState<PythonDebugInfo | null>(null)
  const [rustInfo, setRustInfo] = useState<RustDebugInfo | null>(null)
  const [goInfo, setGoInfo] = useState<GoDebugInfo | null>(null)
  const [tsInfo, setTsInfo] = useState<TypeScriptDebugInfo | null>(null)
  const [networkInfo, setNetworkInfo] = useState<NetworkDebugInfo | null>(null)
  const [gitHistoryInfo, setGitHistoryInfo] = useState<GitHistoryDebugInfo | null>(null)
  const [offlineSnapshots, setOfflineSnapshots] = useState<OfflineSnapshot[]>([])
  const [pushInfo, setPushInfo] = useState<PushDebugInfo | null>(null)
  const [minimaxInfo, setMinimaxInfo] = useState<MinimaxSetupDebugInfo | null>(null)
  const [termLog, setTermLog] = useState<TerminalDebugEntry[]>([])
  const [termConnState, setTermConnState] = useState<ConnectionState>('disconnected')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const results = await Promise.allSettled([
      fetchAuthDebug(),
      fetchTerminalDebug(),
      fetchCodexAuthDebug(),
      fetchClaudeAuthDebug(),
      fetchCopilotAuthDebug(),
      fetchGitHubAuthDebug(),
      fetchProjectsDebug(),
      fetchTasksDebug(),
      fetchSetupDebug(),
      fetchPythonDebug(),
      fetchRustDebug(),
      fetchGoDebug(),
      fetchTypeScriptDebug(),
      fetchNetworkDebug(),
      fetchGitHistoryDebug(),
      fetchOfflineSnapshots(),
      fetchPushDebug(),
      fetchMinimaxSetupDebug(),
    ])

    const failures: string[] = []

    const [authResult, termResult, codexResult, claudeResult, copilotResult, githubResult, projectsResult, tasksResult, setupResult, pythonResult, rustResult, goResult, tsResult, networkResult, gitHistoryResult, offlineSnapshotsResult, pushResult, minimaxResult] = results

    if (authResult.status === 'fulfilled') setInfo(authResult.value)
    else failures.push(`auth: ${authResult.reason instanceof Error ? authResult.reason.message : 'failed'}`)

    if (termResult.status === 'fulfilled') setTermLog(termResult.value)
    else failures.push(`terminal: ${termResult.reason instanceof Error ? termResult.reason.message : 'failed'}`)

    if (codexResult.status === 'fulfilled') setCodexInfo(codexResult.value)
    else failures.push(`codex: ${codexResult.reason instanceof Error ? codexResult.reason.message : 'failed'}`)

    if (claudeResult.status === 'fulfilled') setClaudeInfo(claudeResult.value)
    else failures.push(`claude: ${claudeResult.reason instanceof Error ? claudeResult.reason.message : 'failed'}`)

    if (copilotResult.status === 'fulfilled') setCopilotInfo(copilotResult.value)
    else failures.push(`copilot: ${copilotResult.reason instanceof Error ? copilotResult.reason.message : 'failed'}`)

    if (githubResult.status === 'fulfilled') setGitHubInfo(githubResult.value)
    else failures.push(`github: ${githubResult.reason instanceof Error ? githubResult.reason.message : 'failed'}`)

    if (projectsResult.status === 'fulfilled') setProjectsInfo(projectsResult.value)
    else failures.push(`projects: ${projectsResult.reason instanceof Error ? projectsResult.reason.message : 'failed'}`)

    if (tasksResult.status === 'fulfilled') setTasksInfo(tasksResult.value)
    else failures.push(`tasks: ${tasksResult.reason instanceof Error ? tasksResult.reason.message : 'failed'}`)

    if (setupResult.status === 'fulfilled') setSetupInfo(setupResult.value)
    else failures.push(`setup: ${setupResult.reason instanceof Error ? setupResult.reason.message : 'failed'}`)

    if (pythonResult.status === 'fulfilled') setPythonInfo(pythonResult.value)
    else failures.push(`python: ${pythonResult.reason instanceof Error ? pythonResult.reason.message : 'failed'}`)

    if (rustResult.status === 'fulfilled') setRustInfo(rustResult.value)
    else failures.push(`rust: ${rustResult.reason instanceof Error ? rustResult.reason.message : 'failed'}`)

    if (goResult.status === 'fulfilled') setGoInfo(goResult.value)
    else failures.push(`go: ${goResult.reason instanceof Error ? goResult.reason.message : 'failed'}`)

    if (tsResult.status === 'fulfilled') setTsInfo(tsResult.value)
    else failures.push(`typescript: ${tsResult.reason instanceof Error ? tsResult.reason.message : 'failed'}`)

    if (networkResult.status === 'fulfilled') setNetworkInfo(networkResult.value)
    else failures.push(`network: ${networkResult.reason instanceof Error ? networkResult.reason.message : 'failed'}`)

    if (gitHistoryResult.status === 'fulfilled') setGitHistoryInfo(gitHistoryResult.value)
    else failures.push(`git-history: ${gitHistoryResult.reason instanceof Error ? gitHistoryResult.reason.message : 'failed'}`)

    if (offlineSnapshotsResult.status === 'fulfilled') setOfflineSnapshots(offlineSnapshotsResult.value)

    if (pushResult.status === 'fulfilled') setPushInfo(pushResult.value)
    else failures.push(`push: ${pushResult.reason instanceof Error ? pushResult.reason.message : 'failed'}`)

    if (minimaxResult.status === 'fulfilled') setMinimaxInfo(minimaxResult.value)
    else failures.push(`minimax: ${minimaxResult.reason instanceof Error ? minimaxResult.reason.message : 'failed'}`)

    setLastUpdated(new Date().toISOString())
    setError(failures.length ? `Partial refresh failure: ${failures.join(' | ')}` : null)
    setLoading(false)
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


  const githubSummary = useMemo(() => {
    if (!githubInfo) return 'No GitHub auth diagnostics yet.'
    if (githubInfo.activeSessionCount > 0) {
      return `${githubInfo.activeSessionCount} active session${githubInfo.activeSessionCount === 1 ? '' : 's'}`
    }
    if (githubInfo.persistedState?.authenticated) {
      return 'GitHub CLI authenticated'
    }
    return 'No GitHub auth activity yet.'
  }, [githubInfo])

  const setupSummary = useMemo(() => {
    if (!setupInfo) return 'No setup data yet.'
    const { claude, codex, opencode } = setupInfo.providers
    const parts: string[] = []
    if (claude.authenticated) parts.push('Claude ready')
    else if (claude.installed) parts.push('Claude (no auth)')
    if (codex.authenticated) parts.push('Codex ready')
    else if (codex.installed) parts.push('Codex (no auth)')
    if (opencode.verified) parts.push('OpenCode ready')
    else if (opencode.installed) parts.push('OpenCode installed')
    return parts.length ? parts.join(' · ') : 'No providers configured'
  }, [setupInfo])

  const languagesSummary = useMemo(() => {
    if (!pythonInfo) return 'No language data yet.'
    if (pythonInfo.installed) {
      return `Python ${pythonInfo.version}${pythonInfo.pip_installed ? ' + pip' : ''}`
    }
    return 'Python not installed'
  }, [pythonInfo])

  const networkSummary = useMemo(() => {
    if (!networkInfo) return 'No network data yet.'
    const clients = networkInfo.websocket.connectedClients.length
    const events = networkInfo.websocket.recentEvents.length
    if (clients > 0) return `${clients} client${clients === 1 ? '' : 's'} connected, ${events} events`
    return `${events} event${events === 1 ? '' : 's'} captured`
  }, [networkInfo])

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[1.1rem] border-2 border-border bg-card text-foreground shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-border px-5 py-4 sm:px-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-heading text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-foreground/45">Diagnostics Desk</p>
            <Badge variant="outline" className="border-yellow-500/45 text-yellow-600 dark:text-yellow-300">dev</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-[var(--bauhaus-yellow)]" />
            <h2 className="font-heading text-lg font-semibold uppercase tracking-[0.08em]">Terminal & Device Debug</h2>
          </div>
          <p className="text-sm text-foreground/60">
            One surface for the live shell, websocket trace, and registered device state.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-[0.85rem] border-2 border-border bg-background p-1">
            {(['terminal', 'setup', 'network', 'languages', 'github', 'push', 'registry'] as const).map((tab) => {
              const label = tab === 'terminal' ? 'Terminal' : tab === 'setup' ? 'Setup' : tab === 'network' ? 'Network' : tab === 'languages' ? 'Languages' : tab === 'github' ? 'GitHub' : tab === 'push' ? 'Push' : 'Registry'
              const TAB_BRAND: Partial<Record<DiagnosticsTab, BrandKey>> = {
                github: 'github',
              }
              const brandKey = TAB_BRAND[tab]
              return (
                <Button
                  key={tab}
                  size="sm"
                  variant={activeTab === tab ? 'secondary' : 'ghost'}
                  className={cn(
                    'rounded-[0.7rem] px-3 text-foreground',
                    activeTab === tab ? 'bg-[var(--bauhaus-yellow)] text-black hover:bg-[var(--bauhaus-yellow)]/90' : 'hover:bg-secondary',
                  )}
                  onClick={() => setActiveTab(tab)}
                >
                  {brandKey ? (
                    <span className="mr-1.5 inline-flex shrink-0">
                      <BrandIcon brand={brandKey} size={13} scale={1} scheme={activeTab === tab ? 'light' : 'auto'} />
                    </span>
                  ) : null}
                  {label}
                </Button>
              )
            })}
          </div>
          <Button
            variant={live ? 'secondary' : 'outline'}
            size="sm"
            className={cn(
              live ? 'bg-[var(--bauhaus-yellow)] text-black hover:bg-[var(--bauhaus-yellow)]/90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
            onClick={() => setLive((current) => !current)}
          >
            Live {live ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs text-foreground/55 sm:px-6">
        <Badge variant="outline" className="border-border text-foreground/70">
          {activeTab === 'terminal'
            ? logSummary
            : activeTab === 'setup'
                ? setupSummary
                : activeTab === 'network'
                  ? networkSummary
                  : activeTab === 'languages'
                    ? languagesSummary
                    : activeTab === 'github'
                          ? githubSummary
                          : activeTab === 'push'
                              ? (pushInfo ? `${pushInfo.registeredDevices} device${pushInfo.registeredDevices === 1 ? '' : 's'} · ${pushInfo.log.length} log entries` : 'No push data yet.')
                              : `${info?.deviceCount ?? 0} registered device${info?.deviceCount === 1 ? '' : 's'}`}
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
          <TerminalDiagnosticsTab
            termLog={termLog}
            termConnState={termConnState}
            onConnectionStateChange={setTermConnState}
            onOpenTerminal={onOpenTerminal}
          />
        ) : activeTab === 'setup' ? (
          <SetupDiagnosticsTab
            setupInfo={setupInfo}
            claudeInfo={claudeInfo}
            codexInfo={codexInfo}
            copilotInfo={copilotInfo}
            minimaxInfo={minimaxInfo}
            tasksInfo={tasksInfo}
            onRefresh={refresh}
          />
        ) : activeTab === 'network' ? (
          <NetworkDiagnosticsTab networkInfo={networkInfo} />
        ) : activeTab === 'languages' ? (
          <LanguagesDiagnosticsTab pythonInfo={pythonInfo} rustInfo={rustInfo} goInfo={goInfo} tsInfo={tsInfo} />
        ) : activeTab === 'github' ? (
          <GitHubDiagnosticsTab githubInfo={githubInfo} projectsInfo={projectsInfo} gitHistoryInfo={gitHistoryInfo} offlineSnapshots={offlineSnapshots} />
        ) : activeTab === 'push' ? (
          <PushDiagnosticsTab data={pushInfo} />
        ) : (
          <RegistryDiagnosticsTab info={info} />
        )}
      </div>
    </section>
  )
}
