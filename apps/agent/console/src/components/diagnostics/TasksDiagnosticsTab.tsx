import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { killTaskFromConsole, type TasksDebugInfo } from '#/lib/api'
import { cn } from '#/lib/utils'
import { Square, Zap } from 'lucide-react'

interface Props {
  tasksInfo: TasksDebugInfo | null
  onRefresh?: () => void
}

type ProviderFilter = 'claude' | 'codex' | 'minimax' | 'copilot'
type TaskModeFilter = 'default' | 'plan'
type TaskStatusFilter = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

type ProviderMeta = {
  id: ProviderFilter
  label: string
  iconSrc: string
}

const PROVIDERS: ProviderMeta[] = [
  { id: 'claude', label: 'Claude', iconSrc: new URL('../../../../../../packages/shared/assets/brands/claude-black.png', import.meta.url).href },
  { id: 'codex', label: 'Codex', iconSrc: new URL('../../../../../../packages/shared/assets/brands/codex-black.png', import.meta.url).href },
  { id: 'minimax', label: 'MiniMax', iconSrc: new URL('../../../../../../packages/shared/assets/brands/minimax-black.png', import.meta.url).href },
  { id: 'copilot', label: 'GitHub Copilot', iconSrc: new URL('../../../../../../packages/shared/assets/brands/github-copilot-black.png', import.meta.url).href },
]

const STATUS_FILTERS: Array<{ id: TaskStatusFilter, label: string }> = [
  { id: 'running', label: 'Running' },
  { id: 'failed', label: 'Failed' },
  { id: 'completed', label: 'Complete' },
  { id: 'pending', label: 'Pending' },
  { id: 'killed', label: 'Killed' },
]

const MODE_FILTERS: Array<{ id: TaskModeFilter, label: string }> = [
  { id: 'default', label: 'Execute' },
  { id: 'plan', label: 'Plan' },
]

function statusColor(status: string): string {
  switch (status) {
    case 'running': return 'border-green-500/50 text-green-400'
    case 'completed': return 'border-blue-500/50 text-blue-400'
    case 'failed': return 'border-red-500/50 text-red-400'
    case 'killed': return 'border-orange-500/50 text-orange-400'
    case 'pending': return 'border-yellow-500/50 text-yellow-400'
    default: return 'border-white/10 text-[#f4f0e8]/75'
  }
}

function formatShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatFullTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function toggleInSet<T>(current: Set<T>, value: T) {
  const next = new Set(current)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function inferProvider(task: { agentType: string, model: string | null }): ProviderFilter | null {
  const agent = task.agentType.toLowerCase()
  const model = task.model?.toLowerCase() ?? ''

  if (agent === 'copilot' || model.includes('copilot') || model.includes('github')) return 'copilot'
  if (agent === 'claude' || model.includes('claude') || model.includes('opus') || model.includes('sonnet') || model.includes('haiku')) return 'claude'
  if (agent === 'codex' || model.includes('codex') || model.includes('gpt-') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) return 'codex'
  if (model.includes('minimax') || model.includes('mini-max') || model.includes('abab')) return 'minimax'

  return null
}

function providerMetaForTask(task: { agentType: string, model: string | null }) {
  const providerId = inferProvider(task)
  return providerId ? PROVIDERS.find((provider) => provider.id === providerId) ?? null : null
}

function BrandAssetIcon({
  src,
  alt,
  size = 15,
  scale = 1.16,
}: {
  src: string
  alt: string
  size?: number
  scale?: number
}) {
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'contain',
    transform: `scale(${scale})`,
    transformOrigin: 'center',
  } satisfies CSSProperties

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={style}
      className="dark:invert"
    />
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-[#f0c419]/70 bg-[#f0c419] text-black'
          : 'border-white/10 bg-white/5 text-[#f4f0e8]/70 hover:bg-white/10',
      )}
    >
      {children}
    </button>
  )
}

export function TasksDiagnosticsTab({ tasksInfo, onRefresh }: Props) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [providerFilters, setProviderFilters] = useState<Set<ProviderFilter>>(new Set())
  const [modelFilters, setModelFilters] = useState<Set<string>>(new Set())
  const [modeFilters, setModeFilters] = useState<Set<TaskModeFilter>>(new Set())
  const [statusFilters, setStatusFilters] = useState<Set<TaskStatusFilter>>(new Set())
  const [search, setSearch] = useState('')

  const tasks = tasksInfo?.tasks ?? []
  const runningCount = tasks.filter((t) => t.status === 'running').length
  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const failedCount = tasks.filter((t) => t.status === 'failed').length

  const availableModels = useMemo(() => {
    const seen = new Set<string>()
    return tasks
      .filter((task) => {
        const provider = inferProvider(task)
        return providerFilters.size === 0 || (provider !== null && providerFilters.has(provider))
      })
      .map((task) => task.model ?? 'default')
      .filter((model) => {
        if (seen.has(model)) return false
        seen.add(model)
        return true
      })
  }, [providerFilters, tasks])

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()

    return tasks.filter((task) => {
      const provider = inferProvider(task)
      const model = task.model ?? 'default'

      if (providerFilters.size > 0 && (!provider || !providerFilters.has(provider))) return false
      if (modelFilters.size > 0 && !modelFilters.has(model)) return false
      if (modeFilters.size > 0 && !modeFilters.has(task.mode as TaskModeFilter)) return false
      if (statusFilters.size > 0 && !statusFilters.has(task.status as TaskStatusFilter)) return false
      if (!query) return true

      return [
        task.prompt,
        task.id,
        task.agentType,
        task.model ?? 'default',
        task.projectName ?? '',
        task.workingDirectory ?? '',
        task.sessionId ?? '',
      ].some((value) => value.toLowerCase().includes(query))
    })
  }, [modeFilters, modelFilters, providerFilters, search, statusFilters, tasks])

  useEffect(() => {
    if (modelFilters.size === 0) return

    const next = new Set([...modelFilters].filter((model) => availableModels.includes(model)))
    if (next.size !== modelFilters.size) setModelFilters(next)
  }, [availableModels, modelFilters])

  useEffect(() => {
    if (!filteredTasks.length) {
      setSelectedTaskId(null)
      return
    }

    if (!selectedTaskId || !filteredTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(filteredTasks[0].id)
    }
  }, [filteredTasks, selectedTaskId])

  const selectedTask = filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">Task Overview</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.2rem] border border-white/8 bg-[#f0c419] p-4 text-black">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Total Tasks</p>
              <p className="mt-2 text-3xl font-semibold">{tasksInfo?.totalCount ?? 0}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-3 text-center">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[#f4f0e8]/45">Running</p>
                <p className="mt-1 text-xl font-semibold text-green-400">{runningCount}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-3 text-center">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[#f4f0e8]/45">Done</p>
                <p className="mt-1 text-xl font-semibold text-blue-400">{completedCount}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-3 text-center">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[#f4f0e8]/45">Failed</p>
                <p className="mt-1 text-xl font-semibold text-red-400">{failedCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
          <p className="text-sm font-medium">Active Processes</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {tasksInfo?.activeProcesses.length ? (
              tasksInfo.activeProcesses.map((proc) => (
                <div key={proc.taskId} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3">
                  <p className="truncate font-mono text-xs text-[#9df6cd]">{proc.taskId}</p>
                  <div className="mt-1 text-xs text-[#f4f0e8]/60">
                    Process: {proc.hasProcess ? 'Active' : 'Missing'} · Status: {proc.status ?? 'Unknown'}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                No running tasks.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-medium">Filters</p>
            <p className="mt-1 text-xs text-[#f4f0e8]/45">{filteredTasks.length} of {tasks.length} tasks shown</p>
          </div>
          <div className="flex flex-col gap-3 xl:min-w-[280px] xl:max-w-[360px] xl:flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompt, task id, project, cwd..."
              className="border-white/10 bg-black/30 text-sm"
            />
            <div className="flex justify-start xl:justify-end">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 bg-white/5 text-xs text-[#f4f0e8]/75 hover:bg-white/10"
                onClick={() => {
                  setProviderFilters(new Set())
                  setModelFilters(new Set())
                  setModeFilters(new Set())
                  setStatusFilters(new Set())
                  setSearch('')
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1.25fr_0.8fr_1fr]">
          <FilterGroup label="Providers">
            {PROVIDERS.map((provider) => (
              <FilterChip
                key={provider.id}
                active={providerFilters.has(provider.id)}
                onClick={() => setProviderFilters((current) => toggleInSet(current, provider.id))}
              >
                <BrandAssetIcon src={provider.iconSrc} alt={provider.label} />
                <span>{provider.label}</span>
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup label="Models">
            {availableModels.length ? availableModels.map((model) => (
              <FilterChip
                key={model}
                active={modelFilters.has(model)}
                onClick={() => setModelFilters((current) => toggleInSet(current, model))}
              >
                <span>{model}</span>
              </FilterChip>
            )) : (
              <div className="rounded-full border border-dashed border-white/10 px-3 py-1.5 text-xs text-[#f4f0e8]/45">
                No models match the current provider filters
              </div>
            )}
          </FilterGroup>

          <FilterGroup label="Task Type">
            {MODE_FILTERS.map((mode) => (
              <FilterChip
                key={mode.id}
                active={modeFilters.has(mode.id)}
                onClick={() => setModeFilters((current) => toggleInSet(current, mode.id))}
              >
                <span>{mode.label}</span>
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup label="Status">
            {STATUS_FILTERS.map((status) => (
              <FilterChip
                key={status.id}
                active={statusFilters.has(status.id)}
                onClick={() => setStatusFilters((current) => toggleInSet(current, status.id))}
              >
                <span>{status.label}</span>
              </FilterChip>
            ))}
          </FilterGroup>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
        <div className="min-h-0 overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-sm font-medium">Recent Tasks</p>
            <p className="text-xs text-[#f4f0e8]/45">{filteredTasks.length} visible</p>
          </div>

          <div className="mt-3 h-full space-y-2 overflow-y-auto pr-1">
            {filteredTasks.length ? (
              filteredTasks.map((task) => {
                const provider = providerMetaForTask(task)
                const isSelected = selectedTask?.id === task.id

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className={cn(
                      'block w-full rounded-[1.2rem] border p-3 text-left transition-colors',
                      isSelected
                        ? 'border-[#f0c419]/40 bg-[#f0c419]/10'
                        : 'border-white/8 bg-black/30 hover:bg-white/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-[#f4f0e8]/55">
                          {provider ? (
                            <>
                              <BrandAssetIcon src={provider.iconSrc} alt={provider.label} size={14} />
                              <span>{provider.label}</span>
                            </>
                          ) : (
                            <span className="rounded-full border border-white/10 px-2 py-0.5">Unknown provider</span>
                          )}
                          <span>•</span>
                          <span>{task.model ?? 'default'}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-medium text-[#f4f0e8]/90">
                          {task.prompt}
                        </p>
                        <p className="mt-2 truncate font-mono text-[11px] text-[#f4f0e8]/38">{task.id}</p>
                      </div>
                      <Badge variant="outline" className={cn(statusColor(task.status), 'shrink-0')}>
                        {task.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#f4f0e8]/50">
                      <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/70">
                        {task.mode === 'plan' ? 'Plan' : 'Execute'}
                      </Badge>
                      <span>{formatShortTime(task.createdAt)}</span>
                      <span>•</span>
                      <span>{task.projectName ?? 'No project'}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                No tasks match the current filters.
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
          <p className="text-sm font-medium">Task Details</p>
          <div className="mt-3 h-full overflow-y-auto pr-1">
            {selectedTask ? (
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#f4f0e8]/55">
                      {providerMetaForTask(selectedTask) ? (
                        <>
                          <BrandAssetIcon
                            src={providerMetaForTask(selectedTask)!.iconSrc}
                            alt={providerMetaForTask(selectedTask)!.label}
                            size={16}
                          />
                          <span>{providerMetaForTask(selectedTask)!.label}</span>
                        </>
                      ) : (
                        <span>Unknown provider</span>
                      )}
                      <span>•</span>
                      <span>{selectedTask.model ?? 'default'}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#f4f0e8]/92">{selectedTask.prompt}</p>
                    <p className="mt-2 font-mono text-[11px] text-[#f4f0e8]/40">{selectedTask.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedTask.status === 'running' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-red-500/50 px-2 text-xs text-red-400 hover:bg-red-500/20"
                        onClick={async () => {
                          await killTaskFromConsole(selectedTask.id)
                          onRefresh?.()
                        }}
                      >
                        <Square className="mr-1 h-3 w-3" />
                        Kill
                      </Button>
                    )}
                    <Badge variant="outline" className={cn(statusColor(selectedTask.status))}>
                      {selectedTask.status}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <DetailStat label="Agent" value={selectedTask.agentType} />
                  <DetailStat label="Task Type" value={selectedTask.mode === 'plan' ? 'Plan' : 'Execute'} />
                  <DetailStat label="Model" value={selectedTask.model ?? 'default'} />
                  <DetailStat label="Project" value={selectedTask.projectName ?? 'None'} />
                  <DetailStat label="Exit Code" value={selectedTask.exitCode?.toString() ?? '—'} />
                  <DetailStat label="Turns" value={(selectedTask.turnCount ?? 1).toString()} />
                  <DetailStat label="Created" value={formatFullTime(selectedTask.createdAt)} />
                  <DetailStat label="Started" value={selectedTask.startedAt ? formatFullTime(selectedTask.startedAt) : '—'} />
                  <DetailStat label="Completed" value={selectedTask.completedAt ? formatFullTime(selectedTask.completedAt) : '—'} />
                </div>

                {selectedTask.sessionId && (
                  <div className="mt-4 rounded-xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Session</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-[#c4b5fd]">{selectedTask.sessionId}</p>
                  </div>
                )}

                {!selectedTask.sessionId && selectedTask.agentType === 'claude' && (
                  <p className="mt-4 text-[11px] text-orange-400/70">
                    No session_id. Chat continuation is unavailable for this task.
                  </p>
                )}

                {tasksInfo?.taskCommands[selectedTask.id] && (
                  <div className="mt-4 rounded-xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Command</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-[#c4b5fd]">
                      {tasksInfo.taskCommands[selectedTask.id]}
                    </p>
                  </div>
                )}

                {selectedTask.workingDirectory && (
                  <div className="mt-4 rounded-xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Working Directory</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-[#f4f0e8]/45">{selectedTask.workingDirectory}</p>
                  </div>
                )}

                {tasksInfo?.taskFiles[selectedTask.id]?.length ? (
                  <div className="mt-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">
                      Files Touched ({tasksInfo.taskFiles[selectedTask.id].length})
                    </p>
                    <div className="mt-2 max-h-60 space-y-1 overflow-y-auto rounded-xl border border-white/8 bg-black/30 p-3">
                      {tasksInfo.taskFiles[selectedTask.id].map((touch, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={cn(
                            'inline-block w-12 shrink-0 rounded-full border px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase',
                            touch.action === 'edit' && 'border-yellow-500/40 text-yellow-400',
                            touch.action === 'create' && 'border-green-500/40 text-green-400',
                            touch.action === 'read' && 'border-blue-500/40 text-blue-400',
                            touch.action === 'search' && 'border-purple-500/40 text-purple-400',
                          )}>
                            {touch.action}
                          </span>
                          <span className="min-w-0 truncate font-mono text-[11px] text-[#f4f0e8]/70">{touch.filePath}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {tasksInfo?.taskLogs[selectedTask.id]?.length ? (
                  <div className="mt-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Output</p>
                    <pre className="mt-2 max-h-[28rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-white/8 bg-black/40 p-3 font-mono text-xs">
                      {tasksInfo.taskLogs[selectedTask.id].map((log, i) => (
                        <span key={i} className={log.stream === 'stderr' ? 'text-red-400' : 'text-[#9df6cd]'}>
                          {log.line}
                          {'\n'}
                        </span>
                      ))}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                No task selected. Start a task from the mobile app or adjust the current filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailStat({ label, value }: { label: string, value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">{label}</p>
      <p className="mt-1 text-sm text-[#f4f0e8]/82">{value}</p>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string, children: ReactNode }) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">{label}</p>
      <div className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  )
}
