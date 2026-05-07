import { broadcast, makeMessage } from '../terminal/ws.ts'
import { insertTaskLog, updateTaskStatus } from '../../db/index.ts'
import { detectDevServerPort, setDevServerPort } from '../preview/proxy.ts'

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

interface BunTerminal {
  write(data: string | Uint8Array): void
  resize(cols: number, rows: number): void
  close(): void
}

interface BunSubprocessWithTerminal {
  terminal: BunTerminal
  exited: Promise<number>
  kill(signal?: number | string): void
}

export interface ShellPtyOptions {
  taskId: string
  command: string
  cwd: string | null
  onComplete?: () => void
}

export class ShellPtyProcess {
  readonly taskId: string
  private proc: BunSubprocessWithTerminal | null = null
  private _status: TaskStatus = 'pending'
  private _killedByUser = false
  private lineBuffer = ''
  private readonly command: string
  private readonly cwd: string | null
  private readonly onComplete?: () => void

  constructor(opts: ShellPtyOptions) {
    this.taskId = opts.taskId
    this.command = opts.command
    this.cwd = opts.cwd
    this.onComplete = opts.onComplete
  }

  start() {
    this.setStatus('running')
    const decoder = new TextDecoder()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc = Bun.spawn(['sh', '-c', this.command], {
      cwd: this.cwd ?? undefined,
      env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '0' } as Record<string, string>,
      terminal: {
        cols: 220,
        rows: 50,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: (_t: unknown, chunk: any) => {
          const text = typeof chunk === 'string'
            ? chunk
            : decoder.decode(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk))
          this.onData(text)
        },
      },
    } as Parameters<typeof Bun.spawn>[1]) as unknown as BunSubprocessWithTerminal

    this.proc = proc

    proc.exited.then((code: number) => {
      this.flush()
      this.finish(this._killedByUser ? 'killed' : code === 0 ? 'completed' : 'failed')
    }).catch(() => {
      this.flush()
      this.finish('failed')
    })
  }

  private onData(chunk: string) {
    this.lineBuffer += chunk
    const parts = this.lineBuffer.split('\n')
    this.lineBuffer = parts.pop() ?? ''
    for (const raw of parts) {
      const line = raw.replace(/\r/g, '').replace(ANSI_RE, '')
      if (!line) continue
      this.broadcastLine(line)
      const port = detectDevServerPort(line)
      if (port) setDevServerPort(port)
    }
  }

  private flush() {
    if (!this.lineBuffer) return
    const line = this.lineBuffer.replace(/\r/g, '').replace(ANSI_RE, '')
    if (line) this.broadcastLine(line)
    this.lineBuffer = ''
  }

  private broadcastLine(line: string) {
    insertTaskLog(this.taskId, 'stdout', line)
    broadcast(makeMessage('task.output', { taskId: this.taskId, line }))
  }

  private setStatus(status: TaskStatus) {
    this._status = status
    updateTaskStatus(this.taskId, status)
    broadcast(makeMessage('task.status_changed', { taskId: this.taskId, status }))
  }

  private finish(status: TaskStatus) {
    if (this._status === 'completed' || this._status === 'failed' || this._status === 'killed') return
    this.setStatus(status)
    this.onComplete?.()
  }

  sendInput(data: string) {
    if (!this.proc || this._status !== 'running') return
    this.proc.terminal.write(data)
  }

  kill() {
    if (this._status === 'completed' || this._status === 'failed' || this._status === 'killed') return
    this._killedByUser = true
    try { this.proc?.kill() } catch { /* already dead */ }
    this.finish('killed')
  }

  get status(): TaskStatus {
    return this._status
  }
}
