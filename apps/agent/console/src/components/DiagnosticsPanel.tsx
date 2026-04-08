import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { ServerTerminal } from '#/components/ServerTerminal'
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
} from '#/lib/api'
import { cn } from '#/lib/utils'
import { Bug, Maximize2, RefreshCw, Smartphone, Waves, KeyRound, Sparkles } from 'lucide-react'
import { ClaudeDiagnosticsTab } from '#/components/diagnostics/ClaudeDiagnosticsTab'
import { CodexDiagnosticsTab } from '#/components/diagnostics/CodexDiagnosticsTab'
import { SetupDiagnosticsTab } from '#/components/diagnostics/SetupDiagnosticsTab'
import { TasksDiagnosticsTab } from '#/components/diagnostics/TasksDiagnosticsTab'
import { LanguagesDiagnosticsTab } from '#/components/diagnostics/LanguagesDiagnosticsTab'

type DiagnosticsTab = 'terminal' | 'setup' | 'tasks' | 'registry' | 'codex' | 'claude' | 'github' | 'copilot' | 'languages'

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
  const [termLog, setTermLog] = useState<TerminalDebugEntry[]>([])
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
    ])

    const failures: string[] = []

    const [authResult, termResult, codexResult, claudeResult, copilotResult, githubResult, projectsResult, tasksResult, setupResult, pythonResult, rustResult] = results

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

  const codexSummary = useMemo(() => {
    if (!codexInfo) return 'No Codex auth diagnostics yet.'
    if (codexInfo.lastReplayDebug?.recordedAt) {
      return `Last replay ${formatShortTime(codexInfo.lastReplayDebug.recordedAt)}`
    }
    if (codexInfo.activeSessionCount > 0) {
      return `${codexInfo.activeSessionCount} active session${codexInfo.activeSessionCount === 1 ? '' : 's'}`
    }
    return 'No Codex auth activity yet.'
  }, [codexInfo])

  const claudeSummary = useMemo(() => {
    if (!claudeInfo) return 'No Claude auth diagnostics yet.'
    if (claudeInfo.activeSessionCount > 0) {
      return `${claudeInfo.activeSessionCount} active session${claudeInfo.activeSessionCount === 1 ? '' : 's'}`
    }
    return 'No Claude auth activity yet.'
  }, [claudeInfo])

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

  const tasksSummary = useMemo(() => {
    if (!tasksInfo) return 'No task data yet.'
    const running = tasksInfo.tasks.filter((t) => t.status === 'running').length
    if (running > 0) return `${running} running, ${tasksInfo.totalCount} total`
    return `${tasksInfo.totalCount} task${tasksInfo.totalCount === 1 ? '' : 's'} recorded`
  }, [tasksInfo])

  const setupSummary = useMemo(() => {
    if (!setupInfo) return 'No setup data yet.'
    const { claude, codex } = setupInfo.providers
    const parts: string[] = []
    if (claude.authenticated) parts.push('Claude ready')
    else if (claude.installed) parts.push('Claude (no auth)')
    if (codex.authenticated) parts.push('Codex ready')
    else if (codex.installed) parts.push('Codex (no auth)')
    return parts.length ? parts.join(' · ') : 'No providers configured'
  }, [setupInfo])

  const languagesSummary = useMemo(() => {
    if (!pythonInfo) return 'No language data yet.'
    if (pythonInfo.installed) {
      return `Python ${pythonInfo.version}${pythonInfo.pip_installed ? ' + pip' : ''}`
    }
    return 'Python not installed'
  }, [pythonInfo])

  const copilotSummary = useMemo(() => {
    if (!copilotInfo) return 'No Copilot trust diagnostics yet.'
    if (copilotInfo.activeSessionCount > 0) {
      return `${copilotInfo.activeSessionCount} active trust session${copilotInfo.activeSessionCount === 1 ? '' : 's'}`
    }
    if (copilotInfo.liveStatus.trustConfigured) {
      return 'Workspace trust recorded'
    }
    return 'No Copilot trust activity yet.'
  }, [copilotInfo])

  const panelShell = 'rounded-[0.95rem] border-2 border-[var(--border)] bg-[#1a1713]'
  const panelInset = 'rounded-[0.85rem] border-2 border-[var(--border)] bg-[#12100d]'
  const panelAccent = 'rounded-[0.85rem] border-2 border-[var(--border)] bg-[#f0c419] text-black'
  const sectionEyebrow = 'font-heading text-[0.68rem] font-semibold uppercase tracking-[0.26em]'
  const sectionTitle = 'font-heading text-sm font-semibold uppercase tracking-[0.12em]'

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[1.1rem] border-2 border-[var(--border)] bg-[linear-gradient(180deg,#1a1713_0%,#1d1a16_100%)] text-[#f5eedf] shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[var(--border)] px-5 py-4 sm:px-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-heading text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[#f5eedf]/45">Diagnostics Desk</p>
            <Badge variant="outline" className="border-yellow-500/45 text-yellow-300">dev</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-[#f0c419]" />
            <h2 className="font-heading text-lg font-semibold uppercase tracking-[0.08em]">Terminal & Device Debug</h2>
          </div>
          <p className="text-sm text-[#f5eedf]/58">
            One surface for the live shell, websocket trace, and registered device state.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-[0.85rem] border-2 border-[var(--border)] bg-[#12100d] p-1">
            {(['terminal', 'tasks', 'setup', 'languages', 'claude', 'codex', 'copilot', 'github', 'registry'] as const).map((tab) => {
              const label = tab === 'terminal' ? 'Terminal' : tab === 'tasks' ? 'Tasks' : tab === 'setup' ? 'Setup' : tab === 'languages' ? 'Languages' : tab === 'claude' ? 'Claude' : tab === 'codex' ? 'Codex' : tab === 'copilot' ? 'Copilot' : tab === 'github' ? 'GitHub' : 'Registry'
              return (
                <Button
                  key={tab}
                  size="sm"
                  variant={activeTab === tab ? 'secondary' : 'ghost'}
                  className={cn(
                    'rounded-[0.7rem] px-3 text-[#f5eedf]',
                    activeTab === tab ? 'bg-[#f0c419] text-black hover:bg-[#f0c419]/90' : 'hover:bg-[#2a241d]',
                  )}
                  onClick={() => setActiveTab(tab)}
                >
                  {label}
                </Button>
              )
            })}
          </div>
          <Button
            variant={live ? 'secondary' : 'outline'}
            size="sm"
            className={cn(
              live ? 'bg-[#f0c419] text-black hover:bg-[#f0c419]/90' : 'bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]',
            )}
            onClick={() => setLive((current) => !current)}
          >
            Live {live ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs text-[#f5eedf]/55 sm:px-6">
        <Badge variant="outline" className="border-[var(--border)] text-[#f5eedf]/70">
          {activeTab === 'terminal'
            ? logSummary
            : activeTab === 'tasks'
              ? tasksSummary
              : activeTab === 'setup'
                ? setupSummary
                : activeTab === 'languages'
                  ? languagesSummary
                  : activeTab === 'claude'
                  ? claudeSummary
                  : activeTab === 'codex'
                    ? codexSummary
                    : activeTab === 'copilot'
                      ? copilotSummary
                      : activeTab === 'github'
                        ? githubSummary
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
          <div className="grid h-full gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
            <div className={cn('flex min-h-0 flex-col overflow-hidden', panelShell)}>
              <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] px-4 py-3">
                <div>
                  <p className={sectionTitle}>Live Shell</p>
                  <p className="text-xs text-[#f5eedf]/50">Use the full-screen terminal for longer sessions.</p>
                </div>
                <Button variant="outline" size="sm" className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]" onClick={onOpenTerminal}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Full Screen
                </Button>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <ServerTerminal
                  defaultOpen
                  hideHeader
                  className="h-full rounded-[0.8rem] border-2 border-[var(--border)] bg-black text-[#f5eedf] shadow-none"
                  heightClassName="h-full"
                />
              </div>
            </div>

            <div className={cn('flex min-h-0 flex-col overflow-hidden', panelInset)}>
              <div className="border-b-2 border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-[#f0c419]" />
                  <p className={sectionTitle}>Terminal WS Log</p>
                </div>
                <p className="mt-1 text-xs text-[#f5eedf]/50">
                  Scrollable trace panel, fixed to this card so it never forces the layout outward.
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-xs">
                {termLog.length === 0 ? (
                  <p className="rounded-[0.8rem] border-2 border-[var(--border)] bg-black/30 p-3 text-[#f5eedf]/50">
                    No websocket activity yet. Open a mobile workflow or use the shell to generate traffic.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {termLog.map((entry, index) => (
                      <div key={`${entry.ts}-${index}`} className="rounded-[0.8rem] border-2 border-[var(--border)] bg-black/30 p-3 text-[#7fffd4]">
                        <div className="mb-1 font-heading text-[10px] uppercase tracking-[0.22em] text-[#f5eedf]/35">
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
        ) : activeTab === 'tasks' ? (
          <TasksDiagnosticsTab tasksInfo={tasksInfo} onRefresh={refresh} />
        ) : activeTab === 'setup' ? (
          <SetupDiagnosticsTab setupInfo={setupInfo} />
        ) : activeTab === 'languages' ? (
          <LanguagesDiagnosticsTab pythonInfo={pythonInfo} rustInfo={rustInfo} />
        ) : activeTab === 'claude' ? (
          <ClaudeDiagnosticsTab claudeInfo={claudeInfo} />
        ) : activeTab === 'codex' ? (
          <CodexDiagnosticsTab codexInfo={codexInfo} />
        ) : activeTab === 'copilot' ? (
          <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
            <div className="space-y-3">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#f0c419]" />
                  <p className="text-sm font-medium">Copilot Trust State</p>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[1.2rem] border border-white/8 bg-[#f0c419] p-4 text-black">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Active Sessions</p>
                    <p className="mt-2 text-3xl font-semibold">{copilotInfo?.activeSessionCount ?? 0}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Persisted CLI State</p>
                    <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                      <p>Path: {copilotInfo?.persistedState?.path ?? 'Not stored'}</p>
                      <p>Version: {copilotInfo?.persistedState?.version ?? 'Unknown'}</p>
                      <p>Authenticated: {copilotInfo?.persistedState ? (copilotInfo.persistedState.authenticated ? 'Yes' : 'No') : 'Unknown'}</p>
                      <p>Updated: {copilotInfo?.persistedState?.updatedAt ? new Date(copilotInfo.persistedState.updatedAt).toLocaleString() : 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Live Trust Check</p>
                    <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                      <p>Target: {copilotInfo?.liveStatusTarget ?? 'Unknown'}</p>
                      <p>Trust configured: {copilotInfo?.liveStatus.trustConfigured ? 'Yes' : 'No'}</p>
                      <p>Markers: {copilotInfo?.trustMarkers.length ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
                <p className="text-sm font-medium">Trust Marker Paths</p>
                <div className="mt-3 space-y-2">
                  {copilotInfo?.trustMarkers.length ? (
                    copilotInfo.trustMarkers.map((marker) => (
                      <div key={marker} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3 font-mono text-xs text-[#9df6cd]">
                        {marker}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                      No remembered Copilot trust markers yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
                <p className="text-sm font-medium">Recent Copilot Events</p>
                <div className="mt-3 space-y-2">
                  {copilotInfo?.events.length ? (
                    copilotInfo.events.map((event, index) => (
                      <div key={`${event.ts}-${index}`} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#f4f0e8]/38">
                          {formatShortTime(event.ts)} {event.sessionId ? `· ${event.sessionId.slice(0, 8)}` : ''}
                        </p>
                        <p className="mt-2 break-words font-mono text-xs text-[#9df6cd]">{event.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                      No Copilot trust events captured yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
              <p className="text-sm font-medium">Active Copilot Sessions</p>
              <div className="mt-3 space-y-3">
                {copilotInfo?.sessions.length ? (
                  copilotInfo.sessions.map((session) => (
                    <div key={session.sessionId} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{session.state}</p>
                          <p className="mt-1 break-all font-mono text-xs text-[#f4f0e8]/50">{session.sessionId}</p>
                        </div>
                        <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/75">
                          {session.trusted ? 'Trusted' : session.completed ? 'Completed' : 'Active'}
                        </Badge>
                      </div>
                        <div className="mt-3 space-y-2 text-xs text-[#f4f0e8]/72">
                          <p>Trust handled: {session.trustHandled ? 'Yes' : 'No'}</p>
                          <p>Fallback attempted: {session.fallbackTrustAttempted ? 'Yes' : 'No'}</p>
                          <p>UI ready: {session.uiReady ? 'Yes' : 'No'}</p>
                          <p>Trust target: {session.trustTarget ?? 'Unknown'}</p>
                          <p>Prompt: {session.prompt ?? 'None'}</p>
                          <p>Error: {session.error ?? 'None'}</p>
                          <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
                        </div>
                      {session.outputExcerpt ? (
                        <div className="mt-3">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Output Excerpt</p>
                          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-[#9df6cd]">
                            {session.outputExcerpt}
                          </pre>
                          {session.rawOutputExcerpt ? (
                            <>
                              <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Raw Output Excerpt</p>
                              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-[#f7c8ff]">
                                {session.rawOutputExcerpt}
                              </pre>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                    No active Copilot trust sessions. Open the Copilot wizard on the mobile app to start one.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'github' ? (
          <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
            <div className="space-y-3">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#f0c419]" />
                  <p className="text-sm font-medium">GitHub CLI Auth State</p>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[1.2rem] border border-white/8 bg-[#f0c419] p-4 text-black">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Active Sessions</p>
                    <p className="mt-2 text-3xl font-semibold">{githubInfo?.activeSessionCount ?? 0}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Persisted CLI State</p>
                    <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                      <p>Path: {githubInfo?.persistedState?.path ?? 'Not stored'}</p>
                      <p>Version: {githubInfo?.persistedState?.version ?? 'Unknown'}</p>
                      <p>Authenticated: {githubInfo?.persistedState ? (githubInfo.persistedState.authenticated ? 'Yes' : 'No') : 'Unknown'}</p>
                      <p>Updated: {githubInfo?.persistedState?.updatedAt ? new Date(githubInfo.persistedState.updatedAt).toLocaleString() : 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
                <p className="text-sm font-medium">Why This Helps</p>
                <div className="mt-3 rounded-[1.2rem] border border-white/8 bg-black/30 p-4 text-sm text-[#f4f0e8]/72">
                  This panel shows the raw `gh auth login --web` session state that the mobile wizard is polling. If the browser asks for a device code but no code appears here, the issue is in the agent parser or the terminal output stream.
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
                <p className="text-sm font-medium">Repo Discovery</p>
                <div className="mt-3 space-y-3">
                  <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3 text-sm text-[#f4f0e8]/78">
                    <p>Fetch source: {projectsInfo?.fetchSource ?? 'Unknown'}</p>
                    <p>SSH user: {projectsInfo?.sshGithubUsername ?? 'Unknown'}</p>
                    <p>GH user: {projectsInfo?.ghCliUsername ?? 'Unknown'}</p>
                    <p>GH authenticated: {projectsInfo?.ghCliAuthenticated ? 'Yes' : 'No'}</p>
                    <p>Private repo access: {projectsInfo?.privateRepoAccess ? 'Yes' : 'No'}</p>
                    <p>Fetch error: {projectsInfo?.fetchError ?? 'None'}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3 text-sm text-[#f4f0e8]/78">
                    <p>Fetched repos: {projectsInfo?.fetchedRepoCount ?? 0}</p>
                    <p>Fetched private: {projectsInfo?.fetchedPrivateCount ?? 0}</p>
                    <p>Fetched public: {projectsInfo?.fetchedPublicCount ?? 0}</p>
                    <p>Listed in picker: {projectsInfo?.listedProjectCount ?? 0}</p>
                    <p>Listed private: {projectsInfo?.listedPrivateCount ?? 0}</p>
                    <p>Listed public: {projectsInfo?.listedPublicCount ?? 0}</p>
                    <p>Listed unknown: {projectsInfo?.listedUnknownCount ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 gap-3 lg:grid-cols-2">
              <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
                <p className="text-sm font-medium">Active GitHub Sessions</p>
                <div className="mt-3 space-y-3">
                  {githubInfo?.sessions.length ? (
                    githubInfo.sessions.map((session) => (
                      <div key={session.sessionId} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{session.state}</p>
                            <p className="mt-1 break-all font-mono text-xs text-[#f4f0e8]/50">{session.sessionId}</p>
                          </div>
                          <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/75">
                            {session.authenticated ? 'Authenticated' : session.completed ? 'Completed' : 'Active'}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-2 text-xs text-[#f4f0e8]/72">
                          <p>Verification code: {session.verificationCode ?? 'Not parsed yet'}</p>
                          <p>Browser launch handled: {session.browserLaunchHandled ? 'Yes' : 'No'}</p>
                          <p>GitHub user: {session.githubUsername ?? 'Unknown'}</p>
                          <p>Private repo access: {session.privateRepoAccess ? 'Yes' : 'No'}</p>
                          <p>Error: {session.error ?? 'None'}</p>
                          <p>Started: {new Date(session.startedAt).toLocaleString()}</p>
                          <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
                          {session.authUrl ? (
                            <p className="break-all font-mono text-[11px] text-[#9df6cd]">{session.authUrl}</p>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                      No active GitHub auth sessions. Start private repo setup from the mobile app to capture one.
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
                <p className="text-sm font-medium">Recent GitHub Output</p>
                <div className="mt-3 space-y-3">
                  <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Parsed Device Code</p>
                    <p className="mt-2 font-mono text-sm text-[#9df6cd]">{githubInfo?.sessions[0]?.verificationCode ?? 'No code parsed yet.'}</p>
                    <p className="mt-2 text-xs text-[#f4f0e8]/60">
                      Browser launch handled: {githubInfo?.sessions[0]?.browserLaunchHandled ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Output Excerpt</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-[#9df6cd]">
                      {githubInfo?.sessions[0]?.outputExcerpt ?? 'No GitHub CLI output captured yet.'}
                    </pre>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Private Repo Samples</p>
                    <div className="mt-2 space-y-2">
                      {projectsInfo?.fetchedPrivateSample.length ? (
                        projectsInfo.fetchedPrivateSample.map((repo, index) => (
                          <div key={`${repo}-${index}`} className="font-mono text-xs text-[#9df6cd]">{repo}</div>
                        ))
                      ) : (
                        <div className="text-xs text-[#f4f0e8]/58">No private repos in the fetched result.</div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Recent Project Operations</p>
                    <div className="mt-2 space-y-2">
                      {projectsInfo?.recentOperations.length ? (
                        projectsInfo.recentOperations.map((entry, index) => (
                          <div key={`${entry.ts}-${index}`} className="rounded-xl border border-white/8 bg-black/20 p-3">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-[#f4f0e8]/35">
                              {formatShortTime(entry.ts)} · {entry.kind}
                            </div>
                            <div className="mt-1 break-words font-mono text-xs text-[#9df6cd]">{entry.message}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-[#f4f0e8]/58">No project operations recorded yet.</div>
                      )}
                    </div>
                  </div>
                </div>
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
