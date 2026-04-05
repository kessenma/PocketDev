import type { Subprocess } from 'bun'
import { insertTaskLog, updateTaskStatus } from '../db/index.ts'
import { broadcast, makeMessage } from './ws.ts'
import { detectDevServerPort, setDevServerPort } from './proxy.ts'
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

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

          // Parse stream-json for permission denials
          if (name === 'stdout') {
            try {
              const parsed = JSON.parse(line)
              if (parsed.permission_denials?.length) {
                broadcast(
                  makeMessage('task.permission_request', {
                    taskId: this.taskId,
                    denials: parsed.permission_denials,
                  }),
                )
              }
            } catch { /* not JSON, ignore */ }
          }

          insertTaskLog(this.taskId, name, line)
          broadcast(
            makeMessage('task.output', {
              taskId: this.taskId,
              stream: name,
              line,
            }),
          )
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
