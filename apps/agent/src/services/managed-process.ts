import type { Subprocess } from 'bun'
import type { PlanQuestion, PlanStep, TaskActivity, TaskQuestion } from '@pocketdev/shared/types'
import { eq } from 'drizzle-orm'
import { getDb, insertTaskFileTouch, insertTaskLog, insertTaskTurn, schema, updateTaskStatus } from '../db/index.ts'
import { proposePlan } from './plan-manager.ts'
import { detectDevServerPort, setDevServerPort } from './proxy.ts'
import { createTaskStreamAdapter, type CollectedToolUse, type PermissionDenial } from './task-stream-adapters.ts'
import { broadcast, makeMessage } from './ws.ts'

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

function toolUseToPlanStep(tool: CollectedToolUse): PlanStep {
  const base = { id: tool.id, completed: false }
  const name = tool.name
  const input = tool.input

  if (name === 'Edit' || name === 'apply_patch') {
    return {
      ...base,
      kind: 'modify',
      title: `Edit ${String(input.file_path ?? input.path ?? 'file')}`,
      description: '',
      filePath: (input.file_path ?? input.path) as string | undefined,
    }
  }

  if (name === 'Write') {
    return {
      ...base,
      kind: 'create',
      title: `Create ${String(input.file_path ?? 'file')}`,
      description: '',
      filePath: input.file_path as string | undefined,
    }
  }

  if (name === 'Bash' || name === 'exec_command') {
    const cmd = (input.command as string) ?? ''
    return {
      ...base,
      kind: 'run',
      title: 'Run command',
      description: cmd.length > 200 ? `${cmd.slice(0, 200)}...` : cmd,
    }
  }

  if (name === 'Read' || name === 'Glob' || name === 'Grep' || name === 'search' || name === 'list_files') {
    const target = (input.file_path ?? input.pattern ?? input.path ?? '') as string
    return { ...base, kind: 'note', title: `${name}: ${target}`, description: '' }
  }

  if (name === 'Agent' || name === 'spawn_agent') {
    return {
      ...base,
      kind: 'note',
      title: `Agent: ${(input.description as string) ?? ''}`,
      description: ((input.prompt ?? input.instructions) as string | undefined)?.slice(0, 200) ?? '',
    }
  }

  if (name === 'update_plan') {
    return {
      ...base,
      kind: 'note',
      title: 'Update plan',
      description: JSON.stringify(input).slice(0, 200),
    }
  }

  return { ...base, kind: 'note', title: `${name}`, description: JSON.stringify(input).slice(0, 200) }
}

export interface ManagedProcessOptions {
  taskId: string
  command: string[]
  cwd: string | null
  mode: 'default' | 'plan'
  agentType: string
  turnNumber?: number
  onComplete?: () => void
}

export class ManagedProcess {
  readonly taskId: string
  private proc: Subprocess | null = null
  private _status: TaskStatus = 'pending'
  private killTimer: ReturnType<typeof setTimeout> | null = null
  private readonly mode: 'default' | 'plan'
  private readonly agentType: string
  private readonly seenFileTouches = new Set<string>()
  private readonly command: string[]
  private readonly cwd: string | null
  private readonly turnNumber: number
  private readonly onComplete?: () => void
  private readonly questionResponders = new Map<string, (answer: string) => void | Promise<void>>()
  private readonly adapter

  constructor(opts: ManagedProcessOptions) {
    this.taskId = opts.taskId
    this.command = opts.command
    this.cwd = opts.cwd
    this.mode = opts.mode
    this.agentType = opts.agentType
    this.turnNumber = opts.turnNumber ?? 1
    this.onComplete = opts.onComplete
    this.adapter = createTaskStreamAdapter({
      agentType: this.agentType,
      taskId: this.taskId,
      sink: {
        emitOutput: (line) => this.broadcastOutput(line),
        emitActivity: (activity) => this.broadcastActivity(activity),
        emitQuestion: (question, onAnswer) => this.registerQuestion(question, onAnswer),
        emitPermissionRequest: (denials) => this.broadcastPermissionRequest(denials),
        updateSessionId: (sessionId) => this.persistSessionId(sessionId),
        recordCollectedToolUse: (toolUse) => this.recordCollectedToolUse(toolUse),
      },
      writeStdin: (data) => this.sendInput(data),
    })
  }

  get status(): TaskStatus {
    return this._status
  }

  sendInput(data: string) {
    if (!this.proc || this._status !== 'running') return
    const stdin = this.proc.stdin
    if (!stdin || typeof stdin === 'number') return
    try {
      stdin.write(new TextEncoder().encode(data))
    } catch (err) {
      console.error(`Error writing stdin for task ${this.taskId}:`, err)
    }
  }

  async answerQuestion(questionId: string, answer: string) {
    const responder = this.questionResponders.get(questionId)
    if (responder) {
      try {
        await responder(answer)
      } catch (err) {
        console.error(`[managed-process] Failed to answer question ${questionId} for task ${this.taskId}:`, err)
      }
      return
    }

    this.sendInput(`${answer}\n`)
  }

  start() {
    this.setStatus('running')

    if (this.turnNumber > 1) {
      broadcast(makeMessage('task.turn_started', { taskId: this.taskId, turnNumber: this.turnNumber }))
    }

    this.proc = Bun.spawn(this.command, {
      cwd: this.cwd ?? undefined,
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' },
    })

    this.streamLines(this.proc.stdout as ReadableStream<Uint8Array> | null, 'stdout')
    this.streamLines(this.proc.stderr as ReadableStream<Uint8Array> | null, 'stderr')

    this.proc.exited.then((exitCode) => {
      this.killTimer && clearTimeout(this.killTimer)
      this.questionResponders.clear()

      const status: TaskStatus = exitCode === 0 ? 'completed' : 'failed'
      this.setStatus(status, exitCode)

      if (this.adapter?.getCollectedText().trim()) {
        try {
          insertTaskTurn(
            crypto.randomUUID(),
            this.taskId,
            this.turnNumber,
            'assistant',
            this.adapter.getCollectedText().trim(),
          )
        } catch (err) {
          console.error(`[managed-process] Failed to save assistant turn for task ${this.taskId}:`, err)
        }
      }

      broadcast(makeMessage('task.completed', { taskId: this.taskId, exitCode, status }))

      if (this.mode === 'plan' && (this.adapter?.getCollectedToolUses().length ?? 0) > 0) {
        this.createPlanFromToolUses()
      }

      this.onComplete?.()
    })
  }

  kill() {
    if (!this.proc || this._status !== 'running') return

    this.proc.kill('SIGTERM')
    this.killTimer = setTimeout(() => {
      if (this._status === 'running' && this.proc) {
        this.proc.kill('SIGKILL')
      }
    }, 5000)
  }

  private setStatus(status: TaskStatus, exitCode?: number) {
    this._status = status
    updateTaskStatus(this.taskId, status, exitCode)
    broadcast(makeMessage('task.status_changed', { taskId: this.taskId, status }))
  }

  private async streamLines(stream: ReadableStream<Uint8Array> | null, name: 'stdout' | 'stderr') {
    if (!stream) return

    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.length === 0) continue

          const port = detectDevServerPort(line)
          if (port) setDevServerPort(port)

          insertTaskLog(this.taskId, name, line)

          if (name === 'stdout') {
            if (this.handleStdoutJson(line)) continue
          }

          this.broadcastOutput(line, name)
        }
      }

      if (buffer.length > 0) {
        insertTaskLog(this.taskId, name, buffer)
        if (!(name === 'stdout' && this.handleStdoutJson(buffer))) {
          this.broadcastOutput(buffer, name)
        }
      }
    } catch (err) {
      console.error(`Error reading ${name} for task ${this.taskId}:`, err)
    }
  }

  private handleStdoutJson(line: string) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>
      return this.adapter?.handleJsonMessage(parsed) ?? false
    } catch {
      return false
    }
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
    broadcast(makeMessage('task.question', question))
  }

  private persistSessionId(sessionId: string) {
    try {
      getDb()
        .update(schema.tasks)
        .set({ sessionId })
        .where(eq(schema.tasks.id, this.taskId))
        .run()
      console.log(`[managed-process] Captured session_id=${sessionId} for task ${this.taskId}`)
    } catch (err) {
      console.error(`[managed-process] Failed to save session_id for task ${this.taskId}:`, err)
    }
  }

  private recordCollectedToolUse(toolUse: CollectedToolUse) {
    this.recordFileTouch(toolUse.name, toolUse.input)
  }

  private recordFileTouch(toolName: string, input: Record<string, unknown>) {
    const filePath = (input.file_path ?? input.path) as string | undefined
    if (!filePath) return

    let action: string
    switch (toolName) {
      case 'Edit':
      case 'apply_patch':
        action = 'edit'
        break
      case 'Write':
        action = 'create'
        break
      case 'Read':
        action = 'read'
        break
      case 'Glob':
      case 'Grep':
      case 'search':
      case 'list_files':
        action = 'search'
        break
      default:
        return
    }

    const key = `${action}:${filePath}`
    if (this.seenFileTouches.has(key)) return
    this.seenFileTouches.add(key)

    try {
      insertTaskFileTouch(this.taskId, filePath, action, this.turnNumber)
    } catch (err) {
      console.error(`[managed-process] Failed to record file touch for task ${this.taskId}:`, err)
    }
  }

  private createPlanFromToolUses() {
    const collectedToolUses = this.adapter?.getCollectedToolUses() ?? []
    const actionableTools = collectedToolUses.filter((tool) => !['Read', 'Glob', 'Grep', 'TodoWrite', 'update_plan'].includes(tool.name))
    const steps: PlanStep[] = collectedToolUses.map(toolUseToPlanStep)

    const collectedText = this.adapter?.getCollectedText().trim() ?? ''
    const collectedThinking = this.adapter?.getCollectedThinking().trim() ?? ''
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

    const agentName = this.agentType === 'codex' ? 'Codex' : 'Claude'
    console.log(`[managed-process] Creating plan from ${steps.length} tool uses for task ${this.taskId}`)
    proposePlan(this.taskId, title, description, agentName, steps, questions)
  }
}
