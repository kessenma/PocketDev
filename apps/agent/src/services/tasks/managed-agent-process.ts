/**
 * ManagedAgentProcess
 *
 * Provider-agnostic tmux-based process manager for AI CLI agents.
 *
 * Strategy:
 *   1. Provider config builds the launch command (and optionally an output file path).
 *   2. Command is launched in a named tmux session — Claude and Copilot both get a real PTY.
 *   3. If outputFilePath is returned by setup():
 *        → FILE MODE: poll the file for new JSONL lines, feed to a stream adapter.
 *          Session exit signals completion.
 *   4. If outputFilePath is omitted:
 *        → PANE MODE: poll the tmux pane capture for visible output (Copilot-style).
 *          Provider signals completion via PaneAction.
 *   5. Every few ticks: capture pane and call provider.onPaneSnapshot() to handle
 *      TUI menus (Claude), trust prompts (Copilot), idle detection, etc.
 *   6. Answers to prompts sent via `tmux send-keys`.
 *
 * Built-in providers: claudeProviderConfig(), copilotProviderConfig()
 */

import type { PlanQuestion, PlanStep, TaskActivity, TaskQuestion } from '@pocketdev/shared/types'
import { eq } from 'drizzle-orm'
import {
  getDb,
  getToolPath,
  insertTaskFileTouch,
  insertTaskLog,
  insertTaskTurn,
  schema,
  updateTaskStatus,
} from '../../db/index.ts'
import { proposePlan } from './plan-manager.ts'
import { detectDevServerPort, setDevServerPort } from '../preview/proxy.ts'
import {
  createTaskStreamAdapter,
  type CollectedToolUse,
  type PermissionDenial,
  type TaskStreamAdapter,
  type TaskStreamAdapterSink,
} from './task-stream-adapters.ts'
import { broadcast, makeMessage } from '../terminal/ws.ts'

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

// ── Shared utilities ──────────────────────────────────────────────────────────

const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[@-_]/g
const CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g

function normalizePane(text: string): string {
  return text
    .replace(ANSI_RE, '')
    .replace(/\r/g, '\n')
    .replace(CONTROL_RE, ' ')
    .replace(/[█▘▝▗▖▐▌▀▄░▒▓]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function shellEscape(value: string): string {
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

// TS language server inconsistently resolves the bun `crypto` global in new methods — cast once here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const newUUID = (): string => (globalThis as any).crypto.randomUUID() as string

// ── Provider config types ─────────────────────────────────────────────────────

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
  /** Full shell command (or script path) to run inside the tmux session */
  command: string
  /** If set, poll this file for output lines (file mode). Omit for pane mode. */
  outputFilePath?: string
  /** Temp files to delete 5 s after finish */
  tempFiles?: string[]
}

export interface PaneCtx {
  taskId: string
  /** The task's prompt text — needed by pane-mode providers to send it to the TUI */
  prompt: string
  tmuxSession: string
  /** Whether the user's task prompt has been sent to the TUI (pane-mode providers) */
  promptSent: boolean
  /** Milliseconds since the pane content last changed */
  lastChangeMs: number
  registerQuestion(q: TaskQuestion, onAnswer: (a: string) => void): void
  broadcastOutput(line: string): void
  sendToTmux(data: string): void
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

export interface TmuxProviderConfig {
  pollIntervalMs: number
  /** How many poll ticks between pane captures (1 = every tick, 3 = every 3rd tick) */
  panePollEvery: number
  startupTimeoutMs: number
  tmuxWidth: number
  tmuxHeight: number

  /** Called before tmux launch — build the command + output file path */
  setup(ctx: SetupCtx): Promise<SetupResult>

  /** Optional stream adapter for structured JSON output (e.g. Claude JSONL) */
  createAdapter?(
    taskId: string,
    sink: TaskStreamAdapterSink,
    writeStdin: (d: string) => void,
  ): TaskStreamAdapter

  /**
   * Called on each pane snapshot when content has changed.
   * Returns how the process should react. May be async (e.g. to sleep between keystrokes).
   */
  onPaneSnapshot(snapshot: string, ctx: PaneCtx): Promise<PaneAction> | PaneAction

  /** Called after the process finishes — plan creation, turn recording, etc. */
  onFinish?(ctx: FinishCtx, taskId: string): void
}

// ── Claude provider ───────────────────────────────────────────────────────────

interface TuiPrompt {
  prompt: string
  options: Array<{ value: string; label: string }>
}

function parseTuiPrompt(pane: string): TuiPrompt | null {
  if (!/❯\s*\d+\./.test(pane)) return null
  const questionMatch = pane.match(
    /(Is this a project[^\n]+\?|Do you want to[^\n]+\?|Quick safety check[^\n]*)/i,
  )
  const prompt = questionMatch?.[1]?.trim() ?? 'Permission required'
  const optionMatches = [...pane.matchAll(/\d+\.\s+([^\n]+)/g)]
  if (optionMatches.length < 2) return null
  const options = optionMatches.map((m, i) => ({
    value: String(i + 1),
    label: m[1].trim(),
  }))
  return { prompt, options }
}

function toolUseToPlanStep(tool: CollectedToolUse): PlanStep {
  const base = { id: tool.id, completed: false }
  const { name, input } = tool

  if (name === 'Edit' || name === 'apply_patch') {
    return { ...base, kind: 'modify', title: `Edit ${String(input.file_path ?? input.path ?? 'file')}`, description: '', filePath: (input.file_path ?? input.path) as string | undefined }
  }
  if (name === 'Write') {
    return { ...base, kind: 'create', title: `Create ${String(input.file_path ?? 'file')}`, description: '', filePath: input.file_path as string | undefined }
  }
  if (name === 'Bash' || name === 'exec_command') {
    const cmd = (input.command as string) ?? ''
    return { ...base, kind: 'run', title: 'Run command', description: cmd.length > 200 ? `${cmd.slice(0, 200)}...` : cmd }
  }
  if (name === 'Read' || name === 'Glob' || name === 'Grep' || name === 'search' || name === 'list_files') {
    const target = (input.file_path ?? input.pattern ?? input.path ?? '') as string
    return { ...base, kind: 'note', title: `${name}: ${target}`, description: '' }
  }
  if (name === 'Agent' || name === 'spawn_agent') {
    return { ...base, kind: 'note', title: `Agent: ${(input.description as string) ?? ''}`, description: ((input.prompt ?? input.instructions) as string | undefined)?.slice(0, 200) ?? '' }
  }
  return { ...base, kind: 'note', title: `${name}`, description: JSON.stringify(input).slice(0, 200) }
}

function createClaudePlan(taskId: string, adapter: TaskStreamAdapter, mode: 'default' | 'plan') {
  if (mode !== 'plan') return
  const collectedToolUses = adapter.getCollectedToolUses()
  if (collectedToolUses.length === 0) return

  const actionableTools = collectedToolUses.filter(
    (tool) => !['Read', 'Glob', 'Grep', 'TodoWrite', 'update_plan'].includes(tool.name),
  )
  const steps: PlanStep[] = collectedToolUses.map(toolUseToPlanStep)

  const collectedText = adapter.getCollectedText().trim()
  const collectedThinking = adapter.getCollectedThinking().trim()
  const titleSource = collectedText || collectedThinking
  const title = titleSource.length > 80 ? `${titleSource.slice(0, 80)}...` : titleSource || 'Proposed plan'
  const description = collectedThinking.length > 500
    ? `${collectedThinking.slice(0, 500)}...`
    : collectedThinking || collectedText.slice(0, 500) || 'Agent proposed the following actions.'

  const questions: PlanQuestion[] = [
    {
      id: crypto.randomUUID(),
      question: `Approve this plan (${actionableTools.length} action${actionableTools.length === 1 ? '' : 's'}) and re-run with full permissions?`,
      required: true,
    },
  ]

  console.log(`[managed-agent] Creating plan from ${steps.length} tool uses for task ${taskId}`)
  proposePlan(taskId, title, description, 'Claude', steps, questions)
}

export function claudeProviderConfig(): TmuxProviderConfig {
  // Capture mode in closure so onFinish can use it without adding it to FinishCtx
  let taskMode: 'default' | 'plan' = 'default'

  return {
    pollIntervalMs: 250,
    panePollEvery: 3,
    startupTimeoutMs: 60_000,
    tmuxWidth: 220,
    tmuxHeight: 50,

    async setup(ctx) {
      taskMode = ctx.mode
      const claudePath = getToolPath('claude_cli') ?? 'claude'
      const permissionMode = ctx.mode === 'plan' ? 'plan' : 'default'

      const args: string[] = [
        shellEscape(claudePath),
        '--output-format', 'stream-json',
        '--permission-mode', permissionMode,
        '--verbose',
      ]
      if (ctx.sessionId) {
        if (ctx.turnNumber > 1) {
          args.push('--resume', shellEscape(ctx.sessionId))
        } else {
          args.push('--session-id', shellEscape(ctx.sessionId))
        }
      }
      if (ctx.model) args.push('--model', shellEscape(ctx.model))
      args.push('-p', '"$POCKETDEV_PROMPT"')

      const promptPath = `/tmp/pocketdev-prompt-${ctx.taskId}.txt`
      const outputFilePath = `/tmp/pocketdev-out-${ctx.taskId}.jsonl`
      const scriptPath = `/tmp/pocketdev-run-${ctx.taskId}.sh`

      await Bun.write(promptPath, ctx.prompt)
      const script = [
        '#!/bin/bash',
        `export POCKETDEV_PROMPT=$(cat ${shellEscape(promptPath)})`,
        `cd ${shellEscape(ctx.cwd)}`,
        `${args.join(' ')} >> ${shellEscape(outputFilePath)} 2>&1`,
      ].join('\n')
      await Bun.write(scriptPath, script)
      await exec(`chmod +x ${shellEscape(scriptPath)}`)
      await Bun.write(outputFilePath, '')

      return {
        command: scriptPath,
        outputFilePath,
        tempFiles: [promptPath, scriptPath, outputFilePath],
      }
    },

    createAdapter(taskId, sink, writeStdin) {
      return createTaskStreamAdapter({ agentType: 'claude', taskId, sink, writeStdin })!
    },

    onPaneSnapshot(snapshot, ctx) {
      const tuiPrompt = parseTuiPrompt(snapshot)
      if (!tuiPrompt) return { type: 'continue' }

      const questionId = newUUID()
      return {
        type: 'question',
        question: {
          questionId,
          taskId: ctx.taskId,
          provider: 'claude',
          prompt: tuiPrompt.prompt,
          type: 'multiple_choice',
          options: tuiPrompt.options.map((o) => ({ value: o.value, label: o.label })),
        },
        onAnswer: (answer) => {
          void exec(`tmux send-keys -t ${ctx.tmuxSession} ${shellEscape(answer)} Enter`)
        },
      }
    },

    onFinish(finishCtx, taskId) {
      const { adapter, turnNumber, status } = finishCtx
      if (!adapter) return

      const collectedText = adapter.getCollectedText().trim()
      if (collectedText) {
        try {
          insertTaskTurn(crypto.randomUUID(), taskId, turnNumber, 'assistant', collectedText)
        } catch (err) {
          console.error(`[managed-agent] Failed to save assistant turn for task ${taskId}:`, err)
        }
      }

      if (status !== 'killed') {
        createClaudePlan(taskId, adapter, taskMode)
      }
    },
  }
}

// ── Copilot provider ──────────────────────────────────────────────────────────

const TRUST_PROMPT_PATTERN = /do you trust (?:the files in this folder|the contents of this directory)\?/i
const COPILOT_IDLE_TIMEOUT_MS = 10_000
const COPILOT_READY_PATTERNS = [
  /describe a task to get started/i,
  /type @ to mention files/i,
  /what (?:would you like|can i help|do you want)/i,
  /ask copilot/i,
  /type a message/i,
  /how can i help/i,
]

function isCopilotReady(normalized: string): boolean {
  return COPILOT_READY_PATTERNS.some((p) => p.test(normalized))
}

export function copilotProviderConfig(): TmuxProviderConfig {
  return {
    pollIntervalMs: 1500,
    panePollEvery: 1,
    startupTimeoutMs: 45_000,
    tmuxWidth: 120,
    tmuxHeight: 40,

    async setup(ctx) {
      const copilotPath = getToolPath('copilot_cli') ?? 'copilot'
      const command = ctx.model
        ? `${shellEscape(copilotPath)} --model ${shellEscape(ctx.model)}`
        : shellEscape(copilotPath)
      return { command }
    },

    async onPaneSnapshot(snapshot, ctx) {
      // Auto-answer trust prompt
      if (TRUST_PROMPT_PATTERN.test(snapshot)) {
        ctx.broadcastOutput('[copilot] Trust prompt detected — auto-accepting...')
        await exec(`tmux send-keys -t ${ctx.tmuxSession} Down`)
        await Bun.sleep(300)
        await exec(`tmux send-keys -t ${ctx.tmuxSession} Enter`)
        return { type: 'continue' }
      }

      // Send prompt when TUI is ready for the first time
      if (!ctx.promptSent && isCopilotReady(snapshot)) {
        ctx.broadcastOutput('[copilot] TUI ready — sending prompt...')
        await exec(`tmux send-keys -t ${ctx.tmuxSession} -l ${shellEscape(ctx.prompt)}`)
        await Bun.sleep(100)
        await exec(`tmux send-keys -t ${ctx.tmuxSession} Enter`)
        return { type: 'continue', markPromptSent: true }
      }

      // Detect completion: prompt sent + output idle + ready pattern visible again
      if (ctx.promptSent && isCopilotReady(snapshot) && ctx.lastChangeMs > COPILOT_IDLE_TIMEOUT_MS) {
        ctx.broadcastOutput('[copilot] Task complete — agent returned to idle')
        return { type: 'complete', status: 'completed' }
      }

      return { type: 'continue' }
    },
  }
}

// ── Main class ────────────────────────────────────────────────────────────────

export interface ManagedAgentProcessOptions {
  taskId: string
  prompt: string
  cwd: string | null
  mode: 'default' | 'plan'
  model?: string | null
  sessionId?: string | null
  turnNumber?: number
  onComplete?: () => void
  provider: TmuxProviderConfig
}

export class ManagedAgentProcess {
  readonly taskId: string
  private _status: TaskStatus = 'pending'

  private readonly prompt: string
  private readonly cwd: string
  private readonly mode: 'default' | 'plan'
  private readonly model: string | null
  private readonly sessionId: string | null
  private readonly turnNumber: number
  private readonly onComplete?: () => void
  private readonly provider: TmuxProviderConfig

  // Set during start()
  private tmuxSession = ''
  private outputFilePath: string | null = null
  private tempFiles: string[] = []

  // Polling state
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private fileOffset = 0
  private lineBuffer = ''
  private startedAt = 0
  private finished = false

  // Pane-mode state
  private promptSent = false
  private lastPaneChangeMs = 0

  // Pane poll state
  private previousPane = ''
  private pendingTuiQuestionId: string | null = null
  private panePollCountdown = 0

  // Question tracking
  private readonly questionResponders = new Map<string, (answer: string) => void | Promise<void>>()
  private readonly questionDetails = new Map<string, TaskQuestion>()
  private readonly seenFileTouches = new Set<string>()

  private readonly adapter: TaskStreamAdapter | null

  constructor(opts: ManagedAgentProcessOptions) {
    this.taskId = opts.taskId
    this.prompt = opts.prompt
    this.cwd = opts.cwd ?? process.env.POCKETDEV_PROJECT_DIR ?? process.env.HOME ?? '/'
    this.mode = opts.mode
    this.model = opts.model ?? null
    this.sessionId = opts.sessionId ?? null
    this.turnNumber = opts.turnNumber ?? 1
    this.onComplete = opts.onComplete
    this.provider = opts.provider

    this.adapter = opts.provider.createAdapter
      ? opts.provider.createAdapter(
          this.taskId,
          {
            emitOutput: (line) => this.broadcastOutput(line),
            emitActivity: (activity) => this.broadcastActivity(activity),
            emitQuestion: (question, onAnswer) => this.registerQuestion(question, onAnswer),
            emitPermissionRequest: (denials) => this.broadcastPermissionRequest(denials),
            updateSessionId: (id) => this.persistSessionId(id),
            recordCollectedToolUse: (toolUse) => this.recordCollectedToolUse(toolUse),
          },
          (data) => this.sendToTmux(data),
        )
      : null
  }

  get status(): TaskStatus {
    return this._status
  }

  getPendingQuestions(): TaskQuestion[] {
    return [...this.questionDetails.values()].filter((q) => this.questionResponders.has(q.questionId))
  }

  async answerQuestion(questionId: string, answer: string) {
    const responder = this.questionResponders.get(questionId)
    if (responder) {
      this.questionResponders.delete(questionId)
      this.questionDetails.delete(questionId)
      try {
        await responder(answer)
      } catch (err) {
        console.error(`[managed-agent] Failed to answer question ${questionId}:`, err)
      }
      return
    }
    // Fallback: send raw input to tmux
    this.sendToTmux(`${answer}\n`)
  }

  sendInput(data: string) {
    this.sendToTmux(data)
  }

  private sendToTmux(data: string) {
    if (this._status !== 'running') return
    const stripped = data.replace(/\n$/, '')
    if (!stripped) return
    // Single-char answers (digits/y/n): send as direct keystroke; longer text: use -l literal mode
    if (stripped.length === 1) {
      void exec(`tmux send-keys -t ${this.tmuxSession} ${shellEscape(stripped)} Enter`)
    } else {
      void exec(`tmux send-keys -t ${this.tmuxSession} -l ${shellEscape(stripped)} && tmux send-keys -t ${this.tmuxSession} Enter`)
    }
  }

  async start() {
    this.setStatus('running')
    this.startedAt = Date.now()
    this.lastPaneChangeMs = Date.now()

    if (this.turnNumber > 1) {
      broadcast(makeMessage('task.turn_started', { taskId: this.taskId, turnNumber: this.turnNumber }))
    }

    // Use a provider-aware session name prefix
    const sessionPrefix = this.adapter ? 'pocketdev-claude' : 'pocketdev-task'
    this.tmuxSession = `${sessionPrefix}-${this.taskId.slice(0, 8)}`

    // Kill any leftover session
    await exec(`tmux kill-session -t ${this.tmuxSession} 2>/dev/null`)

    // Run provider setup
    const setupResult = await this.provider.setup({
      taskId: this.taskId,
      prompt: this.prompt,
      cwd: this.cwd,
      model: this.model,
      mode: this.mode,
      sessionId: this.sessionId,
      turnNumber: this.turnNumber,
    })

    this.outputFilePath = setupResult.outputFilePath ?? null
    this.tempFiles = setupResult.tempFiles ?? []

    // Launch in tmux
    const { exitCode } = await exec(
      `tmux new-session -d -s ${this.tmuxSession} -x ${this.provider.tmuxWidth} -y ${this.provider.tmuxHeight} ${shellEscape(setupResult.command)}`,
    )

    if (exitCode !== 0) {
      this.broadcastOutput('[agent] Failed to start tmux session')
      this.finish('failed')
      return
    }

    const permTag = this.outputFilePath ? `permission-mode: ${this.mode}` : `model: ${this.model ?? 'default'}`
    console.log(`[managed-agent] Started tmux session ${this.tmuxSession} for task ${this.taskId}`)
    this.broadcastOutput(`[system] Session started — ${permTag}`)
    this.schedulePoll()
  }

  kill() {
    if (this._status !== 'running') return
    this.cleanup()
    this.finish('killed')
  }

  private schedulePoll() {
    this.pollTimer = setTimeout(() => void this.poll(), this.provider.pollIntervalMs)
  }

  private async poll() {
    if (this._status !== 'running' || this.finished) return

    // ── FILE MODE: poll JSONL output + session exit ──────────────────────────
    if (this.outputFilePath) {
      let fileText = ''
      try {
        fileText = await Bun.file(this.outputFilePath).text()
      } catch { /* file not created yet */ }

      const newContent = fileText.slice(this.fileOffset)
      if (newContent.length > 0) {
        this.fileOffset = fileText.length
        this.processChunk(newContent)
      }

      // Check if session still alive (file mode: exit = completion)
      const { exitCode: sessionExists } = await exec(`tmux has-session -t ${this.tmuxSession} 2>/dev/null`)
      if (sessionExists !== 0) {
        // Drain any remaining buffered content
        if (this.lineBuffer.trim()) {
          this.handleLine(this.lineBuffer)
          this.lineBuffer = ''
        }
        try {
          const finalText = await Bun.file(this.outputFilePath).text()
          const remaining = finalText.slice(this.fileOffset)
          if (remaining.trim()) this.processChunk(remaining)
        } catch { /* ignore */ }

        const exitText = await exec(`cat ${shellEscape(this.outputFilePath)} | tail -1`).then((r) => r.stdout).catch(() => '')
        const isError = exitText.includes('[error]') || exitText.includes('error')

        console.log(`[managed-agent] Session ${this.tmuxSession} exited for task ${this.taskId}`)
        this.cleanup()
        this.finish(isError ? 'failed' : 'completed')
        return
      }

      // Startup timeout (wait for first bytes)
      if (!this.fileOffset && Date.now() - this.startedAt > this.provider.startupTimeoutMs) {
        this.broadcastOutput('[error] Agent startup timed out')
        this.cleanup()
        this.finish('failed')
        return
      }
    }

    // ── PANE MODE: startup timeout ───────────────────────────────────────────
    if (!this.outputFilePath && !this.promptSent && Date.now() - this.startedAt > this.provider.startupTimeoutMs) {
      this.broadcastOutput('[error] Agent startup timed out')
      this.cleanup()
      this.finish('failed')
      return
    }

    // ── BOTH MODES: pane poll ────────────────────────────────────────────────
    this.panePollCountdown--
    if (this.panePollCountdown <= 0) {
      this.panePollCountdown = this.provider.panePollEvery
      await this.pollPane()
      if (this.finished) return
    }

    this.schedulePoll()
  }

  private async pollPane() {
    if (this._status !== 'running' || this.finished) return

    const { stdout: paneContent, exitCode } = await exec(
      `tmux capture-pane -t ${this.tmuxSession} -p 2>/dev/null`,
    )

    if (exitCode !== 0) {
      if (!this.outputFilePath) {
        // Pane mode: session gone unexpectedly = failure
        this.broadcastOutput('[agent] tmux session exited unexpectedly')
        this.finish('failed')
      }
      // File mode: session exit is handled in poll() — just return here
      return
    }

    const normalized = normalizePane(paneContent)
    if (normalized === this.previousPane) return

    const previous = this.previousPane
    this.previousPane = normalized
    this.lastPaneChangeMs = Date.now()

    // Pane mode: emit new visible content as output lines
    if (!this.outputFilePath) {
      const diff = this.extractPaneDiff(previous, normalized)
      if (diff) {
        for (const line of diff.split('\n')) {
          if (line.trim()) {
            insertTaskLog(this.taskId, 'stdout', line)
            this.broadcastOutput(line)
          }
        }
      }
    }

    // Call provider snapshot handler
    const paneCtx: PaneCtx = {
      taskId: this.taskId,
      prompt: this.prompt,
      tmuxSession: this.tmuxSession,
      promptSent: this.promptSent,
      lastChangeMs: Date.now() - this.lastPaneChangeMs,
      registerQuestion: (q, onAnswer) => this.registerQuestion(q, onAnswer),
      broadcastOutput: (line) => this.broadcastOutput(line),
      sendToTmux: (data) => this.sendToTmux(data),
    }

    const action = await Promise.resolve(this.provider.onPaneSnapshot(normalized, paneCtx))

    switch (action.type) {
      case 'continue':
        if (action.markPromptSent) this.promptSent = true
        // If we had a pending question but provider no longer sees a TUI prompt, clear it
        if (this.pendingTuiQuestionId) this.pendingTuiQuestionId = null
        break

      case 'complete':
        this.cleanup()
        this.finish(action.status)
        return

      case 'send':
        if (action.literal) {
          void exec(`tmux send-keys -t ${this.tmuxSession} -l ${shellEscape(action.keys)} && tmux send-keys -t ${this.tmuxSession} Enter`)
        } else {
          this.sendToTmux(action.keys)
        }
        break

      case 'question':
        if (!this.pendingTuiQuestionId) {
          this.pendingTuiQuestionId = action.question.questionId
          this.broadcastOutput(`[system] Waiting for user approval: ${action.question.prompt}`)
          this.registerQuestion(action.question, (answer) => {
            this.pendingTuiQuestionId = null
            action.onAnswer(answer)
          })
        }
        break
    }
  }

  private extractPaneDiff(previous: string, current: string): string | null {
    if (!previous) return current
    if (current.startsWith(previous)) {
      const diff = current.slice(previous.length).trim()
      return diff || null
    }
    // TUI screen redraw — return full current content
    return current
  }

  private processChunk(chunk: string) {
    const lines = (this.lineBuffer + chunk).split('\n')
    this.lineBuffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      this.handleLine(line)
    }
  }

  private handleLine(line: string) {
    const port = detectDevServerPort(line)
    if (port) setDevServerPort(port)
    insertTaskLog(this.taskId, 'stdout', line)
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>
      if (this.adapter?.handleJsonMessage(parsed)) return
    } catch { /* not JSON */ }
    this.broadcastOutput(line)
  }

  private broadcastOutput(line: string, stream: 'stdout' | 'stderr' = 'stdout') {
    broadcast(makeMessage('task.output', { taskId: this.taskId, stream, line }))
  }

  private broadcastActivity(activity: TaskActivity) {
    broadcast(makeMessage('task.activity', { taskId: this.taskId, activity, timestamp: Date.now() }))
  }

  private broadcastPermissionRequest(denials: PermissionDenial[]) {
    broadcast(makeMessage('task.permission_request', { taskId: this.taskId, denials }))
  }

  private registerQuestion(question: TaskQuestion, onAnswer: (answer: string) => void | Promise<void>) {
    this.questionResponders.set(question.questionId, onAnswer)
    this.questionDetails.set(question.questionId, question)
    broadcast(makeMessage('task.question', question))
  }

  private setStatus(status: TaskStatus, exitCode?: number) {
    this._status = status
    updateTaskStatus(this.taskId, status, exitCode)
    broadcast(makeMessage('task.status_changed', { taskId: this.taskId, status }))
  }

  private finish(status: 'completed' | 'failed' | 'killed') {
    if (this.finished) return
    this.finished = true

    this.questionResponders.clear()
    this.questionDetails.clear()

    const exitCode = status === 'completed' ? 0 : status === 'killed' ? -1 : 1
    this.setStatus(status, exitCode)

    // Give provider a chance to persist data (turn recording, plan creation)
    this.provider.onFinish?.({ status, adapter: this.adapter, turnNumber: this.turnNumber }, this.taskId)

    broadcast(makeMessage('task.completed', { taskId: this.taskId, exitCode, status }))

    // Clean up temp files after a short delay
    if (this.tempFiles.length > 0) {
      setTimeout(() => {
        void exec(`rm -f ${this.tempFiles.map(shellEscape).join(' ')}`)
      }, 5_000)
    }

    this.onComplete?.()
  }

  private cleanup() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    void exec(`tmux kill-session -t ${this.tmuxSession} 2>/dev/null`)
  }

  private persistSessionId(sessionId: string) {
    try {
      getDb()
        .update(schema.tasks)
        .set({ sessionId })
        .where(eq(schema.tasks.id, this.taskId))
        .run()
      console.log(`[managed-agent] Captured session_id=${sessionId} for task ${this.taskId}`)
    } catch (err) {
      console.error(`[managed-agent] Failed to save session_id for task ${this.taskId}:`, err)
    }
  }

  private recordCollectedToolUse(toolUse: CollectedToolUse) {
    const filePath = (toolUse.input.file_path ?? toolUse.input.path) as string | undefined
    if (!filePath) return

    let action: string
    switch (toolUse.name) {
      case 'Edit': case 'apply_patch': action = 'edit'; break
      case 'Write': action = 'create'; break
      case 'Read': action = 'read'; break
      case 'Glob': case 'Grep': case 'search': case 'list_files': action = 'search'; break
      default: return
    }

    const key = `${action}:${filePath}`
    if (this.seenFileTouches.has(key)) return
    this.seenFileTouches.add(key)

    try {
      insertTaskFileTouch(this.taskId, filePath, action, this.turnNumber)
    } catch (err) {
      console.error(`[managed-agent] Failed to record file touch:`, err)
    }
  }
}
