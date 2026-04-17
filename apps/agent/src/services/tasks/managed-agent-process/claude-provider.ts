import type { PlanQuestion, PlanStep } from '@pocketdev/shared/types'
import { getToolPath, insertTaskTurn } from '../../../db/index.ts'
import { proposePlan } from '../plan-manager.ts'
import type { CollectedToolUse, TaskStreamAdapter } from '../task-stream-adapters.ts'
import { shellEscape, exec, newUUID } from './utils.ts'
import { parseTuiPrompt } from './tui-prompt.ts'
import type { AgentProviderConfig, SetupCtx, PaneCtx, FinishCtx } from './types.ts'

// ── Completion / ready signals ────────────────────────────────────────────────

const CLAUDE_READY_PATTERNS = [
  /Claude Code v\d+\.\d+/,
]

// How long the pane must be stable post-prompt before idle-completion fallback fires.
// The Stop hook fires first in normal cases; this is a last-resort fallback.
const CLAUDE_IDLE_TIMEOUT_MS = 120_000

const CONTEXT_LIMIT_PATTERN = /context window.*(?:full|limit|approaching|at \d{2,3}%)|use \/compact|run \/compact/i

// "✻ Worked for 2m 46s" — fastest completion signal, fires before the 120s idle fallback.
const WORKED_FOR_PATTERN = /\bWorked\s+for\s+[\d]+[hms]/i

function isClaudeReady(normalized: string): boolean {
  return CLAUDE_READY_PATTERNS.some((p) => p.test(normalized))
}

// ── Plan creation ─────────────────────────────────────────────────────────────

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

  console.log(`[claude-provider] Creating plan from ${steps.length} tool uses for task ${taskId}`)
  proposePlan(taskId, title, description, 'Claude', steps, questions)
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function claudeProviderConfig(): AgentProviderConfig {
  let taskMode: 'default' | 'plan' = 'default'
  let contextLimitWarned = false

  return {
    pollIntervalMs: 250,
    startupTimeoutMs: 60_000,
    ptyWidth: 220,
    ptyHeight: 50,

    async setup(ctx: SetupCtx) {
      taskMode = ctx.mode
      const permissionMode = ctx.mode === 'plan' ? 'plan' : 'default'

      const hooksFilePath = `/tmp/pocketdev-events-${ctx.taskId}.jsonl`
      const hooksSettingsPath = `/tmp/pocketdev-hooks-${ctx.taskId}.json`
      const scriptPath = `/tmp/pocketdev-run-${ctx.taskId}.sh`

      await Bun.write(hooksFilePath, '')

      // Hook command: append hook JSON payload as a JSONL line.
      // No stdout redirect — keeps process.stdout.isTTY true so Claude renders its TUI.
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
        shellEscape(claudePath),
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
        tempFiles: [scriptPath, hooksSettingsPath, hooksFilePath],
      }
    },

    async onPaneSnapshot(snapshot: string, ctx: PaneCtx) {
      if (!ctx.promptSent && isClaudeReady(snapshot)) {
        return { type: 'continue', markPromptSent: true }
      }

      // Auto-accept workspace trust dialog
      if (/Quick\s*safety\s*check|Is\s*this\s*a\s*project\s*you\s*created/i.test(snapshot)) {
        ctx.sendRaw('\r')
        return { type: 'continue' }
      }

      const tuiPrompt = parseTuiPrompt(snapshot)

      // Fast completion: "Worked for Xm Xs"
      if (ctx.promptSent && !tuiPrompt) {
        const workedMatch = snapshot.match(WORKED_FOR_PATTERN)
        if (workedMatch) {
          ctx.broadcastOutput(`[claude] ${workedMatch[0]}`)
          return { type: 'complete', status: 'completed' }
        }
      }

      // Context limit warning
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
            if (answer === 'yes') ctx.sendLine('/compact')
          },
        }
      }

      // Idle completion fallback
      if (ctx.promptSent && !tuiPrompt && ctx.lastChangeMs > CLAUDE_IDLE_TIMEOUT_MS) {
        ctx.broadcastOutput('[claude] Task complete (idle)')
        return { type: 'complete', status: 'completed' }
      }

      if (!tuiPrompt) return { type: 'continue' }

      // TUI permission/question menu
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
          const optionIndex = Math.max(0, parseInt(answer, 10) - 1)
          ctx.sendMenuSelection(optionIndex)
        },
      }
    },

    onFinish(finishCtx: FinishCtx, taskId: string) {
      const { adapter, turnNumber, status } = finishCtx
      if (!adapter) return

      const collectedText = adapter.getCollectedText().trim()
      if (collectedText) {
        try {
          insertTaskTurn(crypto.randomUUID(), taskId, turnNumber, 'assistant', collectedText)
        } catch (err) {
          console.error(`[claude-provider] Failed to save assistant turn for task ${taskId}:`, err)
        }
      }

      if (status !== 'killed') {
        createClaudePlan(taskId, adapter, taskMode)
      }
    },
  }
}
