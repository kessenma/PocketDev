import type { Subprocess } from 'bun'
import { insertTaskLog, updateTaskStatus } from '../db/index.ts'
import { broadcast, makeMessage } from './ws.ts'
import { detectDevServerPort, setDevServerPort } from './proxy.ts'

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

export class ManagedProcess {
  readonly taskId: string
  private proc: Subprocess | null = null
  private _status: TaskStatus = 'pending'
  private killTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    taskId: string,
    private command: string[],
    private cwd: string | null,
  ) {
    this.taskId = taskId
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

              // Check for permission denials
              if (parsed.permission_denials?.length) {
                broadcast(
                  makeMessage('task.permission_request', {
                    taskId: this.taskId,
                    denials: parsed.permission_denials,
                  }),
                )
              }

              // Extract human-readable text for mobile
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
}
