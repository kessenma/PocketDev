import type { TaskQuestion } from '@pocketdev/shared/types'
import type { TaskStreamAdapter, TaskStreamAdapterSink } from '../task-stream-adapters.ts'

export interface SetupCtx {
  taskId: string
  prompt: string
  cwd: string
  model: string | null
  mode: 'default' | 'plan'
  sessionId: string | null
  turnNumber: number
}

export interface SetupResult {
  /** Bash script path — passed directly to PtyRunner.spawn() */
  command: string
  /** If set, poll this file for structured hook events (PreToolUse/PostToolUse/Stop) */
  hooksFilePath?: string
  /** Temp files to delete 5 s after finish */
  tempFiles?: string[]
}

export interface PaneCtx {
  taskId: string
  /** The task's prompt text */
  prompt: string
  /** Whether the agent has started processing (any PTY data received) */
  promptSent: boolean
  /** Milliseconds since the last PTY data was received */
  lastChangeMs: number
  registerQuestion(q: TaskQuestion, onAnswer: (a: string) => void): void
  broadcastOutput(line: string): void
  /** Send literal text followed by Enter. */
  sendLine(text: string): void
  /** Send raw bytes — ANSI escape sequences, control chars. */
  sendRaw(bytes: string): void
  /** Navigate a numbered TUI menu: Down (optionIndex) times then Enter. */
  sendMenuSelection(optionIndex: number): void
}

export type PaneAction =
  | { type: 'continue'; markPromptSent?: boolean }
  | { type: 'complete'; status: 'completed' | 'failed' }
  | { type: 'send'; keys: string; literal?: boolean }
  | { type: 'question'; question: TaskQuestion; onAnswer: (a: string) => void }

export interface FinishCtx {
  status: 'completed' | 'failed' | 'killed'
  adapter: TaskStreamAdapter | null
  turnNumber: number
}

export interface AgentProviderConfig {
  pollIntervalMs: number
  startupTimeoutMs: number
  ptyWidth: number
  ptyHeight: number
  /** When true, strip-and-forward PTY lines to broadcastOutput in real-time (Copilot, Minimax) */
  forwardRawOutput?: boolean

  /** Called before PTY launch — write a bash script and return its path */
  setup(ctx: SetupCtx): Promise<SetupResult>

  /** Optional stream adapter for structured JSON output */
  createAdapter?(
    taskId: string,
    sink: TaskStreamAdapterSink,
    writeStdin: (d: string) => void,
  ): TaskStreamAdapter

  /**
   * Called on each debounced PTY snapshot.
   * Returns how the process should react.
   */
  onPaneSnapshot(snapshot: string, ctx: PaneCtx): Promise<PaneAction> | PaneAction

  /** Called after the process finishes — plan creation, turn recording, etc. */
  onFinish?(ctx: FinishCtx, taskId: string): void
}
