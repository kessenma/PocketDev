import type { AdapterOptions } from './types.ts'
import type { JsonRecord } from './utils.ts'
import { BaseTaskStreamAdapter } from './base-adapter.ts'

/**
 * Adapter for `opencode run` tasks. Buffers all plain-text stdout lines and emits
 * a single `text` activity on process exit so ActivityCards renders a ResultCard.
 */
export class OpenCodeRunAdapter extends BaseTaskStreamAdapter {
  constructor(opts: AdapterOptions) {
    super(opts)
  }

  handleJsonMessage(_message: JsonRecord): boolean {
    return false
  }

  handleTextLine(line: string): void {
    this.appendCollectedText(line)
  }

  onProcessExit(exitCode: number): void {
    const text = this.collectedText.trim()
    if (!text) return
    this.sink.emitActivity({ type: 'text', content: text })
    if (exitCode !== 0) {
      this.sink.emitOutput(`[opencode] Exited with code ${exitCode}`)
    }
  }
}
