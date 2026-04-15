import { useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { answerTaskQuestion, type ClaudeAuthDebugInfo, type TasksDebugInfo } from '#/lib/api'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { BrandIcon } from '#/components/ui/brand-icon'

interface Props {
  claudeInfo: ClaudeAuthDebugInfo | null
  tasksInfo: TasksDebugInfo | null
}

function formatShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ClaudeDiagnosticsTab({ claudeInfo, tasksInfo }: Props) {
  const [answering, setAnswering] = useState<Record<string, boolean>>({})

  const claudeTasks = (tasksInfo?.activeProcesses ?? []).filter((p) => p.pendingQuestions.length > 0)

  async function handleAnswer(taskId: string, questionId: string, answer: string) {
    const key = `${taskId}:${questionId}`
    setAnswering((s) => ({ ...s, [key]: true }))
    try {
      await answerTaskQuestion(taskId, questionId, answer)
    } catch {
      // silent — will be visible in task output
    } finally {
      setAnswering((s) => ({ ...s, [key]: false }))
    }
  }

  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <BrandIcon brand="claude" size={18} />
            <p className="text-sm font-medium">Claude Auth State</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.2rem] border border-white/8 bg-[#f0c419] p-4 text-black">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Active Sessions</p>
              <p className="mt-2 text-3xl font-semibold">{claudeInfo?.activeSessionCount ?? 0}</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Persisted CLI State</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>Path: {claudeInfo?.persistedState?.path ?? 'Not stored'}</p>
                <p>Version: {claudeInfo?.persistedState?.version ?? 'Unknown'}</p>
                <p>Authenticated: {claudeInfo?.persistedState ? (claudeInfo.persistedState.authenticated ? 'Yes' : 'No') : 'Unknown'}</p>
                <p>Updated: {claudeInfo?.persistedState?.updatedAt ? new Date(claudeInfo.persistedState.updatedAt).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Permissions */}
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#f59e0b]" />
            <p className="text-sm font-medium">Pending Permissions</p>
          </div>
          <div className="mt-3 space-y-3">
            {claudeTasks.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/20 p-3 text-sm text-[#f4f0e8]/52">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                No pending permission requests.
              </div>
            ) : (
              claudeTasks.map((proc) =>
                proc.pendingQuestions.map((q) => {
                  const key = `${proc.taskId}:${q.questionId}`
                  const busy = answering[key]
                  return (
                    <div key={key} className="rounded-[1.2rem] border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-3">
                      <p className="text-xs font-semibold text-[#f59e0b]">{q.toolDetails?.toolName ?? q.prompt}</p>
                      {q.toolDetails?.toolInput?.command != null ? (
                        <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[11px] text-[#f4f0e8]/60">
                          {String(q.toolDetails.toolInput.command)}
                        </pre>
                      ) : null}
                      {q.toolDetails?.toolInput?.file_path != null ? (
                        <p className="mt-1 break-all font-mono text-[11px] text-[#f4f0e8]/60">
                          {String(q.toolDetails.toolInput.file_path)}
                        </p>
                      ) : null}
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => handleAnswer(proc.taskId, q.questionId, 'y')}
                          className="h-7 rounded-lg bg-[#22c55e] px-3 text-xs text-black hover:bg-[#22c55e]/80"
                        >
                          Allow
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleAnswer(proc.taskId, q.questionId, 'n')}
                          className="h-7 rounded-lg border-white/15 px-3 text-xs text-[#f4f0e8]/70 hover:bg-white/5"
                        >
                          Deny
                        </Button>
                      </div>
                    </div>
                  )
                }),
              )
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
        <p className="text-sm font-medium">Active Claude Sessions</p>
        <div className="mt-3 space-y-3">
          {claudeInfo?.sessions.length ? (
            claudeInfo.sessions.map((session) => (
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
                  <p>Theme handled: {session.themeHandled ? 'Yes' : 'No'}</p>
                  <p>Method handled: {session.methodHandled ? 'Yes' : 'No'}</p>
                  <p>Prompt: {session.prompt ?? 'None'}</p>
                  <p>Error: {session.error ?? 'None'}</p>
                  <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
                  {session.authUrl ? (
                    <p className="break-all font-mono text-[11px] text-[#9df6cd]">{session.authUrl}</p>
                  ) : null}
                </div>
                {session.outputExcerpt ? (
                  <div className="mt-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#f4f0e8]/38">Output Excerpt</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-[#9df6cd]">
                      {session.outputExcerpt}
                    </pre>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No active Claude auth sessions. Open the Claude wizard on the mobile app to start one.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
