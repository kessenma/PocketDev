import type { Subprocess } from 'bun'

export interface TerminalSession {
  id: string
  proc: Subprocess
  send: (data: string) => void
  resize: (cols: number, rows: number) => void
  kill: () => void
}

/** Active terminal sessions keyed by session ID */
const sessions = new Map<string, TerminalSession>()

/** Spawn a PTY-backed shell session */
export function createTerminalSession(
  sessionId: string,
  onData: (data: string) => void,
  onExit: (code: number) => void,
  cwd?: string,
): TerminalSession {
  // Use `script` to allocate a real PTY — works on Linux/macOS, zero native deps.
  // -q: quiet, /dev/null: discard typescript file
  const shell = process.env.SHELL ?? '/bin/bash'
  const shellCommand = `${shell} -il`
  const isLinux = process.platform === 'linux'
  const cmd = isLinux
    ? ['script', '-q', '-c', shellCommand, '/dev/null']
    : ['script', '-q', '/dev/null', shellCommand]

  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'

  const proc = Bun.spawn(cmd, {
    cwd: cwd ?? home,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      HOME: home,
      SHELL: shell,
      TERM: 'xterm-256color',
      COLUMNS: '80',
      LINES: '24',
      PATH: process.env.PATH
        ? `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH}`
        : '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    },
  })

  // Stream stdout to WebSocket
  streamOutput(proc.stdout as ReadableStream<Uint8Array> | null, onData)
  streamOutput(proc.stderr as ReadableStream<Uint8Array> | null, onData)

  proc.exited.then((code) => {
    sessions.delete(sessionId)
    onExit(code)
  })

  const session: TerminalSession = {
    id: sessionId,
    proc,
    send(data: string) {
      proc.stdin.write(new TextEncoder().encode(data))
    },
    resize(cols: number, rows: number) {
      // `script` doesn't support resize directly — send stty command
      // This is a best-effort approach; full PTY resize requires forkpty/ioctl
      proc.stdin.write(new TextEncoder().encode(`stty cols ${cols} rows ${rows}\n`))
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
