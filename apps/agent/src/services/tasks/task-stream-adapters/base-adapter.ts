import type { AdapterOptions, CollectedToolUse, TaskStreamAdapter, TaskStreamAdapterSink } from './types.ts'
import type { JsonRecord } from './utils.ts'

export abstract class BaseTaskStreamAdapter implements TaskStreamAdapter {
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
