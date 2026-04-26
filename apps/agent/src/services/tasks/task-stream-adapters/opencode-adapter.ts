import type { AdapterOptions } from './types.ts'
import { asRecord, truncate } from './utils.ts'
import { createToolUseActivity } from './tool-classifier.ts'
import { BaseTaskStreamAdapter } from './base-adapter.ts'

/**
 * Adapter for `opencode run --format json` tasks (stdio mode).
 *
 * OpenCode emits JSONL events to stdout. ManagedProcess feeds each parsed
 * line to handleJsonMessage(). We emit structured TaskActivity objects for
 * tool calls and text responses as they arrive, giving real-time activity
 * cards in the mobile UI.
 *
 * Recognized event types:
 *   text      → emits a text activity per chunk (each chunk as a separate card)
 *   tool_use  → emits tool_use + tool_result activity pair
 *   others    → return false (appear in raw log stream for debugging)
 *
 * sessionID is captured from any event and forwarded to the DB via updateSessionId(),
 * enabling follow-up continuation via `opencode run -s <sessionId>`.
 */
export class OpenCodeRunAdapter extends BaseTaskStreamAdapter {
  private sessionIdCaptured = false

  constructor(opts: AdapterOptions) {
    super(opts)
  }

  handleJsonMessage(message: Record<string, unknown>): boolean {
    // Capture session ID from the first event that carries it
    if (!this.sessionIdCaptured && typeof message.sessionID === 'string' && message.sessionID) {
      this.sink.updateSessionId(message.sessionID)
      this.sessionIdCaptured = true
    }

    const type = typeof message.type === 'string' ? message.type : ''
    const part = asRecord(message.part)

    if (type === 'text') {
      const text = typeof part.text === 'string' ? part.text.trim() : ''
      if (text) {
        this.appendCollectedText(text)
        // Accumulate chunks — emit a single result card at onProcessExit to avoid
        // duplicate result cards when text appears both before and after tool calls
      }
      return true
    }

    if (type === 'tool_use') {
      const state = asRecord(part.state)
      const input = asRecord(state.input)
      const tool = String(part.tool ?? '')
      const callID = String(part.callID ?? '')

      if (!tool) return false

      const toolActivity = createToolUseActivity({
        provider: 'opencode',
        tool,
        toolCallId: callID,
        input,
      })
      this.sink.emitActivity(toolActivity)
      this.pushToolUse({ name: tool, id: callID, input })

      const output = String(state.output ?? '')
      const isError = state.status === 'error' || state.status === 'failed'
      this.sink.emitActivity({
        type: 'tool_result',
        provider: 'opencode',
        toolName: tool,
        toolCallId: callID,
        isError,
        preview: truncate(output, 300),
      })
      return true
    }

    // step_start, step_finish, and other structural events — show in raw logs
    return false
  }

  onProcessExit(exitCode: number): void {
    // Emit the full accumulated text as a single result card at the end
    const text = this.collectedText.trim()
    if (text) {
      this.sink.emitActivity({ type: 'text', provider: 'opencode', content: text })
    }
    if (exitCode !== 0) {
      this.sink.emitOutput(`[opencode] Exited with code ${exitCode}`)
    }
  }
}
