import type { Subprocess } from 'bun'
import { IS_MACOS } from '../system/platform.ts'

export interface TerminalSession {
  id: string
  proc: Subprocess
  send: (data: string) => void
  resize: (cols: number, rows: number) => void
  kill: () => void
}

/** Active terminal sessions keyed by session ID */
const sessions = new Map<string, TerminalSession>()

/** Minimal shape of Bun's native PTY handle (`Bun.spawn({ terminal })`). */
interface BunTerminal {
  write(data: string | Uint8Array): void
  resize(cols: number, rows: number): void
}

/** Spawn a PTY-backed shell session */
export function createTerminalSession(
  sessionId: string,
  onData: (data: string) => void,
  onExit: (code: number) => void,
  cwd?: string,
): TerminalSession {
  const shell = process.env.SHELL ?? '/bin/bash'
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const env = {
    ...process.env,
    HOME: home,
    SHELL: shell,
    TERM: 'xterm-256color',
    COLUMNS: '80',
    LINES: '24',
    // macOS sudo prompts "Password:"; match Linux's wording so the app's sudo sheet detects it.
    ...(IS_MACOS ? { SUDO_PROMPT: '[sudo] password for %p: ' } : {}),
    PATH: process.env.PATH
      ? `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH}`
      : '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  }

  // Auto-accept Claude workspace trust dialog in interactive terminal sessions.
  // The dialog arrives across multiple PTY chunks, so keep a rolling buffer.
  let trustAccepted = false
  let trustBuffer = ''
  const trustRe = /Quick\s*safety\s*check|Is\s*this\s*a\s*project\s*you\s*created/i
  let write: (data: string) => void = () => {}
  const wrappedOnData = (chunk: string) => {
    if (!trustAccepted) {
      trustBuffer = (trustBuffer + chunk).slice(-2000)
      if (trustRe.test(trustBuffer)) {
        trustAccepted = true
        write('\r')
      }
    }
    onData(chunk)
  }

  let proc: Subprocess
  let resize: (cols: number, rows: number) => void

  if (process.platform === 'linux') {
    // util-linux `script` allocates a real PTY even with piped stdio — zero
    // native deps. -q: quiet, -c: command, /dev/null: discard typescript file.
    const piped = Bun.spawn(['script', '-q', '-c', `${shell} -il`, '/dev/null'], {
      cwd: cwd ?? home,
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env,
    })
    proc = piped
    write = (data) => { piped.stdin.write(new TextEncoder().encode(data)) }
    // `script` doesn't support resize directly — send stty command.
    // Best-effort; full PTY resize requires forkpty/ioctl.
    resize = (cols, rows) => write(`stty cols ${cols} rows ${rows}\n`)
    streamOutput(piped.stdout as ReadableStream<Uint8Array> | null, wrappedOnData)
    streamOutput(piped.stderr as ReadableStream<Uint8Array> | null, wrappedOnData)
  } else {
    // macOS/BSD `script` calls tcgetattr() on its own stdin and exits with
    // "Operation not supported on socket" when stdin is a pipe, so use Bun's
    // native PTY instead (same mechanism as ClaudePtyRunner). It also gives
    // us a real TIOCSWINSZ resize.
    const decoder = new TextDecoder()
    const withPty = Bun.spawn([shell, '-il'], {
      cwd: cwd ?? home,
      env,
      terminal: {
        cols: 80,
        rows: 24,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: (_t: unknown, chunk: any) => {
          wrappedOnData(typeof chunk === 'string'
            ? chunk
            : decoder.decode(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk), { stream: true }))
        },
      },
    } as Parameters<typeof Bun.spawn>[1]) as unknown as Subprocess & { terminal: BunTerminal }
    proc = withPty
    write = (data) => { withPty.terminal.write(data) }
    resize = (cols, rows) => {
      try { withPty.terminal.resize(cols, rows) } catch { /* exited */ }
    }
  }

  proc.exited.then((code) => {
    sessions.delete(sessionId)
    onExit(code)
  })

  const session: TerminalSession = {
    id: sessionId,
    proc,
    send(data: string) {
      write(data)
    },
    resize(cols: number, rows: number) {
      resize(cols, rows)
    },
    kill() {
      proc.kill('SIGTERM')
      setTimeout(() => {
        try { proc.kill('SIGKILL') } catch { /* already dead */ }
      }, 3000)
      sessions.delete(sessionId)
    },
  }

  sessions.set(sessionId, session)
  return session
}

/** Get an active terminal session */
export function getTerminalSession(id: string): TerminalSession | undefined {
  return sessions.get(id)
}

/** Kill all terminal sessions (for shutdown) */
export function killAllSessions() {
  for (const session of sessions.values()) {
    session.kill()
  }
}

async function streamOutput(
  stream: ReadableStream<Uint8Array> | null,
  onData: (data: string) => void,
) {
  if (!stream) return
  const reader = stream.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      // Send raw data (not line-buffered) for terminal fidelity
      onData(decoder.decode(value, { stream: true }))
    }
  } catch {
    // Stream closed
  }
}
