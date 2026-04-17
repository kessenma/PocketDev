export type { PermissionDenial, CollectedToolUse, TaskStreamAdapterSink, TaskStreamAdapter, AdapterOptions } from './types.ts'
export { ClaudeTaskStreamAdapter } from './claude-adapter.ts'
export { CodexTaskStreamAdapter } from './codex-adapter.ts'

import type { AdapterOptions, TaskStreamAdapter } from './types.ts'
import { ClaudeTaskStreamAdapter } from './claude-adapter.ts'
import { CodexTaskStreamAdapter } from './codex-adapter.ts'

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
