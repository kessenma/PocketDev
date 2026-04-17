import type { AdapterOptions, PermissionDenial } from './types.ts'
import { asRecord, getMessageContentBlocks, normalizeBinaryAnswer, truncate } from './utils.ts'
import type { JsonRecord } from './utils.ts'
import { BaseTaskStreamAdapter } from './base-adapter.ts'
import { createToolUseActivity } from './tool-classifier.ts'

export class ClaudeTaskStreamAdapter extends BaseTaskStreamAdapter {
  constructor(opts: AdapterOptions) {
    super(opts)
  }

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
