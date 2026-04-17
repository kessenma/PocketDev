import type { AdapterOptions } from './types.ts'
import { asRecord, isAffirmative, createRpcQuestionId, truncate } from './utils.ts'
import type { JsonRecord } from './utils.ts'
import { BaseTaskStreamAdapter } from './base-adapter.ts'
import { createToolUseActivity } from './tool-classifier.ts'
import {
  normalizeCodexItem,
  codexToolNameForItem,
  codexToolInputForItem,
  extractCodexAgentMessageText,
  extractCodexReasoningText,
  extractCodexToolResult,
  extractTurnCompletedText,
  normalizeCodexQuestionFields,
  buildCodexUserInputAnswers,
} from './codex-helpers.ts'

export class CodexTaskStreamAdapter extends BaseTaskStreamAdapter {
  private readonly pendingToolCalls = new Map<string, { toolCallId: string; toolName: string }>()
  private readonly reasoningBuffer = new Map<string, string>()
  private readonly messageBuffer = new Map<string, string>()

  constructor(opts: AdapterOptions) {
    super(opts)
  }

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
