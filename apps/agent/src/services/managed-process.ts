import type { Subprocess } from 'bun'
import type { PlanStep, PlanQuestion, TaskActivity } from '@pocketdev/shared/types'
import { insertTaskLog, updateTaskStatus } from '../db/index.ts'
import { broadcast, makeMessage } from './ws.ts'
import { detectDevServerPort, setDevServerPort } from './proxy.ts'
import { proposePlan } from './plan-manager.ts'

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

/**
 * Parse a Claude CLI stream-json line into human-readable text.
 * Returns null if the line should be suppressed (noise), or a readable string otherwise.
 */
function parseStreamJsonLine(json: Record<string, unknown>): string | null {
  const type = json.type as string | undefined

  if (type === 'system') {
    const subtype = json.subtype as string | undefined
    if (subtype === 'init') {
      const model = (json as any).model ?? 'unknown'
      const perm = (json as any).permissionMode ?? 'unknown'
      return `[system] Session started — model: ${model}, permission: ${perm}`
    }
    if (subtype === 'task_started') {
      const desc = (json as any).description ?? ''
      return `[agent] Sub-task started: ${desc}`
    }
    if (subtype === 'task_progress') {
      const desc = (json as any).description ?? ''
      return `[agent] ${desc}`
    }
    if (subtype === 'task_completed') {
      return `[agent] Sub-task completed`
    }
    return null // suppress other system messages
  }

  if (type === 'assistant') {
    const message = json.message as Record<string, unknown> | undefined
    if (!message) return null
    const content = message.content as Array<Record<string, unknown>> | undefined
    if (!content?.length) return null

    const parts: string[] = []
    for (const block of content) {
      if (block.type === 'thinking') {
        const text = (block.thinking as string) ?? ''
        const preview = text.length > 200 ? text.slice(0, 200) + '...' : text
        parts.push(`[thinking] ${preview}`)
      } else if (block.type === 'text') {
        parts.push(block.text as string)
      } else if (block.type === 'tool_use') {
        const name = block.name as string
        const input = block.input as Record<string, unknown> | undefined
        if (name === 'Bash' && input?.command) {
          parts.push(`[tool] ${name}: ${input.command}`)
        } else if ((name === 'Read' || name === 'Glob' || name === 'Grep') && input?.file_path) {
          parts.push(`[tool] ${name}: ${input.file_path}`)
        } else if ((name === 'Read' || name === 'Glob' || name === 'Grep') && input?.pattern) {
          parts.push(`[tool] ${name}: ${input.pattern}`)
        } else if (name === 'Edit' && input?.file_path) {
          parts.push(`[tool] ${name}: ${input.file_path}`)
        } else if (name === 'Write' && input?.file_path) {
          parts.push(`[tool] ${name}: ${input.file_path}`)
        } else if (name === 'Agent') {
          const desc = (input?.description as string) ?? ''
          parts.push(`[tool] ${name}: ${desc}`)
        } else {
          parts.push(`[tool] ${name}`)
        }
      }
    }
    return parts.length > 0 ? parts.join('\n') : null
  }

  if (type === 'user') {
    // Tool results — show brief summary
    const message = json.message as Record<string, unknown> | undefined
    const content = message?.content as Array<Record<string, unknown>> | undefined
    if (!content?.length) return null

    for (const block of content) {
      if (block.type === 'tool_result') {
        const text = (block.content as string) ?? ''
        const isError = block.is_error as boolean | undefined
        if (isError) return `[error] ${text.slice(0, 300)}`
        if (text.length > 300) return `[result] ${text.slice(0, 300)}...`
        if (text.length > 0) return `[result] ${text}`
      }
    }
    return null
  }

  if (type === 'result') {
    const message = json.message as Record<string, unknown> | undefined
    const stopReason = message?.stop_reason as string | undefined
    return `[done] Task finished (${stopReason ?? 'complete'})`
  }

  if (type === 'rate_limit_event') return null

  return null
}

/**
 * Extract structured activity events from a Claude CLI stream-json object.
 * Returns an array of TaskActivity items to broadcast.
 */
function extractActivities(json: Record<string, unknown>): TaskActivity[] {
  const type = json.type as string | undefined
  const activities: TaskActivity[] = []

  if (type === 'assistant') {
    const message = json.message as Record<string, unknown> | undefined
    const content = message?.content as Array<Record<string, unknown>> | undefined
    if (!content?.length) return activities

    for (const block of content) {
      if (block.type === 'thinking') {
        const text = (block.thinking as string) ?? ''
        activities.push({ type: 'thinking', preview: text.length > 200 ? text.slice(0, 200) + '...' : text })
      } else if (block.type === 'text') {
        activities.push({ type: 'text', content: block.text as string })
      } else if (block.type === 'tool_use') {
        const name = block.name as string
        const input = block.input as Record<string, unknown> | undefined
        const activity: TaskActivity = { type: 'tool_use', tool: name }
        if (input) {
          if (input.file_path) (activity as any).filePath = input.file_path as string
          if (input.command) (activity as any).command = (input.command as string).slice(0, 300)
          if (input.pattern) (activity as any).pattern = input.pattern as string
          if (input.description) (activity as any).description = input.description as string
          if (input.path && !input.file_path) (activity as any).filePath = input.path as string
        }
        activities.push(activity)
      }
    }
  }

  if (type === 'user') {
    const message = json.message as Record<string, unknown> | undefined
    const content = message?.content as Array<Record<string, unknown>> | undefined
    if (!content?.length) return activities

    for (const block of content) {
      if (block.type === 'tool_result') {
        const text = (block.content as string) ?? ''
        const isError = (block.is_error as boolean) ?? false
        activities.push({
          type: 'tool_result',
          toolName: (block.tool_use_id as string) ?? 'unknown',
          isError,
          preview: text.length > 300 ? text.slice(0, 300) + '...' : text,
        })
      }
    }
  }

  if (type === 'result') {
    const message = json.message as Record<string, unknown> | undefined
    const stopReason = message?.stop_reason as string | undefined
    activities.push({ type: 'status', message: `Task finished (${stopReason ?? 'complete'})` })
  }

  return activities
}

interface CollectedToolUse {
  name: string
  id: string
  input: Record<string, unknown>
}

function toolUseToPlanStep(tool: CollectedToolUse): PlanStep {
  const base = { id: tool.id, completed: false }
  const name = tool.name
  const input = tool.input

  if (name === 'Edit') {
    return { ...base, kind: 'modify', title: `Edit ${input.file_path ?? 'file'}`, description: '', filePath: input.file_path as string | undefined }
  }
  if (name === 'Write') {
    return { ...base, kind: 'create', title: `Create ${input.file_path ?? 'file'}`, description: '', filePath: input.file_path as string | undefined }
  }
  if (name === 'Bash') {
    const cmd = (input.command as string) ?? ''
    return { ...base, kind: 'run', title: `Run command`, description: cmd.length > 200 ? cmd.slice(0, 200) + '...' : cmd }
  }
  if (name === 'Read' || name === 'Glob' || name === 'Grep') {
    const target = (input.file_path ?? input.pattern ?? input.path ?? '') as string
    return { ...base, kind: 'note', title: `${name}: ${target}`, description: '' }
  }
  if (name === 'Agent') {
    return { ...base, kind: 'note', title: `Agent: ${(input.description as string) ?? ''}`, description: (input.prompt as string)?.slice(0, 200) ?? '' }
  }
  return { ...base, kind: 'note', title: `${name}`, description: JSON.stringify(input).slice(0, 200) }
}

export interface ManagedProcessOptions {
  taskId: string
  command: string[]
  cwd: string | null
  mode: 'default' | 'plan'
  agentType: string
}

export class ManagedProcess {
  readonly taskId: string
  private proc: Subprocess | null = null
  private _status: TaskStatus = 'pending'
  private killTimer: ReturnType<typeof setTimeout> | null = null
  private mode: 'default' | 'plan'
  private agentType: string
  private collectedToolUses: CollectedToolUse[] = []
  private collectedThinking = ''
  private collectedText = ''
  private command: string[]
  private cwd: string | null

  constructor(opts: ManagedProcessOptions) {
    this.taskId = opts.taskId
    this.command = opts.command
    this.cwd = opts.cwd
    this.mode = opts.mode
    this.agentType = opts.agentType
  }

  get status(): TaskStatus {
    return this._status
  }

  /** Write data to the process stdin (for interactive commands) */
  sendInput(data: string) {
    if (!this.proc || this._status !== 'running') return
    const stdin = this.proc.stdin
    if (!stdin || typeof stdin === 'number') return
    try {
      stdin.write(new TextEncoder().encode(data))
    } catch (err) {
      console.error(`Error writing stdin for task ${this.taskId}:`, err)
    }
  }

  /** Spawn the child process and start streaming output */
  start() {
    this.setStatus('running')

    this.proc = Bun.spawn(this.command, {
      cwd: this.cwd ?? undefined,
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' },
    })

    // Close stdin for non-interactive agents (codex exec) so they don't block waiting for input
    if (this.agentType === 'codex') {
      try {
        const stdin = this.proc.stdin
        if (stdin && typeof stdin !== 'number') stdin.end()
      } catch { /* ignore */ }
    }

    // Stream stdout
    this.streamLines(this.proc.stdout as ReadableStream<Uint8Array> | null, 'stdout')
    // Stream stderr
    this.streamLines(this.proc.stderr as ReadableStream<Uint8Array> | null, 'stderr')

    // Wait for exit
    this.proc.exited.then((exitCode) => {
      this.killTimer && clearTimeout(this.killTimer)
      const status: TaskStatus = exitCode === 0 ? 'completed' : 'failed'
      this.setStatus(status, exitCode)

      broadcast(
        makeMessage('task.completed', {
          taskId: this.taskId,
          exitCode,
          status,
        }),
      )

      // If plan mode and we collected tool uses, create a plan for review
      if (this.mode === 'plan' && this.collectedToolUses.length > 0) {
        this.createPlanFromToolUses()
      }
    })
  }

  /** Kill the process (SIGTERM, then SIGKILL after 5s) */
  kill() {
    if (!this.proc || this._status !== 'running') return

    this.proc.kill('SIGTERM')

    this.killTimer = setTimeout(() => {
      if (this._status === 'running' && this.proc) {
        this.proc.kill('SIGKILL')
      }
    }, 5000)
  }

  private setStatus(status: TaskStatus, exitCode?: number) {
    this._status = status
    updateTaskStatus(this.taskId, status, exitCode)
    broadcast(
      makeMessage('task.status_changed', {
        taskId: this.taskId,
        status,
      }),
    )
  }

  private async streamLines(
    stream: ReadableStream<Uint8Array> | null,
    name: 'stdout' | 'stderr',
  ) {
    if (!stream) return

    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.length === 0) continue

          // Auto-detect dev server port from output
          const port = detectDevServerPort(line)
          if (port) setDevServerPort(port)

          // Store raw line in DB (for diagnostics)
          insertTaskLog(this.taskId, name, line)

          // Parse stream-json stdout for structured events
          if (name === 'stdout') {
            try {
              const parsed = JSON.parse(line)

              // Collect tool_use blocks and text for plan creation
              this.collectFromStreamJson(parsed)

              // Check for permission denials
              if (parsed.permission_denials?.length) {
                const denials = parsed.permission_denials as Array<{ tool_name: string; tool_use_id?: string; tool_input?: Record<string, unknown> }>
                broadcast(
                  makeMessage('task.permission_request', {
                    taskId: this.taskId,
                    denials,
                  }),
                )

                // Also emit structured question events for the interaction sheet
                for (const denial of denials) {
                  broadcast(
                    makeMessage('task.question', {
                      questionId: denial.tool_use_id ?? crypto.randomUUID(),
                      taskId: this.taskId,
                      prompt: `Allow ${denial.tool_name}?`,
                      type: 'permission',
                      toolDetails: {
                        toolName: denial.tool_name,
                        toolInput: denial.tool_input,
                      },
                    }),
                  )
                }
              }

              // Extract human-readable text for mobile (raw logs)
              const readable = parseStreamJsonLine(parsed)
              if (readable) {
                broadcast(
                  makeMessage('task.output', {
                    taskId: this.taskId,
                    stream: name,
                    line: readable,
                  }),
                )
              }

              // Emit structured activity events for TaskStreamer UI
              const activities = extractActivities(parsed)
              for (const activity of activities) {
                broadcast(
                  makeMessage('task.activity', {
                    taskId: this.taskId,
                    activity,
                    timestamp: Date.now(),
                  }),
                )
              }
            } catch {
              // Not JSON — broadcast as-is (stderr or plain text)
              broadcast(
                makeMessage('task.output', {
                  taskId: this.taskId,
                  stream: name,
                  line,
                }),
              )
            }
          } else {
            // stderr — broadcast as-is
            broadcast(
              makeMessage('task.output', {
                taskId: this.taskId,
                stream: name,
                line,
              }),
            )
          }
        }
      }

      // Flush remaining buffer
      if (buffer.length > 0) {
        insertTaskLog(this.taskId, name, buffer)
        broadcast(
          makeMessage('task.output', {
            taskId: this.taskId,
            stream: name,
            line: buffer,
          }),
        )
      }
    } catch (err) {
      console.error(`Error reading ${name} for task ${this.taskId}:`, err)
    }
  }

  private collectFromStreamJson(parsed: Record<string, unknown>) {
    if (parsed.type !== 'assistant') return
    const message = parsed.message as Record<string, unknown> | undefined
    const content = message?.content as Array<Record<string, unknown>> | undefined
    if (!content?.length) return

    for (const block of content) {
      if (block.type === 'thinking' && block.thinking) {
        this.collectedThinking = block.thinking as string
      } else if (block.type === 'text' && block.text) {
        this.collectedText += (block.text as string) + '\n'
      } else if (block.type === 'tool_use') {
        this.collectedToolUses.push({
          name: block.name as string,
          id: block.id as string,
          input: (block.input as Record<string, unknown>) ?? {},
        })
      }
    }
  }

  private createPlanFromToolUses() {
    const actionableTools = this.collectedToolUses.filter(
      (t) => !['Read', 'Glob', 'Grep', 'TodoWrite'].includes(t.name),
    )
    const steps: PlanStep[] = this.collectedToolUses.map(toolUseToPlanStep)

    // Build title from first text or thinking
    const titleSource = this.collectedText.trim() || this.collectedThinking
    const title = titleSource.length > 80
      ? titleSource.slice(0, 80) + '...'
      : titleSource || 'Proposed plan'

    const description = this.collectedThinking.length > 500
      ? this.collectedThinking.slice(0, 500) + '...'
      : this.collectedThinking || this.collectedText.slice(0, 500) || 'Agent proposed the following actions.'

    const questions: PlanQuestion[] = [
      {
        id: crypto.randomUUID(),
        question: `Approve this plan (${actionableTools.length} action${actionableTools.length === 1 ? '' : 's'}) and re-run with full permissions?`,
        required: true,
      },
    ]

    const agentName = this.agentType === 'codex' ? 'Codex' : 'Claude'

    console.log(`[managed-process] Creating plan from ${steps.length} tool uses for task ${this.taskId}`)
    proposePlan(this.taskId, title, description, agentName, steps, questions)
  }
}
