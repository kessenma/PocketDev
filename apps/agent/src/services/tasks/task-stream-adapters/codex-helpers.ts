import type { TaskQuestionField, TaskQuestionOption } from '@pocketdev/shared/types'
import { asRecord, stringifyUnknown, normalizeCollabToolName } from './utils.ts'
import type { JsonRecord } from './utils.ts'

export function normalizeCodexItem(item: JsonRecord): JsonRecord {
  const normalized = { ...item }
  if (typeof normalized.type === 'string') {
    normalized.type = normalizeCodexItemType(normalized.type)
  }
  if (normalized.aggregatedOutput !== undefined && normalized.aggregated_output === undefined) {
    normalized.aggregated_output = normalized.aggregatedOutput
  }
  if (normalized.agentsStates !== undefined && normalized.agents_states === undefined) {
    normalized.agents_states = normalized.agentsStates
  }
  return normalized
}

function normalizeCodexItemType(type: string) {
  switch (type) {
    case 'commandExecution':
      return 'command_execution'
    case 'fileChange':
      return 'file_change'
    case 'mcpToolCall':
      return 'mcp_tool_call'
    case 'agentMessage':
      return 'agent_message'
    case 'collabAgentToolCall':
      return 'collab_tool_call'
    case 'todoList':
      return 'todo_list'
    case 'webSearch':
      return 'web_search'
    case 'imageGeneration':
      return 'image_generation'
    case 'imageView':
      return 'image_view'
    case 'contextCompaction':
      return 'context_compaction'
    case 'userMessage':
      return 'user_message'
    default:
      return type
  }
}

export function codexToolNameForItem(itemType: string, item: JsonRecord): string {
  switch (itemType) {
    case 'command_execution':
      return 'exec_command'
    case 'file_change':
      return 'apply_patch'
    case 'mcp_tool_call': {
      const server = typeof item.server === 'string' ? item.server : 'server'
      const tool = typeof item.tool === 'string' ? item.tool : 'tool'
      return `mcp:${server}:${tool}`
    }
    case 'collab_tool_call':
      return normalizeCollabToolName(typeof item.tool === 'string' ? item.tool : 'spawn_agent')
    case 'todo_list':
      return 'update_plan'
    case 'web_search':
      return 'web_search'
    case 'image_generation':
      return 'image_generation'
    case 'image_view':
      return 'image_view'
    case 'context_compaction':
      return 'context_compaction'
    default:
      return itemType || 'codex_tool'
  }
}

export function codexToolInputForItem(itemType: string, item: JsonRecord): Record<string, unknown> {
  switch (itemType) {
    case 'command_execution':
      return { command: item.command }
    case 'file_change':
      return { changes: item.changes }
    case 'mcp_tool_call':
      return { server: item.server, tool: item.tool, arguments: item.arguments }
    case 'collab_tool_call':
      return item
    case 'todo_list':
      return item
    case 'web_search':
    case 'image_generation':
    case 'image_view':
    case 'context_compaction':
      return item
    default:
      return item
  }
}

export function extractCodexAgentMessageText(item: JsonRecord, buffered?: string): string {
  if (buffered?.trim()) return buffered
  if (typeof item.text === 'string' && item.text.trim()) return item.text
  if (Array.isArray(item.content)) {
    const parts = item.content
      .map((entry) => asRecord(entry))
      .filter((entry) => entry.type === 'text' && typeof entry.text === 'string')
      .map((entry) => entry.text as string)
    return parts.join('\n').trim()
  }
  return ''
}

export function extractCodexReasoningText(item: JsonRecord, buffered?: string): string {
  if (buffered?.trim()) return buffered
  if (typeof item.text === 'string' && item.text.trim()) return item.text
  if (typeof item.summary_text === 'string' && item.summary_text.trim()) return item.summary_text
  return ''
}

export function extractCodexToolResult(itemType: string, item: JsonRecord): string {
  switch (itemType) {
    case 'command_execution':
      return typeof item.aggregated_output === 'string'
        ? item.aggregated_output
        : typeof item.aggregatedOutput === 'string'
          ? item.aggregatedOutput
          : ''
    case 'mcp_tool_call':
      return stringifyUnknown(item.output) ?? ''
    case 'collab_tool_call': {
      const agentsStates = asRecord(item.agents_states ?? item.agentsStates)
      const entries = Object.entries(agentsStates).map(([agentId, rawState]) => {
        const state = asRecord(rawState)
        const status = typeof state.status === 'string' ? state.status : 'unknown'
        const message = typeof state.message === 'string' ? state.message : ''
        return message ? `${agentId}: ${status} - ${message}` : `${agentId}: ${status}`
      })
      if (entries.length > 0) return entries.join('\n')
      return typeof item.status === 'string' ? item.status : 'completed'
    }
    case 'web_search':
    case 'image_generation':
    case 'image_view':
      return stringifyUnknown(item.output ?? item.result) ?? 'completed'
    case 'context_compaction':
      return typeof item.summary === 'string' ? item.summary : 'Context compacted'
    default:
      return ''
  }
}

export function extractTurnCompletedText(outputBlocks: unknown[]) {
  const parts = outputBlocks
    .map((entry) => asRecord(entry))
    .filter((entry) => entry.type === 'output_text' && typeof entry.text === 'string')
    .map((entry) => entry.text as string)
  return parts.join('\n').trim()
}

export function normalizeCodexQuestionFields(raw: unknown): TaskQuestionField[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.id === 'string' && typeof entry.question === 'string')
    .map((entry) => ({
      id: entry.id as string,
      header: typeof entry.header === 'string' ? entry.header : undefined,
      prompt: entry.question as string,
      options: normalizeCodexQuestionOptions(entry.options),
      allowOther: Boolean(entry.isOther),
      isSecret: Boolean(entry.isSecret),
    }))
}

function normalizeCodexQuestionOptions(raw: unknown): TaskQuestionOption[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  return raw
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.label === 'string')
    .map((entry) => ({
      value: entry.label as string,
      label: entry.label as string,
      description: typeof entry.description === 'string' ? entry.description : undefined,
    }))
}

export function buildCodexUserInputAnswers(fields: TaskQuestionField[], answer: string) {
  if (fields.length === 1) {
    return { [fields[0].id]: parseSingleAnswer(fields[0], answer) }
  }

  try {
    const parsed = JSON.parse(answer) as Record<string, unknown>
    const answers: Record<string, unknown> = {}
    for (const field of fields) {
      answers[field.id] = parseStructuredAnswer(field, parsed[field.id])
    }
    return answers
  } catch {
    return Object.fromEntries(fields.map((field) => [field.id, '']))
  }
}

function parseSingleAnswer(field: TaskQuestionField, answer: string) {
  if (field.options?.length) {
    const match = field.options.find((option) => option.value === answer || option.label === answer)
    return match?.label ?? answer
  }
  return answer
}

function parseStructuredAnswer(field: TaskQuestionField, answer: unknown) {
  if (typeof answer !== 'string') return ''
  return parseSingleAnswer(field, answer)
}
