import type { TaskActivity, TaskQuestion } from '@pocketdev/shared/types'

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

export interface AdapterOptions {
  agentType: string
  taskId: string
  sink: TaskStreamAdapterSink
  writeStdin: (data: string) => void
}
