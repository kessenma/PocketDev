/**
 * ManagedClaudeProcess
 *
 * Runs the Claude CLI inside a tmux session so it gets a real PTY. This is
 * necessary for --permission-mode default: Claude actually pauses on stdin
 * waiting for 'y'/'n' before executing tools. With Bun.spawn + piped stdin
 * (no TTY) Claude never truly pauses — it auto-denies or ignores the prompt.
 *
 * Strategy:
 *   1. Write the prompt to a temp file (avoids shell-escaping a long prompt).
 *   2. Write a wrapper bash script that reads the prompt and runs Claude,
 *      redirecting stream-json stdout to a JSONL output file.
 *   3. Launch that script in a tmux session (gives Claude a real TTY for stdin).
 *   4. Poll the JSONL file for new lines and feed them to ClaudeTaskStreamAdapter.
 *   5. Answer permission prompts via `tmux send-keys` which writes to Claude's stdin.
 *   6. Detect completion when the tmux session exits.
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
} from '../db/index.ts'
import { proposePlan } from './plan-manager.ts'
import { detectDevServerPort, setDevServerPort } from './proxy.ts'
import { createTaskStreamAdapter, type CollectedToolUse, type PermissionDenial } from './task-stream-adapters.ts'
import { broadcast, makeMessage } from './ws.ts'

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

const POLL_INTERVAL_MS = 250
const STARTUP_TIMEOUT_MS = 60_000

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

// Shared plan-step conversion logic (mirrors ManagedProcess)
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

export interface ManagedClaudeProcessOptions {
  taskId: string
  prompt: string
  cwd: string | null
  mode: 'default' | 'plan'
  model?: string | null
  /** Pass sessionId for new tasks (--session-id). Pass it alongside turnNumber > 1 for continuations (--resume). */
  sessionId?: string | null
  turnNumber?: number
  onComplete?: () => void
}

export class ManagedClaudeProcess {
  readonly taskId: string
  private _status: TaskStatus = 'pending'

  private readonly prompt: string
  private readonly cwd: string
  private readonly mode: 'default' | 'plan'
  private readonly model: string | null
  private readonly sessionId: string | null
  private readonly turnNumber: number
  private readonly onComplete?: () => void

  // Tmux + temp file paths
  private readonly tmuxSession: string
  private readonly outputPath: string
  private readonly scriptPath: string
  private readonly promptPath: string

  // Polling state
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private fileOffset = 0
  private lineBuffer = ''
  private startedAt = 0
  private finished = false

  // Question tracking
  private readonly questionResponders = new Map<string, (answer: string) => void | Promise<void>>()
  private readonly questionDetails = new Map<string, TaskQuestion>()
  private readonly seenFileTouches = new Set<string>()

  private readonly adapter

  constructor(opts: ManagedClaudeProcessOptions) {
    this.taskId = opts.taskId
    this.prompt = opts.prompt
    this.cwd = opts.cwd ?? process.env.POCKETDEV_PROJECT_DIR ?? process.env.HOME ?? '/'
    this.mode = opts.mode
    this.model = opts.model ?? null
    this.sessionId = opts.sessionId ?? null
    this.turnNumber = opts.turnNumber ?? 1
    this.onComplete = opts.onComplete

    this.tmuxSession = `pocketdev-claude-${opts.taskId.slice(0, 8)}`
    this.outputPath = `/tmp/pocketdev-out-${opts.taskId}.jsonl`
    this.scriptPath = `/tmp/pocketdev-run-${opts.taskId}.sh`
    this.promptPath = `/tmp/pocketdev-prompt-${opts.taskId}.txt`

    // createTaskStreamAdapter returns non-null for 'claude' — safe to assert
    this.adapter = createTaskStreamAdapter({
      agentType: 'claude',
      taskId: this.taskId,
      sink: {
        emitOutput: (line) => this.broadcastOutput(line),
        emitActivity: (activity) => this.broadcastActivity(activity),
        emitQuestion: (question, onAnswer) => this.registerQuestion(question, onAnswer),
        emitPermissionRequest: (denials) => this.broadcastPermissionRequest(denials),
        updateSessionId: (id) => this.persistSessionId(id),
        recordCollectedToolUse: (toolUse) => this.recordCollectedToolUse(toolUse),
      },
      // writeStdin → answer via tmux send-keys so Claude's PTY receives it
      writeStdin: (data) => this.sendToTmux(data),
    })!
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
        console.error(`[managed-claude] Failed to answer question ${questionId}:`, err)
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
    // Strip trailing newline and send as Enter keystroke so tmux handles it correctly
    const stripped = data.replace(/\n$/, '')
    if (!stripped) return
    void exec(`tmux send-keys -t ${this.tmuxSession} ${shellEscape(stripped)} Enter`)
  }

  async start() {
    this.setStatus('running')
    this.startedAt = Date.now()

    if (this.turnNumber > 1) {
      broadcast(makeMessage('task.turn_started', { taskId: this.taskId, turnNumber: this.turnNumber }))
    }

    // Kill any leftover session
    await exec(`tmux kill-session -t ${this.tmuxSession} 2>/dev/null`)

    // Build the claude command args
    const claudePath = getToolPath('claude_cli') ?? 'claude'
    const permissionMode = this.mode === 'plan' ? 'plan' : 'default'

    const args: string[] = [
      shellEscape(claudePath),
      '--output-format', 'stream-json',
      '--permission-mode', permissionMode,
      '--verbose',
    ]
    if (this.sessionId) {
      if (this.turnNumber > 1) {
        // Continuation of an existing session
        args.push('--resume', shellEscape(this.sessionId))
      } else {
        // New task with explicit session ID
        args.push('--session-id', shellEscape(this.sessionId))
      }
    }
    if (this.model) args.push('--model', shellEscape(this.model))
    args.push('-p', '"$POCKETDEV_PROMPT"')

    // Write prompt to a temp file to avoid shell quoting issues
    await Bun.write(this.promptPath, this.prompt)

    // Write the runner script
    const script = [
      '#!/bin/bash',
      `export POCKETDEV_PROMPT=$(cat ${shellEscape(this.promptPath)})`,
      `cd ${shellEscape(this.cwd)}`,
      `${args.join(' ')} >> ${shellEscape(this.outputPath)} 2>&1`,
    ].join('\n')
    await Bun.write(this.scriptPath, script)
    await exec(`chmod +x ${shellEscape(this.scriptPath)}`)

    // Clear output file
    await Bun.write(this.outputPath, '')

    // Launch in tmux
    const { exitCode } = await exec(
      `tmux new-session -d -s ${this.tmuxSession} -x 220 -y 50 ${shellEscape(this.scriptPath)}`,
    )

    if (exitCode !== 0) {
      this.broadcastOutput('[claude] Failed to start tmux session')
      this.finish('failed')
      return
    }

    console.log(`[managed-claude] Started tmux session ${this.tmuxSession} for task ${this.taskId}`)
    this.broadcastOutput(`[system] Session started — permission-mode: ${permissionMode}`)
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
    if (this._status !== 'running' || this.finished) return

    // Read new content from output file
    let fileText = ''
    try {
      fileText = await Bun.file(this.outputPath).text()
    } catch {
      // File not created yet — keep polling
    }

    const newContent = fileText.slice(this.fileOffset)
    if (newContent.length > 0) {
      this.fileOffset = fileText.length
      this.processChunk(newContent)
    }

    // Check if tmux session still alive
    const { exitCode: sessionExists } = await exec(`tmux has-session -t ${this.tmuxSession} 2>/dev/null`)

    if (sessionExists !== 0) {
      // Session exited — process any remaining buffered content
      if (this.lineBuffer.trim()) {
        this.handleLine(this.lineBuffer)
        this.lineBuffer = ''
      }
      // Re-read file one last time for any tail content
      try {
        const finalText = await Bun.file(this.outputPath).text()
        const remaining = finalText.slice(this.fileOffset)
        if (remaining.trim()) this.processChunk(remaining)
      } catch { /* ignore */ }

      const exitText = await exec(`cat ${shellEscape(this.outputPath)} | tail -1`).then((r) => r.stdout).catch(() => '')
      const isError = exitText.includes('[error]') || exitText.includes('error')

      console.log(`[managed-claude] Session ${this.tmuxSession} exited for task ${this.taskId}`)
      this.cleanup()
      this.finish(isError ? 'failed' : 'completed')
      return
    }

    // Startup timeout
    if (!this.fileOffset && Date.now() - this.startedAt > STARTUP_TIMEOUT_MS) {
      this.broadcastOutput('[error] Claude startup timed out')
      this.cleanup()
      this.finish('failed')
      return
    }

    this.schedulePoll()
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
      if (this.adapter.handleJsonMessage(parsed)) return
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

    // Persist final assistant text as a turn
    const collectedText = this.adapter.getCollectedText().trim()
    if (collectedText) {
      try {
        insertTaskTurn(crypto.randomUUID(), this.taskId, this.turnNumber, 'assistant', collectedText)
      } catch (err) {
        console.error(`[managed-claude] Failed to save assistant turn for task ${this.taskId}:`, err)
      }
    }

    broadcast(makeMessage('task.completed', { taskId: this.taskId, exitCode, status }))

    if (this.mode === 'plan' && this.adapter.getCollectedToolUses().length > 0) {
      this.createPlanFromToolUses()
    }

    // Clean up temp files after a short delay
    setTimeout(() => {
      void exec(`rm -f ${shellEscape(this.outputPath)} ${shellEscape(this.scriptPath)} ${shellEscape(this.promptPath)}`)
    }, 5_000)

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
      console.log(`[managed-claude] Captured session_id=${sessionId} for task ${this.taskId}`)
    } catch (err) {
      console.error(`[managed-claude] Failed to save session_id for task ${this.taskId}:`, err)
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
      console.error(`[managed-claude] Failed to record file touch:`, err)
    }
  }

  private createPlanFromToolUses() {
    const collectedToolUses = this.adapter.getCollectedToolUses()
    const actionableTools = collectedToolUses.filter((tool) => !['Read', 'Glob', 'Grep', 'TodoWrite', 'update_plan'].includes(tool.name))
    const steps: PlanStep[] = collectedToolUses.map(toolUseToPlanStep)

    const collectedText = this.adapter.getCollectedText().trim()
    const collectedThinking = this.adapter.getCollectedThinking().trim()
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

    console.log(`[managed-claude] Creating plan from ${steps.length} tool uses for task ${this.taskId}`)
    proposePlan(this.taskId, title, description, 'Claude', steps, questions)
  }
}
