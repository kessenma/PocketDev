import type { TaskActivity, TaskQuestion } from '@pocketdev/shared/types'
import { eq } from 'drizzle-orm'
import {
  getDb,
  insertTaskFileTouch,
  insertTaskLog,
  schema,
  updateTaskStatus,
} from '../../../db/index.ts'
import { detectDevServerPort, setDevServerPort } from '../../preview/proxy.ts'
import type { CollectedToolUse, PermissionDenial, TaskStreamAdapter } from '../task-stream-adapters.ts'
import { PtyRunner } from '../pty-runner.ts'
import { broadcast, makeMessage, isNoClientConnected } from '../../terminal/ws.ts'
import { getDevices } from '../../../db/index.ts'
import { sendPush } from '../../push/relay-push.ts'
import { normalizePane } from './utils.ts'
import { parseHookEvent } from './hook-events.ts'
import type { AgentProviderConfig, PaneCtx } from './types.ts'

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

export interface ManagedAgentProcessOptions {
  taskId: string
  prompt: string
  cwd: string | null
  mode: 'default' | 'plan'
  model?: string | null
  sessionId?: string | null
  turnNumber?: number
  onComplete?: () => void
  provider: AgentProviderConfig
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
  private readonly provider: AgentProviderConfig

  // Set during start()
  private hooksFilePath: string | null = null
  private hooksFileOffset = 0
  private tempFiles: string[] = []

  // Polling state
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private startedAt = 0
  private finished = false

  // PTY state
  private ptyRunner: PtyRunner | null = null
  private ptyBuffer = ''
  private ptyBufferTimer: ReturnType<typeof setTimeout> | null = null
  private lastPtyDataMs = 0
  private receivedFirstData = false
  private forwardRawBuffer = ''
  private promptSent = false
  private pendingTuiQuestionId: string | null = null
  private readonly PTY_BUFFER_MAX = 50_000
  private readonly PTY_DEBOUNCE_MS = 150

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
          (data) => this.sendInput(data),
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
    this.sendInput(`${answer}\n`)
  }

  sendInput(data: string) {
    if (this._status !== 'running') return
    const stripped = data.replace(/\n$/, '')
    if (!stripped) return
    this.ptyRunner?.writeLine(stripped)
  }

  async start() {
    this.setStatus('running')
    this.startedAt = Date.now()

    if (this.turnNumber > 1) {
      broadcast(makeMessage('task.turn_started', { taskId: this.taskId, turnNumber: this.turnNumber }))
    }

    const setupResult = await this.provider.setup({
      taskId: this.taskId,
      prompt: this.prompt,
      cwd: this.cwd,
      model: this.model,
      mode: this.mode,
      sessionId: this.sessionId,
      turnNumber: this.turnNumber,
    })

    this.hooksFilePath = setupResult.hooksFilePath ?? null
    this.tempFiles = setupResult.tempFiles ?? []

    this.ptyRunner = new PtyRunner()
    try {
      await this.ptyRunner.spawn(setupResult.command, {
        cols: this.provider.ptyWidth,
        rows: this.provider.ptyHeight,
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
      console.log(`[managed-agent] Started PTY process for task ${this.taskId}`)
      this.broadcastOutput(`[system] Session started — permission-mode: ${this.mode}`)
    } catch (err) {
      console.error(`[managed-agent] Failed to start PTY for task ${this.taskId}:`, err)
      this.broadcastOutput('[error] Failed to start agent process')
      this.finish('failed')
      return
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

    await this.pollHooksFile()
    if (this.finished) return

    // Startup timeout: no PTY data received within the startup window
    if (!this.receivedFirstData && Date.now() - this.startedAt > this.provider.startupTimeoutMs) {
      this.broadcastOutput('[error] Agent startup timed out')
      this.cleanup()
      this.finish('failed')
      return
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

  private onPtyData(chunk: string): void {
    if (this.finished) return
    this.lastPtyDataMs = Date.now()
    this.receivedFirstData = true

    // Forward raw lines in real-time for non-Claude providers (Copilot, Minimax)
    if (this.provider.forwardRawOutput) {
      this.forwardRawBuffer += chunk
      const lines = this.forwardRawBuffer.split('\n')
      this.forwardRawBuffer = lines.pop() ?? ''
      for (const line of lines) {
        const stripped = normalizePane(line)
        if (!stripped) continue
        insertTaskLog(this.taskId, 'stdout', stripped)
        this.broadcastOutput(stripped)
        const port = detectDevServerPort(stripped)
        if (port) setDevServerPort(port)
      }
    }

    this.ptyBuffer += chunk
    if (this.ptyBuffer.length > this.PTY_BUFFER_MAX) {
      this.ptyBuffer = this.ptyBuffer.slice(-this.PTY_BUFFER_MAX)
    }
    if (this.ptyBufferTimer) clearTimeout(this.ptyBufferTimer)
    this.ptyBufferTimer = setTimeout(() => void this.processPtySnapshot(), this.PTY_DEBOUNCE_MS)
  }

  private async processPtySnapshot(): Promise<void> {
    if (this.finished || this._status !== 'running' || !this.ptyRunner) return
    this.ptyBufferTimer = null

    const normalized = normalizePane(this.ptyBuffer)
    if (!normalized) return

    // Poll hooks file on each snapshot cycle (structured events for Claude)
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

    if (this.ptyBufferTimer) {
      clearTimeout(this.ptyBufferTimer)
      this.ptyBufferTimer = null
    }

    void this.pollHooksFile().then(() => {
      if (!this.finished) {
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

    if (this.tempFiles.length > 0) {
      setTimeout(() => {
        const files = this.tempFiles.map((f) => `'${f.replace(/'/g, `'\\''`)}'`).join(' ')
        void Bun.spawn(['bash', '-c', `rm -f ${files}`])
      }, 5_000)
    }

    this.onComplete?.()
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
