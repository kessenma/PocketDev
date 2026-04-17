/**
 * PtyRunner
 *
 * Thin node-pty wrapper for AI agent task processes.
 * Provides a real PTY with direct ANSI escape sequence support.
 *
 * Responsibilities:
 *   - Spawn a bash script inside a real PTY via node-pty-prebuilt-multiarch
 *   - Write bytes (text, ANSI sequences) to the PTY via pty.write()
 *   - Stream raw PTY output via the onData callback
 *   - Fire onExit when the process ends
 *   - Kill the process on demand
 *
 * Does NOT own: output buffering, TUI detection, hooks polling,
 * question tracking, or any broadcast logic — those stay in ManagedAgentProcess.
 */

import type { IPty } from 'node-pty-prebuilt-multiarch'

export interface PtyRunnerOptions {
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

export class PtyRunner {
  private pty: IPty | null = null
  private _exited = false

  /**
   * Spawn the given bash script inside a real PTY.
   * The dynamic import keeps node-pty-prebuilt-multiarch external in the bun bundle
   * (requires --external node-pty-prebuilt-multiarch in bun build).
   */
  async spawn(scriptPath: string, opts: PtyRunnerOptions): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodePty = (await import('node-pty-prebuilt-multiarch')) as any
    // node-pty may export spawn as default or as named export depending on version
    const spawnFn = nodePty.spawn ?? nodePty.default?.spawn
    if (typeof spawnFn !== 'function') {
      throw new Error('[pty-runner] node-pty-prebuilt-multiarch did not export a spawn function')
    }

    this.pty = spawnFn('bash', [scriptPath], {
      name: 'xterm-256color',
      cols: opts.cols,
      rows: opts.rows,
      cwd: opts.cwd,
      env: opts.env,
    }) as IPty

    this.pty.onData(opts.onData)
    this.pty.onExit(({ exitCode }: { exitCode: number }) => {
      this._exited = true
      opts.onExit(exitCode ?? 0)
    })
  }

  /** Send literal text followed by a carriage return (Enter). */
  writeLine(text: string): void {
    if (this._exited || !this.pty) return
    this.pty.write(text + ANSI.ENTER)
  }

  /** Send raw bytes — use for ANSI escape sequences and control characters. */
  writeRaw(bytes: string): void {
    if (this._exited || !this.pty) return
    this.pty.write(bytes)
  }

  /**
   * Navigate a numbered TUI menu by sending Down arrow (optionIndex) times,
   * then Enter to confirm.
   * optionIndex is 0-based: answer "1" → 0 Down presses, answer "2" → 1 Down press.
   */
  sendMenuSelection(optionIndex: number): void {
    if (this._exited || !this.pty) return
    for (let i = 0; i < optionIndex; i++) {
      this.pty.write(ANSI.DOWN)
    }
    this.pty.write(ANSI.ENTER)
  }

  resize(cols: number, rows: number): void {
    if (this._exited || !this.pty) return
    try { this.pty.resize(cols, rows) } catch { /* ignore */ }
  }

  kill(): void {
    if (this._exited) return
    this._exited = true
    try { this.pty?.kill() } catch { /* already dead */ }
  }

  get exited(): boolean {
    return this._exited
  }
}
