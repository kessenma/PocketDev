export type JsonRecord = Record<string, unknown>

export function getMessageContentBlocks(message: JsonRecord): JsonRecord[] {
  const payload = asRecord(message.message)
  return Array.isArray(payload.content) ? payload.content.map(asRecord) : []
}

export function normalizeCollabToolName(tool: string) {
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

export function normalizeBinaryAnswer(answer: string) {
  return isAffirmative(answer) ? 'y' : 'n'
}

export function isAffirmative(answer: string) {
  const normalized = answer.trim().toLowerCase()
  return normalized === 'y' || normalized === 'yes' || normalized === 'allow' || normalized === 'approve' || normalized === 'accept'
}

export function createRpcQuestionId(rpcId: number) {
  return `rpc:${rpcId}`
}

export function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length)}...` : text
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function stringifyUnknown(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}
