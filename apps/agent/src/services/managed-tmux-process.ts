import { insertTaskLog, updateTaskStatus, getToolPath } from '../db/index.ts'
import { broadcast, makeMessage } from './ws.ts'

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[@-_]/g
const CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g
const TRUST_PROMPT_PATTERN = /do you trust (?:the files in this folder|the contents of this directory)\?/i

/** Patterns indicating Copilot TUI is at its idle prompt, ready for input. */
const READY_PATTERNS = [
  /describe a task to get started/i,
  /type @ to mention files/i,
  /what (?:would you like|can i help|do you want)/i,
  /ask copilot/i,
  /type a message/i,
  /how can i help/i,
]

/** Idle timeout: if output stops changing for this long while a ready pattern is visible, task is complete. */
const IDLE_TIMEOUT_MS = 10_000
const POLL_INTERVAL_MS = 1500
const STARTUP_TIMEOUT_MS = 45_000

function normalizeOutput(text: string): string {
  return text
    .replace(ANSI_RE, '')
    .replace(/\r/g, '\n')
    .replace(CONTROL_RE, ' ')
    // Strip block/cursor characters that change with TUI cursor blink
    .replace(/[█▘▝▗▖▐▌▀▄░▒▓]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const wrapped = `export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"; source ~/.bashrc 2>/dev/null; ${cmd}`
  const proc = Bun.spawn(['bash', '-lc', wrapped], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, HOME: home },
  })

  const timer = setTimeout(() => proc.kill(), timeoutMs)
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited
  clearTimeout(timer)

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1 }
}

export interface ManagedTmuxProcessOptions {
  taskId: string
  prompt: string
  cwd: string
  mode: 'default' | 'plan'
}

export class ManagedTmuxProcess {
  readonly taskId: string
  private _status: TaskStatus = 'pending'
  private tmuxSession: string
  private prompt: string
  private cwd: string
  private previousCapture = ''
  private lastChangeTime = 0
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private promptSent = false
  private startedAt = 0

  constructor(opts: ManagedTmuxProcessOptions) {
    this.taskId = opts.taskId
    this.prompt = opts.prompt
    this.cwd = opts.cwd
    this.tmuxSession = `pocketdev-task-${opts.taskId.slice(0, 8)}`
  }

  get status(): TaskStatus {
    return this._status
  }

  sendInput(data: string) {
    if (this._status !== 'running') return
    void exec(`tmux send-keys -t ${this.tmuxSession} -l ${shellEscape(data)}`)
  }

  async start() {
    this.setStatus('running')
    this.startedAt = Date.now()

    const copilotPath = getToolPath('copilot_cli') ?? 'copilot'

    // Kill any leftover session
    await exec(`tmux kill-session -t ${this.tmuxSession} 2>/dev/null`)

    // Launch copilot inside tmux
    const { exitCode } = await exec(
      `cd ${shellEscape(this.cwd)} && tmux new-session -d -s ${this.tmuxSession} -x 120 -y 40 ${shellEscape(copilotPath)}`,
    )

    if (exitCode !== 0) {
      this.emitLog('stderr', '[copilot] Failed to start tmux session')
      this.finish('failed')
      return
    }

    this.emitLog('stdout', '[copilot] Starting GitHub Copilot TUI session...')
    this.lastChangeTime = Date.now()

    // Start polling
    this.schedulePoll()
  }

  kill() {
    if (this._status !== 'running') return
    this.cleanup()
    this.finish('killed')
  }

  private schedulePoll() {
    this.pollTimer = setTimeout(() => void this.poll(), POLL_INTERVAL_MS)
  }

  private async poll() {
    if (this._status !== 'running') return

    const { stdout: paneContent, exitCode } = await exec(`tmux capture-pane -t ${this.tmuxSession} -p 2>/dev/null`)
    if (exitCode !== 0) {
      this.emitLog('stderr', '[copilot] tmux session exited unexpectedly')
      this.finish('failed')
      return
    }

    const normalized = normalizeOutput(paneContent)

    // Detect new content
    if (normalized !== this.previousCapture) {
      const newContent = this.extractDiff(this.previousCapture, normalized)
      if (newContent) {
        for (const line of newContent.split('\n')) {
          if (line.trim()) this.emitLog('stdout', line)
        }
      }
      this.previousCapture = normalized
      this.lastChangeTime = Date.now()
    }

    // Handle trust prompt
    if (TRUST_PROMPT_PATTERN.test(normalized)) {
      this.emitLog('stdout', '[copilot] Trust prompt detected — auto-accepting...')
      await exec(`tmux send-keys -t ${this.tmuxSession} Down`)
      await Bun.sleep(300)
      await exec(`tmux send-keys -t ${this.tmuxSession} Enter`)
      this.lastChangeTime = Date.now()
      this.schedulePoll()
      return
    }

    // Check if TUI is ready for input (and we haven't sent the prompt yet)
    if (!this.promptSent && this.isReady(normalized)) {
      this.promptSent = true
      this.emitLog('stdout', '[copilot] TUI ready — sending prompt...')

      // Send the prompt as literal keystrokes
      await exec(`tmux send-keys -t ${this.tmuxSession} -l ${shellEscape(this.prompt)}`)
      await Bun.sleep(100)
      await exec(`tmux send-keys -t ${this.tmuxSession} Enter`)
      this.lastChangeTime = Date.now()
      this.schedulePoll()
      return
    }

    // Check for startup timeout (before prompt is sent)
    if (!this.promptSent && Date.now() - this.startedAt > STARTUP_TIMEOUT_MS) {
      this.emitLog('stderr', '[copilot] Timed out waiting for TUI to become ready')
      this.cleanup()
      this.finish('failed')
      return
    }

    // Detect completion: prompt was sent, output idle, and ready pattern visible again
    if (this.promptSent && this.isReady(normalized) && Date.now() - this.lastChangeTime > IDLE_TIMEOUT_MS) {
      this.emitLog('stdout', '[copilot] Task complete — agent returned to idle')
      this.cleanup()
      this.finish('completed')
      return
    }

    this.schedulePoll()
  }

  private isReady(normalized: string): boolean {
    return READY_PATTERNS.some((pattern) => pattern.test(normalized))
  }

  private extractDiff(previous: string, current: string): string | null {
    if (!previous) return current
    // If current starts with previous content, return only the new part
    if (current.startsWith(previous)) {
      const diff = current.slice(previous.length).trim()
      return diff || null
    }
    // TUI screen redraw — return full current content
    return current
  }

  private emitLog(stream: 'stdout' | 'stderr', line: string) {
    insertTaskLog(this.taskId, stream, line)
    broadcast(
      makeMessage('task.output', {
        taskId: this.taskId,
        stream,
        line,
      }),
    )
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

  private finish(status: 'completed' | 'failed' | 'killed') {
    const exitCode = status === 'completed' ? 0 : status === 'killed' ? -1 : 1
    this.setStatus(status, exitCode)
    broadcast(
      makeMessage('task.completed', {
        taskId: this.taskId,
        exitCode,
        status,
      }),
    )
  }

  private cleanup() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    void exec(`tmux kill-session -t ${this.tmuxSession} 2>/dev/null`)
  }
}
