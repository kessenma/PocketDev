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
import { ClaudePtyRunner } from './claude-pty-runner.ts'
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
  type CollectedToolUse,
  type PermissionDenial,
  type TaskStreamAdapter,
  type TaskStreamAdapterSink,
  OpenCodeRunAdapter,
} from './task-stream-adapters/index.ts'
import { broadcast, makeMessage, isNoClientConnected } from '../terminal/ws.ts'
import { getDevices } from '../../db/index.ts'
import { sendPush } from '../push/relay-push.ts'

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
  /** Full shell command (or script path) to run */
  command: string
  /** If set, poll this file for output lines (file mode). Omit for pane mode. */
  outputFilePath?: string
  /** If set, poll this file for structured hook events (PreToolUse/PostToolUse/Stop) */
  hooksFilePath?: string
  /** Temp files to delete 5 s after finish */
  tempFiles?: string[]
  /** When true, spawn via node-pty instead of tmux. Used for Claude tasks. */
  usePty?: boolean
}

export interface PaneCtx {
  taskId: string
  /** The task's prompt text — needed by pane-mode providers to send it to the TUI */
  prompt: string
  /** Whether the user's task prompt has been sent to the TUI (pane-mode providers) */
  promptSent: boolean
  /** Milliseconds since the pane content last changed */
  lastChangeMs: number
  registerQuestion(q: TaskQuestion, onAnswer: (a: string) => void): void
  broadcastOutput(line: string): void
  /** Send literal text followed by Enter. Routes to pty.write() or tmux send-keys -l. */
  sendLine(text: string): void
  /** Send raw bytes — ANSI escape sequences, control chars. Routes to pty.write() or tmux key mapping. */
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

// ── Claude pane output → structured activities ────────────────────────────────
// Converts visible Claude TUI lines into TaskActivity events so the mobile app
// can render them with icons/colours instead of raw monospace text.

const SPINNER_CHAR_RE = /^[✽✢✶✻✷✹✺✸*·]\s+/

/** Returns true for TUI chrome that should never be shown in the mobile stream. */
function isPaneChromeOnly(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  if (/^[─━═╌╍]+$/.test(t)) return true          // horizontal separator
  if (/[▛▜]/.test(t)) return true                 // TUI block-draw header chars
  if (/^❯\s*$/.test(t)) return true               // empty input cursor
  if (/^(esc to interrupt|ctrl\+g to edit|\? for shortcuts)\b/i.test(t)) return true
  if (/^\/[^\s]+\/[^\s]*$/.test(t)) return true   // bare cwd path e.g. /PocketDev/repos/…
  return false
}

/** Normalise spinner char so all animation frames of the same message map to one key. */
function spinnerKey(line: string): string {
  return line.trim().replace(SPINNER_CHAR_RE, '⟳ ')
}

type ToolKind = 'read' | 'search' | 'write' | 'create' | 'run' | 'agent' | 'plan' | 'mcp' | 'web' | 'image' | 'info'

function inferToolKindFromName(name: string): ToolKind {
  const n = name.toLowerCase()
  if (n === 'write') return 'write'
  if (n === 'read') return 'read'
  if (n === 'edit' || n === 'multiedit' || n === 'apply_patch') return 'write'
  if (n === 'glob' || n === 'grep' || n.includes('find') || n.includes('search')) return 'search'
  if (n === 'bash' || n.includes('run') || n.includes('exec')) return 'run'
  if (n.includes('agent') || n.includes('task') || n.includes('sub')) return 'agent'
  if (n.includes('todo') || n.includes('plan')) return 'plan'
  if (n.includes('web') || n.includes('browser') || n.includes('fetch')) return 'web'
  if (n.includes('image') || n.includes('screenshot')) return 'image'
  if (n.startsWith('mcp')) return 'mcp'
  return 'info'
}

/** Parse a single visible TUI line into a structured activity, or null if not meaningful. */
function parsePaneLineToActivity(line: string): TaskActivity | null {
  const t = line.trim()
  if (!t) return null

  // Spinner / thinking lines: ✽ Word… (thinking) or ✽ Word…
  // Tool use/result are handled via hooks events — no duplicate parsing here.
  const spinnerMatch = t.match(/^[✽✢✶✻✷✹✺✸*·]\s+(.+?)(\s+\(thinking\))?$/)
  if (spinnerMatch) {
    const msg = spinnerMatch[1]
    return spinnerMatch[2]
      ? { type: 'thinking', provider: 'claude', preview: msg }
      : { type: 'status', provider: 'claude', message: msg }
  }

  // Filter prompt echo (❯ ...), completion/check marks, and the idle cursor (>).
  if (/^[❯✔✓✗⟳]/.test(t) || t === '>') return null
  // Filter indented TUI status lines (progress, sub-task status, auto-updating, etc.)
  if (line.startsWith(' ') || line.startsWith('\t')) return null

  // Plain text lines are Claude's response output.
  return { type: 'text', provider: 'claude', content: t }
}

// ── Claude hook event parsing ─────────────────────────────────────────────────
// Claude Code fires PreToolUse/PostToolUse/Stop hooks via --settings.
// Each hook receives a JSON payload on stdin; we append it + newline to a temp file.
// These give us structured tool_use/tool_result activities without needing --print.

/** Extract a short human-readable detail string from a tool's input object. */
function extractToolDetail(toolName: string, input: Record<string, unknown>): string | undefined {
  const n = toolName.toLowerCase()
  if (n === 'read' || n === 'write' || n === 'edit' || n === 'multiedit') {
    const p = (input.file_path ?? input.path) as string | undefined
    return p ? p.split('/').pop() : undefined
  }
  if (n === 'bash') {
    const cmd = input.command as string | undefined
    return cmd ? cmd.slice(0, 60) : undefined
  }
  if (n === 'glob') return input.pattern as string | undefined
  if (n === 'grep') return (input.pattern ?? input.query) as string | undefined
  const first = Object.values(input).find((v) => typeof v === 'string')
  return typeof first === 'string' ? first.slice(0, 60) : undefined
}

/** Extract a short preview from a tool's response object. */
function extractToolResultPreview(_toolName: string, response: Record<string, unknown>): string | undefined {
  const out = (response.output ?? response.content ?? response.result) as string | undefined
  if (!out) return undefined
  const lines = out.split('\n')
  return lines[0]?.slice(0, 100) + (lines.length > 1 ? ` … (${lines.length} lines)` : '')
}

/** Parse a single hook event JSONL line into a TaskActivity, or null. */
function parseHookEvent(raw: string): { activity: TaskActivity | null; isStop: boolean } {
  let event: Record<string, unknown>
  try { event = JSON.parse(raw) } catch { return { activity: null, isStop: false } }

  // Claude may use camelCase or snake_case depending on version
  const eventName = (event.hook_event_name ?? event.hookEventName) as string | undefined
  const toolName = (event.tool_name ?? event.toolName) as string | undefined
  const toolInput = (event.tool_input ?? event.toolInput) as Record<string, unknown> | undefined
  const toolResponse = (event.tool_response ?? event.toolResponse) as Record<string, unknown> | undefined

  if (eventName === 'Stop') return { activity: null, isStop: true }

  if (eventName === 'PreToolUse' && toolName) {
    // Carry the todos array in metadata for TodoWrite — enables the checklist card + progress bar on mobile.
    const todos = toolName === 'TodoWrite' && Array.isArray(toolInput?.todos) ? toolInput.todos : undefined
    return {
      isStop: false,
      activity: {
        type: 'tool_use',
        provider: 'claude',
        tool: toolName,
        kind: inferToolKindFromName(toolName),
        title: toolName,
        detail: toolInput ? extractToolDetail(toolName, toolInput) : undefined,
        ...(todos ? { metadata: { todos } } : {}),
      },
    }
  }

  if (eventName === 'PostToolUse' && toolName) {
    return {
      isStop: false,
      activity: {
        type: 'tool_result',
        provider: 'claude',
        toolName,
        isError: false,
        preview: (toolResponse ? extractToolResultPreview(toolName, toolResponse) : undefined) ?? '',
      },
    }
  }

  return { activity: null, isStop: false }
}

// ── Claude provider ───────────────────────────────────────────────────────────

interface TuiPrompt {
  prompt: string
  options: Array<{ value: string; label: string }>
}

function parseTuiPrompt(pane: string): TuiPrompt | null {
  // Numbered menu style: ❯ 1. Yes  2. No  (classic Claude permission dialog)
  if (/❯\s*\d+\./.test(pane)) {
    const questionMatch = pane.match(
      /(Do you want to (?:allow|proceed|continue|run)[^\n]*\?|Is this a project[^\n]+\?|Quick safety check[^\n]*|Allow (?:Claude|this)[^\n]*\?|This action requires[^\n]*\?|Would you like to[^\n]*\?)/i,
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

  // Two-button style: "Allow for this session" / "Deny" (newer Claude versions)
  if (/Allow\s+for\s+this\s+session/i.test(pane)) {
    const questionMatch = pane.match(
      /(Do you want to (?:allow|proceed|continue|run)[^\n]*\?|Allow (?:Claude|this)[^\n]*\?|This action requires[^\n]*\?|Would you like to[^\n]*\?)/i,
    )
    const prompt = questionMatch?.[1]?.trim() ?? 'Permission required'
    return {
      prompt,
      options: [
        { value: '1', label: 'Allow for this session' },
        { value: '2', label: 'Deny' },
      ],
    }
  }

  return null
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

// Claude Code TUI ready-state detection.
// Reference: apps/0-examples/claude-code-guide/README.md
// Claude renders a welcome box "╭─── Claude Code v2.x.x ───" immediately on startup.
// That version string is the most reliable early-ready signal.
// If this never fires, the task will time out after startupTimeoutMs (60 s).
const CLAUDE_READY_PATTERNS = [
  /Claude Code v\d+\.\d+/,  // welcome box visible from first startup frame
]

// How long the pane must be stable (post-prompt) before we consider the task complete.
// With hooks enabled, the Stop hook fires first for normal completion — this is a fallback.
const CLAUDE_IDLE_TIMEOUT_MS = 120_000

// Claude prints a warning when the context window is nearly full.
// We surface this as a question so the user can decide to run /compact.
const CONTEXT_LIMIT_PATTERN = /context window.*(?:full|limit|approaching|at \d{2,3}%)|use \/compact|run \/compact/i

// Claude's TUI prints "✻ Worked for 2m 46s" (or similar) on task completion.
// This is the fastest completion signal — fires well before the Stop hook's 120s fallback.
// Reference: apps/0-examples/tmux/codeman (respawn-controller.ts COMPLETION_TIME_PATTERN)
const WORKED_FOR_PATTERN = /\bWorked\s+for\s+[\d]+[hms]/i

function isClaudeReady(normalized: string): boolean {
  return CLAUDE_READY_PATTERNS.some((p) => p.test(normalized))
}

export function claudeProviderConfig(): TmuxProviderConfig {
  // Capture mode in closure so onFinish can use it without adding it to FinishCtx
  let taskMode: 'default' | 'plan' = 'default'
  // Only fire the /compact question once per task
  let contextLimitWarned = false

  return {
    pollIntervalMs: 250,
    panePollEvery: 3,
    startupTimeoutMs: 60_000,
    tmuxWidth: 220,
    tmuxHeight: 50,

    async setup(ctx) {
      taskMode = ctx.mode
      const permissionMode = ctx.mode === 'plan' ? 'plan' : 'default'

      const hooksFilePath = `/tmp/pocketdev-events-${ctx.taskId}.jsonl`
      const hooksSettingsPath = `/tmp/pocketdev-hooks-${ctx.taskId}.json`
      const scriptPath = `/tmp/pocketdev-run-${ctx.taskId}.sh`

      // Empty file so polling doesn't fail before the first hook fires
      await Bun.write(hooksFilePath, '')

      // Hook command: read stdin (the hook JSON payload) and append + newline for valid JSONL.
      // No -p flag, no stdout redirect — full interactive TUI in tmux pane.
      // Redirecting stdout kills process.stdout.isTTY and forces Claude into --print mode.
      const hookCmd = `{ cat; echo; } >> ${shellEscape(hooksFilePath)}`
      await Bun.write(hooksSettingsPath, JSON.stringify({
        hooks: {
          PreToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: hookCmd }] }],
          PostToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: hookCmd }] }],
          Stop: [{ hooks: [{ type: 'command', command: hookCmd }] }],
        },
      }))

      const claudePath = getToolPath('claude_cli') ?? 'claude'
      const args: string[] = [
        claudePath,
        '--permission-mode', permissionMode,
        '--settings', shellEscape(hooksSettingsPath),
      ]
      if (ctx.sessionId) {
        if (ctx.turnNumber > 1) {
          args.push('--resume', shellEscape(ctx.sessionId))
        } else {
          args.push('--session-id', shellEscape(ctx.sessionId))
        }
      }
      if (ctx.model) args.push('--model', shellEscape(ctx.model))
      // Pass prompt directly via -p so Claude starts processing immediately,
      // bypassing the v2.x home screen whose input field doesn't accept programmatic Enter.
      args.push('-p', shellEscape(ctx.prompt))

      const script = [
        '#!/bin/bash',
        'export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"',
        `cd ${shellEscape(ctx.cwd)}`,
        args.join(' '),
      ].join('\n')
      await Bun.write(scriptPath, script)
      await exec(`chmod +x ${shellEscape(scriptPath)}`)

      return {
        command: scriptPath,
        hooksFilePath,
        usePty: true,
        tempFiles: [scriptPath, hooksSettingsPath, hooksFilePath],
      }
    },

    async onPaneSnapshot(snapshot, ctx) {
      // Mark prompt as sent once the TUI is visible. The prompt itself is passed via
      // -p at startup (see setup()), so the TUI starts processing immediately without
      // any typing into the home screen input field.
      if (!ctx.promptSent && isClaudeReady(snapshot)) {
        return { type: 'continue', markPromptSent: true }
      }

      // Auto-accept Claude workspace trust dialog — fires per new directory.
      // The cursor defaults to option 1 (Yes, I trust this folder); Enter confirms.
      if (/Quick\s*safety\s*check|Is\s*this\s*a\s*project\s*you\s*created/i.test(snapshot)) {
        ctx.sendRaw('\r')
        return { type: 'continue' }
      }

      // After prompt sent, check for active TUI menu (permission/question)
      const tuiPrompt = parseTuiPrompt(snapshot)

      // Fast completion signal: Claude prints "Worked for Xm Xs" when a task finishes.
      // This fires well before the 120s idle fallback. The Stop hook covers most cases,
      // but this catches any gap between Stop hook delivery and pane capture.
      if (ctx.promptSent && !tuiPrompt) {
        const workedMatch = snapshot.match(WORKED_FOR_PATTERN)
        if (workedMatch) {
          ctx.broadcastOutput(`[claude] ${workedMatch[0]}`)
          return { type: 'complete', status: 'completed' }
        }
      }

      // Context limit warning: Claude prints a message when context is nearly full.
      // Surface a question so the user can run /compact to free space.
      if (ctx.promptSent && !contextLimitWarned && !tuiPrompt && CONTEXT_LIMIT_PATTERN.test(snapshot)) {
        contextLimitWarned = true
        ctx.broadcastOutput('[claude] Context window approaching limit')
        const questionId = newUUID()
        return {
          type: 'question',
          question: {
            questionId,
            taskId: ctx.taskId,
            provider: 'claude',
            prompt: "Claude's context window is nearly full. Run /compact to summarize and free space?",
            type: 'yes_no',
            options: [{ value: 'yes', label: 'Run /compact' }, { value: 'no', label: 'Skip' }],
          },
          onAnswer: (answer) => {
            if (answer === 'yes') {
              ctx.sendLine('/compact')
            }
          },
        }
      }

      // Idle completion: pane stable for N seconds with no active menu → task done
      if (ctx.promptSent && !tuiPrompt && ctx.lastChangeMs > CLAUDE_IDLE_TIMEOUT_MS) {
        ctx.broadcastOutput('[claude] Task complete (idle)')
        return { type: 'complete', status: 'completed' }
      }

      if (!tuiPrompt) return { type: 'continue' }

      // Handle TUI permission/question menu (❯ 1. Yes  2. No style)
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
          // Claude's ink-select-input menu uses arrow keys to navigate; Enter confirms.
          // The cursor starts at option 1, so navigate Down (answer-1) times then Enter.
          const optionIndex = Math.max(0, parseInt(answer, 10) - 1)
          ctx.sendMenuSelection(optionIndex)
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
        ctx.sendRaw('\x1b[B')  // Down arrow
        await Bun.sleep(300)
        ctx.sendRaw('\r')      // Enter
        return { type: 'continue' }
      }

      // Send prompt when TUI is ready for the first time
      if (!ctx.promptSent && isCopilotReady(snapshot)) {
        ctx.broadcastOutput('[copilot] TUI ready — sending prompt...')
        ctx.sendLine(ctx.prompt)
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

export function opencodeProviderConfig(): TmuxProviderConfig {
  return {
    pollIntervalMs: 500,
    panePollEvery: 4,
    startupTimeoutMs: 120_000,
    tmuxWidth: 220,
    tmuxHeight: 50,

    async setup(ctx) {
      const opencodePath = getToolPath('opencode_cli') ?? 'opencode'
      const outputFile = `/tmp/pocketdev-opencode-${ctx.taskId}.jsonl`
      const modelPart = ctx.model ? `-m ${shellEscape(ctx.model)} ` : ''
      // Redirect JSON events to file; stderr goes to a separate log file so it
      // doesn't corrupt the JSONL stream but is still captured for debugging.
      const stderrFile = `/tmp/pocketdev-opencode-${ctx.taskId}.stderr`
      const command = `${shellEscape(opencodePath)} run --format json ${modelPart}${shellEscape(ctx.prompt)} > ${shellEscape(outputFile)} 2> ${shellEscape(stderrFile)}`
      return { command, outputFilePath: outputFile, tempFiles: [outputFile, stderrFile] }
    },

    createAdapter(taskId, sink, writeStdin) {
      return new OpenCodeRunAdapter({ agentType: 'opencode', taskId, sink, writeStdin })
    },

    onPaneSnapshot(_snapshot, _ctx) {
      // File mode: session exit is handled by poll() when tmux has-session fails.
      return { type: 'continue' }
    },

    onFinish(ctx) {
      // Reuse the adapter's onProcessExit to emit the accumulated text activity.
      if (ctx.status !== 'killed') {
        ctx.adapter?.onProcessExit?.(ctx.status === 'completed' ? 0 : 1)
      }
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
  private hooksFilePath: string | null = null
  private hooksFileOffset = 0
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

  // Pane poll state (tmux / Copilot path)
  private previousPane = ''
  private pendingTuiQuestionId: string | null = null
  private panePollCountdown = 0
  private seenPaneLineKeys = new Set<string>()

  // PTY state (Claude path — node-pty replaces tmux for Claude tasks)
  private ptyRunner: ClaudePtyRunner | null = null
  private ptyBuffer = ''
  private ptyBufferTimer: ReturnType<typeof setTimeout> | null = null
  private lastPtyDataMs = 0
  private readonly PTY_BUFFER_MAX = 50_000  // chars — keep last ~50 KB of output
  private readonly PTY_DEBOUNCE_MS = 150    // ms — wait for output burst to settle

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
            emitOutput:             (line)     => this.broadcastOutput(line),
            emitActivity:           (activity) => this.broadcastActivity(activity),
            emitQuestion:           (question, onAnswer) => this.registerQuestion(question, onAnswer),
            emitPermissionRequest:  (denials)  => this.broadcastPermissionRequest(denials),
            updateSessionId:        (id)       => this.persistSessionId(id),
            recordCollectedToolUse: (toolUse)  => this.recordCollectedToolUse(toolUse),
            signalComplete: () => {
              if (this.finished) return
              this.cleanup()
              this.finish('completed')
            },
          },
          (data) => this.sendToProcess(data),
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
    // Fallback: send raw input to the process
    this.sendToProcess(`${answer}\n`)
  }

  sendInput(data: string) {
    this.sendToProcess(data)
  }

  /** Route process input to PTY (Claude) or tmux (Copilot). */
  private sendToProcess(data: string) {
    if (this._status !== 'running') return
    const stripped = data.replace(/\n$/, '')
    if (!stripped) return
    if (this.ptyRunner) {
      this.ptyRunner.writeLine(stripped)
    } else {
      this.sendToTmux(stripped)
    }
  }

  /** Send to tmux session (Copilot path only). */
  private sendToTmux(data: string) {
    if (this._status !== 'running') return
    const stripped = data.replace(/\n$/, '')
    if (!stripped) return
    // Single-char answers: send as direct keystroke; longer text: use -l literal mode
    if (stripped.length === 1) {
      void exec(`tmux send-keys -t ${this.tmuxSession} ${shellEscape(stripped)} Enter`)
    } else {
      void exec(`tmux send-keys -t ${this.tmuxSession} -l ${shellEscape(stripped)} && tmux send-keys -t ${this.tmuxSession} Enter`)
    }
  }

  /** Send literal text + Enter via tmux (used in Copilot pane ctx). */
  private tmuxSendLine(text: string): void {
    void exec(`tmux send-keys -t ${this.tmuxSession} -l ${shellEscape(text)} && tmux send-keys -t ${this.tmuxSession} Enter`)
  }

  /** Map ANSI bytes to tmux key names (used in Copilot pane ctx). */
  private tmuxSendRaw(bytes: string): void {
    if (bytes === '\r') { void exec(`tmux send-keys -t ${this.tmuxSession} Enter`); return }
    if (bytes === '\x1b[B') { void exec(`tmux send-keys -t ${this.tmuxSession} Down`); return }
    if (bytes === '\x1b[A') { void exec(`tmux send-keys -t ${this.tmuxSession} Up`); return }
    if (bytes === '\x03') { void exec(`tmux send-keys -t ${this.tmuxSession} C-c`); return }
    void exec(`tmux send-keys -t ${this.tmuxSession} -l ${shellEscape(bytes)}`)
  }

  /** Navigate a tmux TUI menu: Down N times then Enter (used in Copilot pane ctx). */
  private tmuxSendMenuSelection(optionIndex: number): void {
    const keys = [...Array(optionIndex).fill('Down'), 'Enter'].join(' ')
    void exec(`tmux send-keys -t ${this.tmuxSession} ${keys}`)
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
    this.hooksFilePath = setupResult.hooksFilePath ?? null
    this.tempFiles = setupResult.tempFiles ?? []

    let useTmux = !setupResult.usePty
    if (setupResult.usePty) {
      this.ptyRunner = new ClaudePtyRunner()
      try {
        await this.ptyRunner.spawn(setupResult.command, {
          cols: this.provider.tmuxWidth,
          rows: this.provider.tmuxHeight,
          cwd: this.cwd,
          env: {
            ...process.env,
            HOME: process.env.HOME ?? '/root',
            TERM: 'xterm-256color',
          } as Record<string, string>,
          onData: (chunk) => this.onPtyData(chunk),
          onExit: (code) => this.onPtyExit(code),
        })
        this.lastPtyDataMs = Date.now()
        const permTag = `permission-mode: ${this.mode}`
        console.log(`[managed-agent] Started PTY process for task ${this.taskId}`)
        this.broadcastOutput(`[system] Session started — ${permTag}`)
      } catch (err) {
        this.broadcastOutput('[error] Failed to start PTY process via Bun.spawn(terminal:) — requires Bun 1.3.5+')
        console.error(`[managed-agent] PTY spawn failed for task ${this.taskId}:`, err)
        this.cleanup()
        this.finish('failed')
        return
      }
    }

    if (useTmux) {
      // ── Tmux path: Copilot and Opencode (usePty not set) ───────────────────────
      const { exitCode } = await exec(
        `tmux new-session -d -s ${this.tmuxSession} -x ${this.provider.tmuxWidth} -y ${this.provider.tmuxHeight} ${shellEscape(setupResult.command)}`,
      )

      if (exitCode !== 0) {
        this.broadcastOutput('[agent] Failed to start tmux session')
        this.finish('failed')
        return
      }

      console.log(`[managed-agent] Started tmux session ${this.tmuxSession} for task ${this.taskId}`)
      this.broadcastOutput(`[system] Session started — model: ${this.model ?? 'default'}`)
    }

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

    // ── PTY PATH (Claude): hooks file polling only — pane capture not used ──
    if (this.ptyRunner) {
      // Poll hooks file for structured events (PreToolUse/PostToolUse/Stop)
      await this.pollHooksFile()
      if (this.finished) return

      // Startup timeout: no PTY data received within the startup window.
      // Keyed off lastPtyDataMs (not promptSent) because Claude is launched with -p so the
      // welcome banner may never appear, keeping promptSent false and killing a live task.
      if (this.lastPtyDataMs === 0 && Date.now() - this.startedAt > this.provider.startupTimeoutMs) {
        this.broadcastOutput('[error] Agent startup timed out')
        this.cleanup()
        this.finish('failed')
        return
      }

      this.schedulePoll()
      return
    }

    // ── TMUX PATH (Copilot): FILE MODE — poll JSONL output + session exit ───
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
        // Plan mode tasks always complete — ExitPlanMode errors are expected in headless mode
        const isError = this.mode !== 'plan' && (exitText.includes('[error]') || exitText.includes('error'))

        const pendingQCount = this.questionResponders.size
        console.log(`[managed-agent] Session ${this.tmuxSession} exited for task ${this.taskId} | pendingQuestions=${pendingQCount} | t=${Date.now()}`)
        if (pendingQCount > 0) {
          console.log(`[managed-agent] ⚠ Session exited WITH ${pendingQCount} unanswered question(s) — mobile may not have rendered them yet`)
          for (const [qid, q] of this.questionDetails) {
            console.log(`[managed-agent]   question ${qid}: type=${q.type} prompt="${q.prompt?.slice(0, 80)}"`)
          }
        }
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

    // ── TMUX PATH: PANE MODE startup timeout ─────────────────────────────────
    if (!this.outputFilePath && !this.promptSent && Date.now() - this.startedAt > this.provider.startupTimeoutMs) {
      this.broadcastOutput('[error] Agent startup timed out')
      this.cleanup()
      this.finish('failed')
      return
    }

    // ── TMUX PATH: pane poll (Copilot) ───────────────────────────────────────
    this.panePollCountdown--
    if (this.panePollCountdown <= 0) {
      this.panePollCountdown = this.provider.panePollEvery
      await this.pollPane()
      if (this.finished) return
    }

    this.schedulePoll()
  }

  private async pollHooksFile() {
    if (!this.hooksFilePath || this.finished) return
    let content: string
    try { content = await Bun.file(this.hooksFilePath).text() } catch { return }
    const newContent = content.slice(this.hooksFileOffset)
    if (!newContent) return
    this.hooksFileOffset = content.length

    for (const line of newContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const { activity, isStop } = parseHookEvent(trimmed)
      // Treat any parsed hook event as liveness — keeps the startup-timeout watchdog
      // in poll() from killing Claude tasks that only emit via hooks (e.g. under -p).
      if (isStop || activity) this.lastPtyDataMs = Date.now()
      if (isStop) {
        if (!this.finished) {
          this.broadcastOutput('[claude] Task complete')
          this.cleanup()
          this.finish('completed')
        }
        return
      }
      if (activity) this.broadcastActivity(activity)
    }
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
    const paneChanged = normalized !== this.previousPane

    if (paneChanged) {
      const previous = this.previousPane
      this.previousPane = normalized
      this.lastPaneChangeMs = Date.now()

      // Pane mode: emit new visible content as filtered, deduplicated output lines + activities
      if (!this.outputFilePath) {
        const diff = this.extractPaneDiff(previous, normalized)
        if (diff) {
          for (const line of diff.split('\n')) {
            if (isPaneChromeOnly(line)) continue
            // Deduplicate: spinner frames change one char but carry the same message
            const key = spinnerKey(line)
            if (this.seenPaneLineKeys.has(key)) continue
            this.seenPaneLineKeys.add(key)

            insertTaskLog(this.taskId, 'stdout', line)
            this.broadcastOutput(line)

            const activity = parsePaneLineToActivity(line)
            if (activity) this.broadcastActivity(activity)
          }
        }
      }
    }

    // Poll hooks AFTER capturing the pane so a Stop hook can't skip the final response.
    // If Stop fires in the same cycle that Claude outputs its response, the pane diff above
    // already captures and emits that text before cleanup() kills the tmux session.
    await this.pollHooksFile()
    if (this._status !== 'running' || this.finished) return

    if (!paneChanged && !this.promptSent) return
    // If pane is stable but prompt has been sent, fall through to onPaneSnapshot
    // so the provider can detect idle completion.

    // Call provider snapshot handler (tmux / Copilot path)
    const paneCtx: PaneCtx = {
      taskId: this.taskId,
      prompt: this.prompt,
      promptSent: this.promptSent,
      lastChangeMs: Date.now() - this.lastPaneChangeMs,
      registerQuestion: (q, onAnswer) => this.registerQuestion(q, onAnswer),
      broadcastOutput: (line) => this.broadcastOutput(line),
      sendLine: (text) => this.tmuxSendLine(text),
      sendRaw: (bytes) => this.tmuxSendRaw(bytes),
      sendMenuSelection: (idx) => this.tmuxSendMenuSelection(idx),
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
          this.tmuxSendLine(action.keys)
        } else {
          this.sendToTmux(action.keys)
        }
        break

      case 'question':
        if (!this.pendingTuiQuestionId) {
          this.pendingTuiQuestionId = action.question.questionId
          this.broadcastOutput(`[system] Waiting for user approval: ${action.question.prompt}`)
          this.registerQuestion(action.question, (answer) => {
            // Do NOT clear pendingTuiQuestionId here. The pane still shows the menu
            // while Claude processes our answer. Clearing early causes another question
            // to be emitted on the next poll cycle. The 'continue' case in pollPane
            // clears it once the menu actually disappears from the pane.
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
    // Persist so TaskStreamer can rehydrate after reload or task completion.
    try { insertTaskLog(this.taskId, 'activity', JSON.stringify(activity)) } catch { /* best-effort */ }
  }

  private broadcastPermissionRequest(denials: PermissionDenial[]) {
    broadcast(makeMessage('task.permission_request', { taskId: this.taskId, denials }))
  }

  private registerQuestion(question: TaskQuestion, onAnswer: (answer: string) => void | Promise<void>) {
    this.questionResponders.set(question.questionId, onAnswer)
    this.questionDetails.set(question.questionId, question)
    console.log(`[managed-agent] ➡ Emitting task.question | taskId=${this.taskId} qId=${question.questionId} type=${question.type} status=${this._status} t=${Date.now()}`)
    broadcast(makeMessage('task.question', question))
    if (isNoClientConnected()) {
      this.pushToAllDevices({
        title: 'Permission Required',
        message: 'Task needs your approval to continue',
        data: { type: 'permission', taskId: this.taskId, questionId: question.questionId },
      })
    }
  }

  private pushToAllDevices(opts: { title: string; message: string; data: Record<string, string> }) {
    for (const device of getDevices()) {
      if (device.apnsToken) {
        void sendPush({
          apnsToken: device.apnsToken,
          title: opts.title,
          message: opts.message,
          data: opts.data,
          deviceId: device.id,
          taskId: opts.data.taskId,
        })
      }
    }
  }

  private setStatus(status: TaskStatus, exitCode?: number) {
    this._status = status
    updateTaskStatus(this.taskId, status, exitCode)
    broadcast(makeMessage('task.status_changed', { taskId: this.taskId, status }))
  }

  private finish(status: 'completed' | 'failed' | 'killed') {
    if (this.finished) return
    this.finished = true
    console.log(`[managed-agent] ➡ Emitting task.status_changed → ${status} | taskId=${this.taskId} pendingQuestions=${this.questionResponders.size} t=${Date.now()}`)

    this.questionResponders.clear()
    this.questionDetails.clear()

    const exitCode = status === 'completed' ? 0 : status === 'killed' ? -1 : 1
    this.setStatus(status, exitCode)

    // Give provider a chance to persist data (turn recording, plan creation)
    this.provider.onFinish?.({ status, adapter: this.adapter, turnNumber: this.turnNumber }, this.taskId)

    broadcast(makeMessage('task.completed', { taskId: this.taskId, exitCode, status }))

    if (status !== 'killed') {
      const shortPrompt = this.prompt.slice(0, 80)
      this.pushToAllDevices({
        title: status === 'completed' ? 'Task Complete' : 'Task Failed',
        message: shortPrompt,
        data: { type: 'task_completed', taskId: this.taskId, status },
      })
    }

    // Clean up temp files after a short delay
    if (this.tempFiles.length > 0) {
      setTimeout(() => {
        void exec(`rm -f ${this.tempFiles.map(shellEscape).join(' ')}`)
      }, 5_000)
    }

    this.onComplete?.()
  }

  // ── PTY path methods (Claude) ──────────────────────────────────────────────

  private onPtyData(chunk: string): void {
    if (this.finished) return
    this.lastPtyDataMs = Date.now()
    // Prompt is passed via -p at spawn; mark sent on first PTY output so idle-completion
    // and context-limit detection (gated on ctx.promptSent) activate without the welcome banner.
    if (!this.promptSent) this.promptSent = true
    this.ptyBuffer += chunk
    // Cap buffer size — keep only the most recent output (older frames are scrolled off)
    if (this.ptyBuffer.length > this.PTY_BUFFER_MAX) {
      this.ptyBuffer = this.ptyBuffer.slice(-this.PTY_BUFFER_MAX)
    }
    // Debounce: wait for burst to settle before running TUI detection
    if (this.ptyBufferTimer) clearTimeout(this.ptyBufferTimer)
    this.ptyBufferTimer = setTimeout(() => void this.processPtySnapshot(), this.PTY_DEBOUNCE_MS)
  }

  private async processPtySnapshot(): Promise<void> {
    if (this.finished || this._status !== 'running' || !this.ptyRunner) return
    this.ptyBufferTimer = null

    const normalized = normalizePane(this.ptyBuffer)
    if (!normalized) return

    // Also poll hooks file on each snapshot cycle (structured events)
    await this.pollHooksFile()
    if (this.finished) return

    const paneCtx: PaneCtx = {
      taskId: this.taskId,
      prompt: this.prompt,
      promptSent: this.promptSent,
      lastChangeMs: Date.now() - this.lastPtyDataMs,
      registerQuestion: (q, onAnswer) => this.registerQuestion(q, onAnswer),
      broadcastOutput: (line) => this.broadcastOutput(line),
      sendLine: (text) => this.ptyRunner?.writeLine(text),
      sendRaw: (bytes) => this.ptyRunner?.writeRaw(bytes),
      sendMenuSelection: (idx) => this.ptyRunner?.sendMenuSelection(idx),
    }

    const action = await Promise.resolve(this.provider.onPaneSnapshot(normalized, paneCtx))

    switch (action.type) {
      case 'continue':
        if (action.markPromptSent) this.promptSent = true
        if (this.pendingTuiQuestionId) this.pendingTuiQuestionId = null
        break

      case 'complete':
        this.cleanup()
        this.finish(action.status)
        return

      case 'send':
        if (this.ptyRunner) {
          if (action.literal) {
            this.ptyRunner.writeLine(action.keys)
          } else {
            this.ptyRunner.writeRaw(action.keys)
          }
        }
        break

      case 'question':
        if (!this.pendingTuiQuestionId) {
          this.pendingTuiQuestionId = action.question.questionId
          this.broadcastOutput(`[system] Waiting for user approval: ${action.question.prompt}`)
          this.registerQuestion(action.question, (answer) => {
            action.onAnswer(answer)
          })
        }
        break
    }
  }

  private onPtyExit(exitCode: number): void {
    if (this.finished) return
    console.log(`[managed-agent] PTY exited for task ${this.taskId} | exitCode=${exitCode} | pendingQuestions=${this.questionResponders.size}`)

    // Cancel debounced snapshot and flush final PTY data
    if (this.ptyBufferTimer) {
      clearTimeout(this.ptyBufferTimer)
      this.ptyBufferTimer = null
    }

    // Final hooks file poll to catch Stop event written just before process exit
    void this.pollHooksFile().then(() => {
      if (!this.finished) {
        // Plan mode always completes; otherwise treat non-zero exit as failure
        const isError = this.mode !== 'plan' && exitCode !== 0

        const pendingQCount = this.questionResponders.size
        if (pendingQCount > 0) {
          console.log(`[managed-agent] ⚠ PTY exited WITH ${pendingQCount} unanswered question(s)`)
          for (const [qid, q] of this.questionDetails) {
            console.log(`[managed-agent]   question ${qid}: type=${q.type} prompt="${q.prompt?.slice(0, 80)}"`)
          }
        }

        this.cleanup()
        this.finish(isError ? 'failed' : 'completed')
      }
    })
  }

  private cleanup() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.ptyBufferTimer) {
      clearTimeout(this.ptyBufferTimer)
      this.ptyBufferTimer = null
    }
    if (this.ptyRunner) {
      this.ptyRunner.kill()
      this.ptyRunner = null
    } else if (this.tmuxSession) {
      void exec(`tmux kill-session -t ${this.tmuxSession} 2>/dev/null`)
    }
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
