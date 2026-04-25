import type { AdapterOptions } from './types.ts'
import type { JsonRecord } from './utils.ts'
import { BaseTaskStreamAdapter } from './base-adapter.ts'

/**
 * Adapter for `opencode run --format json` tasks.
 *
 * OpenCode emits JSONL events to stdout. We extract assistant text from known
 * event shapes in real-time (so raw logs show progress), then emit a single
 * `text` activity on exit so ActivityCards renders a ResultCard.
 *
 * Lines that are not parseable JSON are forwarded as-is — useful during
 * initial integration while the exact event schema is still being confirmed.
 */
export class OpenCodeRunAdapter extends BaseTaskStreamAdapter {
  constructor(opts: AdapterOptions) {
    super(opts)
  }

  handleJsonMessage(_message: JsonRecord): boolean {
    return false
  }

  handleTextLine(line: string): void {
    const text = extractAssistantText(line)
    if (text !== null) {
      this.appendCollectedText(text)
    }
    // Always forward the raw line so it appears in the task log stream
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
 * Extract printable assistant text from an OpenCode JSON event line.
 * Returns null if no text content is found (e.g. tool events, metadata).
 * Returns the raw line if it is not valid JSON (defensive fallback).
 */
function extractAssistantText(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  let event: Record<string, unknown>
  try {
    event = JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    // Not JSON — treat the line itself as output text
    return trimmed
  }

  const type = event.type as string | undefined

  // Skip non-assistant event types we know produce no readable output
  if (type && /^(session|tool|input|error|debug|system|metadata|start|end)\b/i.test(type)) {
    return null
  }

  // Common text fields across different OpenCode event shapes
  const text = pickText(event)
  return text && text.trim() ? text.trim() : null
}

function pickText(event: Record<string, unknown>): string | null {
  // Direct string fields
  for (const key of ['text', 'content', 'delta', 'message', 'output', 'response']) {
    const val = event[key]
    if (typeof val === 'string' && val) return val
    if (typeof val === 'object' && val !== null) {
      const nested = pickText(val as Record<string, unknown>)
      if (nested) return nested
    }
  }
  return null
}
