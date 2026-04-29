/**
 * ClaudePtyRunner
 *
 * Thin Bun.spawn(terminal:…) wrapper for the Claude task process. Provides a
 * real PTY with direct ANSI escape sequence support, replacing the tmux
 * send-keys mechanism for Claude tasks.
 *
 * Uses Bun's built-in PTY API (added in Bun 1.3.5) — no native module deps,
 * no ABI mismatch. node-pty itself is broken under Bun: the master fd dies
 * within ~20ms of spawn, taking the child shell with it.
 *
 * Responsibilities:
 *   - Spawn a bash script inside a real PTY via Bun.spawn { terminal }
 *   - Write bytes (text, ANSI sequences) to the PTY
 *   - Stream raw PTY output via the onData callback
 *   - Fire onExit when the process ends
 *   - Kill the process on demand
 *
 * Does NOT own: output buffering, TUI detection, hooks polling,
 * question tracking, or any broadcast logic — those stay in ManagedAgentProcess.
 */

export interface ClaudePtyOptions {
  cols: number
  rows: number
  cwd: string
  env: Record<string, string>
  onData: (chunk: string) => void
  onExit: (exitCode: number) => void
}

/** ANSI escape sequences for interactive input. */
export const ANSI = {
  DOWN: '\x1b[B',
  UP: '\x1b[A',
  ENTER: '\r',
  CTRL_C: '\x03',
  ESC: '\x1b',
} as const

// Bun.spawn returns a Subprocess with a `terminal` field when the terminal
// option is set. Bun's types don't fully describe this yet, so we narrow here.
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

export class ClaudePtyRunner {
  private proc: BunSubprocessWithTerminal | null = null
  private _exited = false

  /** Spawn the given bash script inside a real PTY. */
  async spawn(scriptPath: string, opts: ClaudePtyOptions): Promise<void> {
    const decoder = new TextDecoder()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc = Bun.spawn(['bash', scriptPath], {
      cwd: opts.cwd,
      env: opts.env,
      terminal: {
        cols: opts.cols,
        rows: opts.rows,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data(_t: unknown, chunk: any) {
          const text = typeof chunk === 'string'
            ? chunk
            : decoder.decode(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk))
          opts.onData(text)
        },
      },
    } as Parameters<typeof Bun.spawn>[1]) as unknown as BunSubprocessWithTerminal

    this.proc = proc

    proc.exited.then((code: number) => {
      this._exited = true
      opts.onExit(code ?? 0)
    }).catch(() => {
      this._exited = true
      opts.onExit(1)
    })
  }

  /** Send literal text followed by a carriage return (Enter). */
  writeLine(text: string): void {
    if (this._exited || !this.proc) return
    this.proc.terminal.write(text + ANSI.ENTER)
  }

  /** Send raw bytes — use for ANSI escape sequences and control characters. */
  writeRaw(bytes: string): void {
    if (this._exited || !this.proc) return
    this.proc.terminal.write(bytes)
  }

  /**
   * Navigate a numbered TUI menu by sending Down arrow (optionIndex) times,
   * then Enter to confirm.
   * optionIndex is 0-based: answer "1" → 0 Down presses, answer "2" → 1 Down press, etc.
   */
  sendMenuSelection(optionIndex: number): void {
    if (this._exited || !this.proc) return
    for (let i = 0; i < optionIndex; i++) {
      this.proc.terminal.write(ANSI.DOWN)
    }
    this.proc.terminal.write(ANSI.ENTER)
  }

  resize(cols: number, rows: number): void {
    if (this._exited || !this.proc) return
    try { this.proc.terminal.resize(cols, rows) } catch { /* ignore */ }
  }

  kill(): void {
    if (this._exited) return
    this._exited = true
    try { this.proc?.kill() } catch { /* already dead */ }
  }

  get exited(): boolean {
    return this._exited
  }
}
