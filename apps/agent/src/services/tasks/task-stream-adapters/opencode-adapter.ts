import type { AdapterOptions } from './types.ts'
import type { JsonRecord } from './utils.ts'
import { BaseTaskStreamAdapter } from './base-adapter.ts'

/**
 * Adapter for `opencode run --format json` tasks (tmux/file mode).
 *
 * OpenCode emits JSONL events to stdout. The file-mode poll loop in
 * ManagedAgentProcess reads them and calls handleJsonMessage() per line.
 * We extract assistant text from each event, buffer it, then emit a
 * single `text` activity on finish via onProcessExit() (called by the
 * provider's onFinish hook).
 *
 * Non-text events (tool calls, metadata) return false so the raw JSON
 * line appears in the task log stream for debugging.
 */
export class OpenCodeRunAdapter extends BaseTaskStreamAdapter {
  constructor(opts: AdapterOptions) {
    super(opts)
  }

  handleJsonMessage(message: JsonRecord): boolean {
    const text = pickText(message)
    if (!text) return false
    const trimmed = text.trim()
    if (!trimmed) return false
    this.appendCollectedText(trimmed + '\n')
    this.sink.emitOutput(trimmed)
    return true
  }

  onProcessExit(exitCode: number): void {
    const text = this.collectedText.trim()
    if (text) {
      this.sink.emitActivity({ type: 'text', content: text })
    }
    if (exitCode !== 0) {
      this.sink.emitOutput(`[opencode] Exited with code ${exitCode}`)
    }
  }
}

/**
 * Extract printable assistant text from an OpenCode JSON event.
 * Returns null for events that carry no user-visible text content.
 */
function pickText(event: Record<string, unknown>): string | null {
  const type = typeof event.type === 'string' ? event.type : ''

  // Skip event types that are structural / non-text
  if (/^(session|tool|input|error|debug|system|metadata|start|end)\b/i.test(type)) {
    return null
  }

  return searchFields(event)
}

function searchFields(obj: Record<string, unknown>): string | null {
  for (const key of ['text', 'content', 'delta', 'message', 'output', 'response']) {
    const val = obj[key]
    if (typeof val === 'string' && val.trim()) return val
    if (val !== null && typeof val === 'object') {
      const nested = searchFields(val as Record<string, unknown>)
      if (nested) return nested
    }
  }
  return null
}
