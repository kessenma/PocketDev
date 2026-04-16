import type {
  TaskActivity,
  TaskQuestion,
  TaskQuestionField,
  TaskQuestionOption,
  TaskToolKind,
} from '@pocketdev/shared/types'

export interface PermissionDenial {
  tool_name: string
  tool_use_id?: string
  tool_input?: Record<string, unknown>
}

export interface CollectedToolUse {
  name: string
  id: string
  input: Record<string, unknown>
}

export interface TaskStreamAdapterSink {
  emitOutput: (line: string) => void
  emitActivity: (activity: TaskActivity) => void
  emitQuestion: (question: TaskQuestion, onAnswer: (answer: string) => void | Promise<void>) => void
  emitPermissionRequest: (denials: PermissionDenial[]) => void
  updateSessionId: (sessionId: string) => void
  recordCollectedToolUse: (toolUse: CollectedToolUse) => void
  /** Called when agent emits `type: 'result'` — used to kill the session in interactive mode. */
  signalComplete?: () => void
}

export interface TaskStreamAdapter {
  handleJsonMessage: (message: Record<string, unknown>) => boolean
  getCollectedText: () => string
  getCollectedThinking: () => string
  getCollectedToolUses: () => CollectedToolUse[]
}

interface AdapterOptions {
  agentType: string
  taskId: string
  sink: TaskStreamAdapterSink
  writeStdin: (data: string) => void
}

type JsonRecord = Record<string, unknown>

abstract class BaseTaskStreamAdapter implements TaskStreamAdapter {
  protected readonly taskId: string
  protected readonly sink: TaskStreamAdapterSink
  protected readonly writeStdin: (data: string) => void
  protected collectedText = ''
  protected collectedThinking = ''
  protected collectedToolUses: CollectedToolUse[] = []

  constructor(opts: AdapterOptions) {
    this.taskId = opts.taskId
    this.sink = opts.sink
    this.writeStdin = opts.writeStdin
  }

  abstract handleJsonMessage(message: JsonRecord): boolean

  getCollectedText() {
    return this.collectedText
  }

  getCollectedThinking() {
    return this.collectedThinking
  }

  getCollectedToolUses() {
    return [...this.collectedToolUses]
  }

  protected appendCollectedText(text: string) {
    if (!text.trim()) return
    this.collectedText += `${text.trim()}\n`
  }

  protected setCollectedThinking(text: string) {
    if (!text.trim()) return
    this.collectedThinking = text.trim()
  }

  protected pushToolUse(toolUse: CollectedToolUse) {
    this.collectedToolUses.push(toolUse)
    this.sink.recordCollectedToolUse(toolUse)
  }

  protected emitMultilineOutput(text: string, prefix = '') {
    const normalized = text.replace(/\r/g, '')
    for (const line of normalized.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      this.sink.emitOutput(prefix ? `${prefix}${trimmed}` : trimmed)
    }
  }
}

class ClaudeTaskStreamAdapter extends BaseTaskStreamAdapter {
  handleJsonMessage(message: JsonRecord): boolean {
    const type = typeof message.type === 'string' ? message.type : null
    if (!type) return false

    this.handlePermissionRequests(message)
    this.handlePermissionDenials(message)

    if (type === 'system') {
      const subtype = typeof message.subtype === 'string' ? message.subtype : ''
      if (subtype === 'init') {
        const model = typeof message.model === 'string' ? message.model : 'unknown'
        const permissionMode = typeof message.permissionMode === 'string' ? message.permissionMode : 'unknown'
        const sessionId = typeof message.session_id === 'string' ? message.session_id : null
        if (sessionId) this.sink.updateSessionId(sessionId)
        this.sink.emitOutput(`[system] Session started - model: ${model}, permission: ${permissionMode}`)
        return true
      }
      if (subtype === 'task_started' || subtype === 'task_progress' || subtype === 'task_completed') {
        const description = typeof message.description === 'string' ? message.description : ''
        const suffix = subtype === 'task_completed'
          ? 'Sub-task completed'
          : subtype === 'task_started'
            ? `Sub-task started: ${description}`
            : description
        this.sink.emitOutput(`[agent] ${suffix}`)
        return true
      }
      return true
    }

    if (type === 'assistant') {
      const content = getMessageContentBlocks(message)
      if (content.length === 0) return true

      for (const block of content) {
        if (block.type === 'thinking') {
          const thinking = typeof block.thinking === 'string' ? block.thinking : ''
          const preview = truncate(thinking, 200)
          this.setCollectedThinking(thinking)
          this.sink.emitOutput(`[thinking] ${preview}`)
          this.sink.emitActivity({ type: 'thinking', provider: 'claude', preview })
          continue
        }

        if (block.type === 'text') {
          const text = typeof block.text === 'string' ? block.text : ''
          if (!text.trim()) continue
          this.appendCollectedText(text)
          this.emitMultilineOutput(text)
          this.sink.emitActivity({ type: 'text', provider: 'claude', content: text })
          continue
        }

        if (block.type === 'tool_use') {
          const name = typeof block.name === 'string' ? block.name : 'Tool'
          const input = asRecord(block.input)
          const toolCallId = typeof block.id === 'string' ? block.id : crypto.randomUUID()
          const activity = createToolUseActivity({
            provider: 'claude',
            tool: name,
            toolCallId,
            input,
          })
          this.pushToolUse({ name, id: toolCallId, input })
          this.sink.emitOutput(`[tool] ${activity.tool}: ${activity.detail ?? activity.title ?? ''}`.trimEnd())
          this.sink.emitActivity(activity)
        }
      }

      return true
    }

    if (type === 'user') {
      const content = getMessageContentBlocks(message)
      for (const block of content) {
        if (block.type !== 'tool_result') continue
        const text = typeof block.content === 'string' ? block.content : ''
        const isError = Boolean(block.is_error)
        const preview = truncate(text, 300)
        if (preview) {
          this.sink.emitOutput(`${isError ? '[error] ' : '[result] '}${preview}`)
        }
        this.sink.emitActivity({
          type: 'tool_result',
          provider: 'claude',
          toolName: typeof block.tool_use_id === 'string' ? block.tool_use_id : 'unknown',
          toolCallId: typeof block.tool_use_id === 'string' ? block.tool_use_id : undefined,
          isError,
          preview,
        })
      }
      return true
    }

    if (type === 'result') {
      const stopReason = typeof asRecord(message.message).stop_reason === 'string'
        ? (asRecord(message.message).stop_reason as string)
        : 'complete'
      this.sink.emitOutput(`[done] Task finished (${stopReason})`)
      this.sink.emitActivity({ type: 'status', provider: 'claude', message: `Task finished (${stopReason})` })
      this.sink.signalComplete?.()
      return true
    }

    if (type === 'rate_limit_event') return true

    return false
  }

  /**
   * Handles pre-execution permission requests (--permission-mode default).
   *
   * Claude stream-json can emit permissions in two formats:
   *   1. As a field `permission_requests: [{tool_name, tool_use_id, tool_input}]` on any message
   *   2. As a top-level `type: "permission"` message (observed in some CLI versions)
   *
   * Claude WAITS on stdin for 'y'/'n' before executing the tool in default mode.
   */
  private handlePermissionRequests(message: JsonRecord) {
    // Format 1: permission_requests array field
    if (Array.isArray(message.permission_requests) && message.permission_requests.length > 0) {
      for (const raw of message.permission_requests) {
        this.emitPermissionQuestion(asRecord(raw))
      }
      return
    }

    // Format 2: top-level type === 'permission' message
    if (message.type === 'permission') {
      this.emitPermissionQuestion(message)
    }
  }

  private emitPermissionQuestion(req: JsonRecord) {
    const toolName = typeof req.tool_name === 'string' ? req.tool_name : 'Tool'
    const toolUseId = typeof req.tool_use_id === 'string' ? req.tool_use_id : undefined
    const toolInput = asRecord(req.tool_input)
    const questionId = toolUseId ?? crypto.randomUUID()

    this.sink.emitQuestion(
      {
        questionId,
        taskId: this.taskId,
        provider: 'claude',
        prompt: `Allow ${toolName}?`,
        type: 'permission',
        toolDetails: { toolName, toolInput },
      },
      (answer) => {
        this.writeStdin(`${normalizeBinaryAnswer(answer)}\n`)
      },
    )
  }

  /**
   * Handles post-denial notifications (--permission-mode acceptEdits / plan).
   * Claude already denied the tool — writes 'y'/'n' to stdin may trigger a retry in some modes.
   */
  private handlePermissionDenials(message: JsonRecord) {
    if (!Array.isArray(message.permission_denials) || message.permission_denials.length === 0) return

    const denials = message.permission_denials.map((raw) => {
      const denial = asRecord(raw)
      return {
        tool_name: typeof denial.tool_name === 'string' ? denial.tool_name : 'Tool',
        tool_use_id: typeof denial.tool_use_id === 'string' ? denial.tool_use_id : undefined,
        tool_input: asRecord(denial.tool_input),
      } satisfies PermissionDenial
    })

    this.sink.emitPermissionRequest(denials)

    for (const denial of denials) {
      const questionId = denial.tool_use_id ?? crypto.randomUUID()
      this.sink.emitQuestion(
        {
          questionId,
          taskId: this.taskId,
          provider: 'claude',
          prompt: `Allow ${denial.tool_name}?`,
          type: 'permission',
          toolDetails: {
            toolName: denial.tool_name,
            toolInput: denial.tool_input,
          },
        },
        (answer) => {
          this.writeStdin(`${normalizeBinaryAnswer(answer)}\n`)
        },
      )
    }
  }
}

class CodexTaskStreamAdapter extends BaseTaskStreamAdapter {
  private readonly pendingToolCalls = new Map<string, { toolCallId: string; toolName: string }>()
  private readonly reasoningBuffer = new Map<string, string>()
  private readonly messageBuffer = new Map<string, string>()

  handleJsonMessage(message: JsonRecord): boolean {
    if (typeof message.method === 'string') {
      const method = message.method
      const params = asRecord(message.params)
      if (typeof message.id === 'number') {
        this.handleServerRequest(message.id, method, params)
        return true
      }

      this.handleNotification(method, params)
      return true
    }

    const type = typeof message.type === 'string' ? message.type : null
    if (!type) return false

    this.handleLegacyEvent(type, message)
    return true
  }

  private handleServerRequest(rpcId: number, method: string, params: JsonRecord) {
    switch (method) {
      case 'item/commandExecution/requestApproval':
      case 'item/fileChange/requestApproval': {
        const questionId = createRpcQuestionId(rpcId)
        const isFileChange = method.includes('fileChange')
        const command = typeof params.command === 'string' ? params.command : null
        const detail = [
          typeof params.reason === 'string' ? params.reason : null,
          typeof params.cwd === 'string' ? `cwd: ${params.cwd}` : null,
        ].filter(Boolean).join('\n')

        this.sink.emitQuestion(
          {
            questionId,
            taskId: this.taskId,
            provider: 'codex',
            prompt: isFileChange
              ? 'Allow Codex to apply the proposed code changes?'
              : 'Allow Codex to run this command?',
            type: 'permission',
            toolDetails: {
              toolName: isFileChange ? 'apply_patch' : 'exec_command',
              toolInput: command ? { command } : params,
              detail: detail || undefined,
            },
            metadata: { rpcId, responseKind: 'codex-command-approval' },
          },
          (answer) => {
            this.writeJsonRpcResponse(rpcId, {
              decision: isAffirmative(answer) ? 'accept' : 'decline',
            })
          },
        )

        return
      }

      case 'item/permissions/requestApproval': {
        const questionId = createRpcQuestionId(rpcId)
        const permissions = asRecord(params.permissions)
        const reason = typeof params.reason === 'string' ? params.reason : undefined
        this.sink.emitQuestion(
          {
            questionId,
            taskId: this.taskId,
            provider: 'codex',
            prompt: reason ?? 'Allow the requested permissions?',
            type: 'permission',
            toolDetails: {
              toolName: 'permissions',
              toolInput: permissions,
            },
            metadata: { rpcId, responseKind: 'codex-permissions', permissions },
          },
          (answer) => {
            this.writeJsonRpcResponse(rpcId, isAffirmative(answer) ? { permissions } : { permissions: {} })
          },
        )

        this.sink.emitPermissionRequest([
          {
            tool_name: 'permissions',
            tool_use_id: questionId,
            tool_input: permissions,
          },
        ])
        return
      }

      case 'item/tool/requestUserInput': {
        const questions = normalizeCodexQuestionFields(params.questions)
        if (questions.length === 0) return

        const questionId = createRpcQuestionId(rpcId)
        const single = questions.length === 1 ? questions[0] : null
        const type = questions.length > 1
          ? 'form'
          : (single?.options?.length ? 'multiple_choice' : 'free_response')

        this.sink.emitQuestion(
          {
            questionId,
            taskId: this.taskId,
            provider: 'codex',
            prompt: questions.length > 1
              ? 'Codex needs additional input before it can continue.'
              : single?.prompt ?? 'Codex needs additional input.',
            type,
            options: questions.length === 1 ? single?.options : undefined,
            fields: questions.length > 1 ? questions : undefined,
            metadata: { rpcId, responseKind: 'codex-user-input', questionIds: questions.map((field) => field.id) },
          },
          (answer) => {
            const answers = buildCodexUserInputAnswers(questions, answer)
            this.writeJsonRpcResponse(rpcId, { answers })
          },
        )
        return
      }

      case 'mcpServer/elicitation/request': {
        this.writeJsonRpcResponse(rpcId, { action: 'accept' })
        this.sink.emitOutput('[agent] Auto-accepted MCP elicitation request')
        return
      }

      case 'item/tool/call': {
        const tool = typeof params.tool === 'string' ? params.tool : 'dynamic_tool'
        this.sink.emitOutput(`[agent] Unsupported dynamic tool call requested: ${tool}`)
        this.writeJsonRpcResponse(rpcId, {
          success: false,
          contentItems: [{ type: 'input_text', text: `PocketDev does not support dynamic tool call responses for ${tool} yet.` }],
        })
        return
      }

      default:
        this.sink.emitOutput(`[error] Unsupported Codex server request: ${method}`)
    }
  }

  private handleNotification(method: string, params: JsonRecord) {
    switch (method) {
      case 'thread/started': {
        const threadId = typeof asRecord(params.thread).id === 'string' ? (asRecord(params.thread).id as string) : null
        if (threadId) {
          this.sink.emitOutput(`[system] Thread started: ${threadId}`)
        }
        return
      }

      case 'turn/started':
        this.sink.emitOutput('[system] Turn started')
        return

      case 'item/agentMessage/delta': {
        const itemId = typeof params.itemId === 'string' ? params.itemId : 'agent_message'
        const delta = typeof params.delta === 'string' ? params.delta : ''
        if (!delta) return
        const next = `${this.messageBuffer.get(itemId) ?? ''}${delta}`
        this.messageBuffer.set(itemId, next)
        return
      }

      case 'item/reasoning/textDelta':
      case 'item/reasoning/summaryTextDelta': {
        const itemId = typeof params.itemId === 'string' ? params.itemId : 'reasoning'
        const delta = typeof params.delta === 'string' ? params.delta : ''
        if (!delta) return
        const next = `${this.reasoningBuffer.get(itemId) ?? ''}${delta}`
        this.reasoningBuffer.set(itemId, next)
        return
      }

      case 'item/started': {
        this.handleLegacyEvent('item.started', { type: 'item.started', item: normalizeCodexItem(asRecord(params.item)) })
        return
      }

      case 'item/completed': {
        this.handleLegacyEvent('item.completed', { type: 'item.completed', item: normalizeCodexItem(asRecord(params.item)) })
        return
      }

      case 'turn/completed': {
        const turn = asRecord(params.turn)
        const status = typeof turn.status === 'string' ? turn.status : 'completed'
        if (status === 'failed') {
          const error = typeof asRecord(turn.error).message === 'string'
            ? (asRecord(turn.error).message as string)
            : 'Codex task failed'
          this.sink.emitOutput(`[error] ${error}`)
          this.sink.emitActivity({ type: 'status', provider: 'codex', message: 'Task failed' })
          return
        }

        if (status === 'interrupted') {
          this.sink.emitOutput('[done] Task interrupted')
          this.sink.emitActivity({ type: 'status', provider: 'codex', message: 'Task interrupted' })
          return
        }

        this.sink.emitOutput('[done] Task finished')
        this.sink.emitActivity({ type: 'status', provider: 'codex', message: 'Task finished' })
        return
      }

      case 'error': {
        const error = typeof asRecord(params.error).message === 'string'
          ? (asRecord(params.error).message as string)
          : 'Codex error'
        this.sink.emitOutput(`[error] ${error}`)
        return
      }

      default:
        return
    }
  }

  private handleLegacyEvent(type: string, message: JsonRecord) {
    switch (type) {
      case 'item.started': {
        const item = normalizeCodexItem(asRecord(message.item))
        this.handleItemStarted(item)
        return
      }

      case 'item.completed': {
        const item = normalizeCodexItem(asRecord(message.item))
        this.handleItemCompleted(item)
        return
      }

      case 'turn.completed': {
        const outputBlocks = Array.isArray(message.output) ? message.output : []
        const outputText = extractTurnCompletedText(outputBlocks)
        if (outputText && !this.collectedText.trim()) {
          this.appendCollectedText(outputText)
          this.sink.emitActivity({ type: 'text', provider: 'codex', content: outputText })
          this.emitMultilineOutput(outputText)
        }
        this.sink.emitOutput('[done] Task finished')
        this.sink.emitActivity({ type: 'status', provider: 'codex', message: 'Task finished' })
        return
      }

      case 'turn.failed': {
        const error = asRecord(message.error)
        const messageText = typeof error.message === 'string' ? error.message : 'Codex task failed'
        this.sink.emitOutput(`[error] ${messageText}`)
        this.sink.emitActivity({ type: 'status', provider: 'codex', message: 'Task failed' })
        return
      }

      case 'thread.started': {
        const threadId = typeof message.thread_id === 'string' ? message.thread_id : null
        if (threadId) this.sink.emitOutput(`[system] Thread started: ${threadId}`)
        return
      }

      default:
        return
    }
  }

  private handleItemStarted(item: JsonRecord) {
    const itemType = typeof item.type === 'string' ? item.type : ''
    const itemId = typeof item.id === 'string' ? item.id : crypto.randomUUID()

    switch (itemType) {
      case 'agent_message':
      case 'reasoning':
      case 'user_message':
        return

      default: {
        const tool = codexToolNameForItem(itemType, item)
        const input = codexToolInputForItem(itemType, item)
        const activity = createToolUseActivity({
          provider: 'codex',
          tool,
          toolCallId: itemId,
          input,
        })
        this.pendingToolCalls.set(itemId, { toolCallId: itemId, toolName: tool })
        this.pushToolUse({ name: tool, id: itemId, input })
        this.sink.emitActivity(activity)
        if (activity.detail || activity.title) {
          this.sink.emitOutput(`[tool] ${activity.tool}: ${activity.detail ?? activity.title ?? ''}`.trimEnd())
        } else {
          this.sink.emitOutput(`[tool] ${activity.tool}`)
        }
      }
    }
  }

  private handleItemCompleted(item: JsonRecord) {
    const itemType = typeof item.type === 'string' ? item.type : ''
    const itemId = typeof item.id === 'string' ? item.id : undefined

    switch (itemType) {
      case 'agent_message': {
        const text = extractCodexAgentMessageText(item, itemId ? this.messageBuffer.get(itemId) : undefined)
        if (!text) return
        this.appendCollectedText(text)
        this.sink.emitActivity({ type: 'text', provider: 'codex', content: text })
        this.emitMultilineOutput(text)
        if (itemId) this.messageBuffer.delete(itemId)
        return
      }

      case 'reasoning': {
        const text = extractCodexReasoningText(item, itemId ? this.reasoningBuffer.get(itemId) : undefined)
        if (!text) return
        this.setCollectedThinking(text)
        this.sink.emitActivity({ type: 'thinking', provider: 'codex', preview: truncate(text, 200) })
        this.sink.emitOutput(`[thinking] ${truncate(text, 200)}`)
        if (itemId) this.reasoningBuffer.delete(itemId)
        return
      }

      case 'command_execution':
      case 'mcp_tool_call':
      case 'collab_tool_call':
      case 'web_search':
      case 'image_generation':
      case 'image_view':
      case 'context_compaction': {
        const pending = itemId ? this.pendingToolCalls.get(itemId) : undefined
        const preview = truncate(extractCodexToolResult(itemType, item), 300)
        if (!preview) return
        // Surface context compaction as a visible status so it's not lost in the stream.
        this.sink.emitActivity({ type: 'status', provider: 'codex', message: 'Context compacted by Codex' })
        this.sink.emitActivity({
          type: 'tool_result',
          provider: 'codex',
          toolName: pending?.toolName ?? codexToolNameForItem(itemType, item),
          toolCallId: pending?.toolCallId,
          isError: false,
          preview,
        })
        this.sink.emitOutput(`[result] ${preview}`)
        if (itemId) this.pendingToolCalls.delete(itemId)
        return
      }

      case 'file_change': {
        if (itemId) this.pendingToolCalls.delete(itemId)
        return
      }

      case 'todo_list':
        return

      default:
        return
    }
  }

  private writeJsonRpcResponse(id: number, result: Record<string, unknown>) {
    this.writeStdin(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`)
  }
}

export function createTaskStreamAdapter(opts: AdapterOptions): TaskStreamAdapter | null {
  switch (opts.agentType) {
    case 'claude':
      return new ClaudeTaskStreamAdapter(opts)
    case 'codex':
      return new CodexTaskStreamAdapter(opts)
    default:
      return null
  }
}

function getMessageContentBlocks(message: JsonRecord): JsonRecord[] {
  const payload = asRecord(message.message)
  return Array.isArray(payload.content) ? payload.content.map(asRecord) : []
}

function normalizeCodexItem(item: JsonRecord): JsonRecord {
  const normalized = { ...item }
  if (typeof normalized.type === 'string') {
    normalized.type = normalizeCodexItemType(normalized.type)
  }
  if (normalized.aggregatedOutput !== undefined && normalized.aggregated_output === undefined) {
    normalized.aggregated_output = normalized.aggregatedOutput
  }
  if (normalized.agentsStates !== undefined && normalized.agents_states === undefined) {
    normalized.agents_states = normalized.agentsStates
  }
  return normalized
}

function normalizeCodexItemType(type: string) {
  switch (type) {
    case 'commandExecution':
      return 'command_execution'
    case 'fileChange':
      return 'file_change'
    case 'mcpToolCall':
      return 'mcp_tool_call'
    case 'agentMessage':
      return 'agent_message'
    case 'collabAgentToolCall':
      return 'collab_tool_call'
    case 'todoList':
      return 'todo_list'
    case 'webSearch':
      return 'web_search'
    case 'imageGeneration':
      return 'image_generation'
    case 'imageView':
      return 'image_view'
    case 'contextCompaction':
      return 'context_compaction'
    case 'userMessage':
      return 'user_message'
    default:
      return type
  }
}

function createToolUseActivity(opts: {
  provider: string
  tool: string
  toolCallId: string
  input: Record<string, unknown>
}): TaskActivity & { type: 'tool_use' } {
  const activity: TaskActivity & { type: 'tool_use' } = {
    type: 'tool_use',
    provider: opts.provider,
    tool: opts.tool,
    toolCallId: opts.toolCallId,
  }

  if (typeof opts.input.file_path === 'string') activity.filePath = opts.input.file_path
  if (typeof opts.input.path === 'string' && !activity.filePath) activity.filePath = opts.input.path
  if (typeof opts.input.command === 'string') activity.command = truncate(opts.input.command, 300)
  if (typeof opts.input.pattern === 'string') activity.pattern = opts.input.pattern
  if (typeof opts.input.description === 'string') activity.description = opts.input.description

  const normalized = classifyToolUse(opts.tool, opts.input)
  activity.kind = normalized.kind
  activity.title = normalized.title
  activity.detail = normalized.detail
  activity.metadata = normalized.metadata

  return activity
}

function classifyToolUse(tool: string, input: Record<string, unknown>): {
  kind: TaskToolKind
  title: string
  detail?: string
  metadata?: Record<string, unknown>
} {
  const normalizedTool = tool.toLowerCase()
  const filePath = typeof input.file_path === 'string'
    ? input.file_path
    : typeof input.path === 'string'
      ? input.path
      : undefined
  const command = typeof input.command === 'string' ? input.command : undefined
  const pattern = typeof input.pattern === 'string' ? input.pattern : undefined
  const description = typeof input.description === 'string' ? input.description : undefined

  if (normalizedTool === 'write') {
    return { kind: 'create', title: 'Creating', detail: filePath }
  }
  if (normalizedTool === 'edit' || normalizedTool === 'apply_patch' || normalizedTool === 'filechange' || normalizedTool === 'file_change') {
    return { kind: 'write', title: 'Editing', detail: filePath ?? summarizeFileChanges(input.changes) }
  }
  if (normalizedTool === 'read') {
    return { kind: 'read', title: 'Reading', detail: filePath }
  }
  if (normalizedTool === 'glob' || normalizedTool === 'listfiles' || normalizedTool === 'list_files') {
    return { kind: 'search', title: 'Finding', detail: filePath ?? pattern }
  }
  if (normalizedTool === 'grep' || normalizedTool === 'search') {
    return { kind: 'search', title: 'Searching', detail: pattern ?? filePath }
  }
  if (normalizedTool === 'bash' || normalizedTool === 'exec_command' || normalizedTool === 'command_execution') {
    return { kind: 'run', title: 'Running', detail: command ?? description }
  }
  if (normalizedTool === 'agent' || normalizedTool === 'spawnagent' || normalizedTool === 'spawn_agent') {
    return { kind: 'agent', title: 'Sub-agent', detail: description ?? command }
  }
  if (normalizedTool === 'sendinput' || normalizedTool === 'send_input' || normalizedTool === 'resumeagent' || normalizedTool === 'resume_agent' || normalizedTool === 'waitforagents' || normalizedTool === 'closeagent' || normalizedTool === 'close_agent') {
    return { kind: 'agent', title: 'Agent Action', detail: description ?? command }
  }
  if (normalizedTool === 'todowrite' || normalizedTool === 'update_plan' || normalizedTool === 'codextodolist' || normalizedTool === 'plan') {
    // Include the raw todos/items array in metadata for the checklist card + progress bar on mobile.
    const todos = Array.isArray(input.todos) ? input.todos
      : Array.isArray(input.items) ? input.items
      : undefined
    return {
      kind: 'plan',
      title: 'Planning',
      detail: description ?? summarizeTodoList(input),
      ...(todos ? { metadata: { todos } } : {}),
    }
  }
  if (normalizedTool.startsWith('mcp:') || normalizedTool === 'mcp_tool_call') {
    return { kind: 'mcp', title: 'MCP', detail: description ?? command ?? tool }
  }
  if (normalizedTool === 'codexwebsearch' || normalizedTool === 'web_search') {
    return { kind: 'web', title: 'Web Search', detail: description ?? stringifyUnknown(input) }
  }
  if (normalizedTool === 'codeximagegeneration' || normalizedTool === 'image_generation' || normalizedTool === 'codeximageview' || normalizedTool === 'image_view') {
    return { kind: 'image', title: 'Image Tool', detail: description ?? stringifyUnknown(input) }
  }

  return {
    kind: 'info',
    title: tool,
    detail: command ?? filePath ?? pattern ?? description,
  }
}

function summarizeFileChanges(changes: unknown): string | undefined {
  if (!Array.isArray(changes) || changes.length === 0) return undefined
  const paths = changes
    .map((change) => {
      const entry = asRecord(change)
      const direct = typeof entry.path === 'string'
        ? entry.path
        : typeof entry.file_path === 'string'
          ? entry.file_path
          : typeof entry.move_path === 'string'
            ? entry.move_path
            : null
      return direct
    })
    .filter((value): value is string => Boolean(value))

  if (paths.length === 0) return `${changes.length} file change${changes.length === 1 ? '' : 's'}`
  if (paths.length === 1) return paths[0]
  return `${paths[0]} +${paths.length - 1} more`
}

function summarizeTodoList(input: Record<string, unknown>): string | undefined {
  const items = Array.isArray(input.items) ? input.items : Array.isArray(input.todos) ? input.todos : []
  if (!items.length) return undefined
  return `${items.length} item${items.length === 1 ? '' : 's'}`
}

function stringifyUnknown(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}

function codexToolNameForItem(itemType: string, item: JsonRecord): string {
  switch (itemType) {
    case 'command_execution':
      return 'exec_command'
    case 'file_change':
      return 'apply_patch'
    case 'mcp_tool_call': {
      const server = typeof item.server === 'string' ? item.server : 'server'
      const tool = typeof item.tool === 'string' ? item.tool : 'tool'
      return `mcp:${server}:${tool}`
    }
    case 'collab_tool_call':
      return normalizeCollabToolName(typeof item.tool === 'string' ? item.tool : 'spawn_agent')
    case 'todo_list':
      return 'update_plan'
    case 'web_search':
      return 'web_search'
    case 'image_generation':
      return 'image_generation'
    case 'image_view':
      return 'image_view'
    case 'context_compaction':
      return 'context_compaction'
    default:
      return itemType || 'codex_tool'
  }
}

function codexToolInputForItem(itemType: string, item: JsonRecord): Record<string, unknown> {
  switch (itemType) {
    case 'command_execution':
      return { command: item.command }
    case 'file_change':
      return { changes: item.changes }
    case 'mcp_tool_call':
      return { server: item.server, tool: item.tool, arguments: item.arguments }
    case 'collab_tool_call':
      return item
    case 'todo_list':
      return item
    case 'web_search':
    case 'image_generation':
    case 'image_view':
    case 'context_compaction':
      return item
    default:
      return item
  }
}

function normalizeCollabToolName(tool: string) {
  switch (tool) {
    case 'spawnAgent':
    case 'spawn_agent':
      return 'spawn_agent'
    case 'sendInput':
    case 'send_input':
      return 'send_input'
    case 'resumeAgent':
    case 'resume_agent':
      return 'resume_agent'
    case 'wait':
      return 'wait_agent'
    case 'closeAgent':
    case 'close_agent':
      return 'close_agent'
    default:
      return tool
  }
}

function extractCodexAgentMessageText(item: JsonRecord, buffered?: string): string {
  if (buffered?.trim()) return buffered
  if (typeof item.text === 'string' && item.text.trim()) return item.text
  if (Array.isArray(item.content)) {
    const parts = item.content
      .map((entry) => asRecord(entry))
      .filter((entry) => entry.type === 'text' && typeof entry.text === 'string')
      .map((entry) => entry.text as string)
    return parts.join('\n').trim()
  }
  return ''
}

function extractCodexReasoningText(item: JsonRecord, buffered?: string): string {
  if (buffered?.trim()) return buffered
  if (typeof item.text === 'string' && item.text.trim()) return item.text
  if (typeof item.summary_text === 'string' && item.summary_text.trim()) return item.summary_text
  return ''
}

function extractCodexToolResult(itemType: string, item: JsonRecord): string {
  switch (itemType) {
    case 'command_execution':
      return typeof item.aggregated_output === 'string'
        ? item.aggregated_output
        : typeof item.aggregatedOutput === 'string'
          ? item.aggregatedOutput
          : ''
    case 'mcp_tool_call':
      return stringifyUnknown(item.output) ?? ''
    case 'collab_tool_call': {
      const agentsStates = asRecord(item.agents_states ?? item.agentsStates)
      const entries = Object.entries(agentsStates).map(([agentId, rawState]) => {
        const state = asRecord(rawState)
        const status = typeof state.status === 'string' ? state.status : 'unknown'
        const message = typeof state.message === 'string' ? state.message : ''
        return message ? `${agentId}: ${status} - ${message}` : `${agentId}: ${status}`
      })
      if (entries.length > 0) return entries.join('\n')
      return typeof item.status === 'string' ? item.status : 'completed'
    }
    case 'web_search':
    case 'image_generation':
    case 'image_view':
      return stringifyUnknown(item.output ?? item.result) ?? 'completed'
    case 'context_compaction':
      return typeof item.summary === 'string' ? item.summary : 'Context compacted'
    default:
      return ''
  }
}

function extractTurnCompletedText(outputBlocks: unknown[]) {
  const parts = outputBlocks
    .map((entry) => asRecord(entry))
    .filter((entry) => entry.type === 'output_text' && typeof entry.text === 'string')
    .map((entry) => entry.text as string)
  return parts.join('\n').trim()
}

function normalizeCodexQuestionFields(raw: unknown): TaskQuestionField[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.id === 'string' && typeof entry.question === 'string')
    .map((entry) => ({
      id: entry.id as string,
      header: typeof entry.header === 'string' ? entry.header : undefined,
      prompt: entry.question as string,
      options: normalizeCodexQuestionOptions(entry.options),
      allowOther: Boolean(entry.isOther),
      isSecret: Boolean(entry.isSecret),
    }))
}

function normalizeCodexQuestionOptions(raw: unknown): TaskQuestionOption[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  return raw
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.label === 'string')
    .map((entry) => ({
      value: entry.label as string,
      label: entry.label as string,
      description: typeof entry.description === 'string' ? entry.description : undefined,
    }))
}

function buildCodexUserInputAnswers(fields: TaskQuestionField[], answer: string) {
  if (fields.length === 1) {
    return { [fields[0].id]: parseSingleAnswer(fields[0], answer) }
  }

  try {
    const parsed = JSON.parse(answer) as Record<string, unknown>
    const answers: Record<string, unknown> = {}
    for (const field of fields) {
      answers[field.id] = parseStructuredAnswer(field, parsed[field.id])
    }
    return answers
  } catch {
    return Object.fromEntries(fields.map((field) => [field.id, '']))
  }
}

function parseSingleAnswer(field: TaskQuestionField, answer: string) {
  if (field.options?.length) {
    const match = field.options.find((option) => option.value === answer || option.label === answer)
    return match?.label ?? answer
  }
  return answer
}

function parseStructuredAnswer(field: TaskQuestionField, answer: unknown) {
  if (typeof answer !== 'string') return ''
  return parseSingleAnswer(field, answer)
}

function normalizeBinaryAnswer(answer: string) {
  return isAffirmative(answer) ? 'y' : 'n'
}

function isAffirmative(answer: string) {
  const normalized = answer.trim().toLowerCase()
  return normalized === 'y' || normalized === 'yes' || normalized === 'allow' || normalized === 'approve' || normalized === 'accept'
}

function createRpcQuestionId(rpcId: number) {
  return `rpc:${rpcId}`
}

function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length)}...` : text
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}
