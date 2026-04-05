import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { killTaskFromConsole, type TasksDebugInfo } from '#/lib/api'
import { cn } from '#/lib/utils'
import { Zap, Square } from 'lucide-react'

interface Props {
  tasksInfo: TasksDebugInfo | null
  onRefresh?: () => void
}

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

export function TasksDiagnosticsTab({ tasksInfo, onRefresh }: Props) {
  const runningCount = tasksInfo?.tasks.filter((t) => t.status === 'running').length ?? 0
  const completedCount = tasksInfo?.tasks.filter((t) => t.status === 'completed').length ?? 0
  const failedCount = tasksInfo?.tasks.filter((t) => t.status === 'failed').length ?? 0

  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
      <div className="space-y-3">
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
          <div className="mt-3 space-y-2">
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

      <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
        <p className="text-sm font-medium">Recent Tasks</p>
        <div className="mt-3 space-y-3">
          {tasksInfo?.tasks.length ? (
            tasksInfo.tasks.map((task) => (
              <div key={task.id} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-[#f4f0e8]/90">
                      {task.prompt.length > 120 ? `${task.prompt.slice(0, 120)}...` : task.prompt}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-[#f4f0e8]/40">{task.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === 'running' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 border-red-500/50 px-2 text-xs text-red-400 hover:bg-red-500/20"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await killTaskFromConsole(task.id)
                          onRefresh?.()
                        }}
                      >
                        <Square className="mr-1 h-3 w-3" />
                        Kill
                      </Button>
                    )}
                    <Badge variant="outline" className={cn(statusColor(task.status))}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-x-4 gap-y-1 text-xs text-[#f4f0e8]/65 sm:grid-cols-2">
                  <p>Agent: <span className="font-medium text-[#f4f0e8]/85">{task.agentType}</span></p>
                  <p>Mode: <span className="font-medium capitalize text-[#f4f0e8]/85">{task.mode}</span></p>
                  <p>Model: <span className="font-medium text-[#f4f0e8]/85">{task.model ?? 'default'}</span></p>
                  <p>Project: {task.projectName ?? 'None'}</p>
                  <p>Exit code: {task.exitCode ?? '—'}</p>
                  <p>Created: {formatShortTime(task.createdAt)}</p>
                  {task.startedAt && <p>Started: {formatShortTime(task.startedAt)}</p>}
                  {task.completedAt && <p>Completed: {formatShortTime(task.completedAt)}</p>}
                </div>
                {tasksInfo?.taskCommands[task.id] && (
                  <div className="mt-2">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Command</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-[#c4b5fd]">
                      {tasksInfo.taskCommands[task.id]}
                    </p>
                  </div>
                )}
                {task.workingDirectory && (
                  <p className="mt-2 truncate font-mono text-[11px] text-[#f4f0e8]/40">
                    cwd: {task.workingDirectory}
                  </p>
                )}
                {tasksInfo?.taskLogs[task.id]?.length ? (
                  <div className="mt-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Output</p>
                    <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-white/8 bg-black/40 p-3 font-mono text-xs">
                      {tasksInfo.taskLogs[task.id].map((log, i) => (
                        <span key={i} className={log.stream === 'stderr' ? 'text-red-400' : 'text-[#9df6cd]'}>
                          {log.line}{'\n'}
                        </span>
                      ))}
                    </pre>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No tasks yet. Start a task from the mobile app to see it here.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
