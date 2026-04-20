import type { TaskActivity, TaskQuestionOption, TodoItem, ToolUseActivity } from '@pocketdev/shared/types'
import type { StreamItem } from './TaskStreamer'

export type TaskToolPresentation = {
  kind: 'read' | 'search' | 'write' | 'create' | 'run' | 'agent' | 'plan' | 'mcp' | 'web' | 'image' | 'info'
  label: string
  detail: string
}

export function getToolUseDetail(activity: ToolUseActivity): string {
  return activity.detail
    ?? activity.filePath
    ?? activity.command
    ?? activity.pattern
    ?? activity.description
    ?? ''
}

export function getToolPresentation(activity: ToolUseActivity): TaskToolPresentation {
  const detail = getToolUseDetail(activity)

  switch (activity.kind) {
    case 'create':
      return { kind: 'create', label: activity.title ?? 'Creating', detail }
    case 'write':
      return { kind: 'write', label: activity.title ?? 'Editing', detail }
    case 'read':
      return { kind: 'read', label: activity.title ?? 'Reading', detail }
    case 'search':
      return { kind: 'search', label: activity.title ?? 'Searching', detail }
    case 'run':
      return { kind: 'run', label: activity.title ?? 'Running', detail }
    case 'agent':
      return { kind: 'agent', label: activity.title ?? 'Sub-agent', detail }
    case 'plan':
      return { kind: 'plan', label: activity.title ?? 'Planning', detail }
    case 'mcp':
      return { kind: 'mcp', label: activity.title ?? 'MCP', detail }
    case 'web':
      return { kind: 'web', label: activity.title ?? 'Web Search', detail }
    case 'image':
      return { kind: 'image', label: activity.title ?? 'Image Tool', detail }
    case 'info':
      return { kind: 'info', label: activity.title ?? activity.tool, detail }
    default:
      break
  }

  switch (activity.tool) {
    case 'Write':
      return { kind: 'create', label: 'Creating', detail }
    case 'Edit':
      return { kind: 'write', label: 'Editing', detail }
    case 'Read':
      return { kind: 'read', label: 'Reading', detail }
    case 'Glob':
      return { kind: 'search', label: 'Finding', detail }
    case 'Grep':
      return { kind: 'search', label: 'Searching', detail }
    case 'Bash':
    case 'exec_command':
      return { kind: 'run', label: 'Running', detail }
    case 'Agent':
    case 'spawn_agent':
    case 'send_input':
    case 'resume_agent':
    case 'wait_agent':
    case 'close_agent':
      return { kind: 'agent', label: 'Sub-agent', detail }
    case 'apply_patch':
      return { kind: 'write', label: 'Editing', detail }
    case 'update_plan':
      return { kind: 'plan', label: 'Planning', detail }
    default:
      if (activity.tool.startsWith('mcp:')) {
        return { kind: 'mcp', label: 'MCP', detail }
      }
      return { kind: 'info', label: activity.title ?? activity.tool, detail }
  }
}

export function getQuestionOptionLabel(option: TaskQuestionOption) {
  return option.label || option.value
}

export function parseCodexRawLogToActivity(line: string): TaskActivity | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('[thinking] ')) {
    return {
      type: 'thinking',
      provider: 'codex',
      preview: trimmed.slice('[thinking] '.length).trim(),
    }
  }

  if (trimmed.startsWith('[tool] ')) {
    const body = trimmed.slice('[tool] '.length).trim()
    const separatorIndex = body.indexOf(':')
    const tool = separatorIndex >= 0 ? body.slice(0, separatorIndex).trim() : body
    const detail = separatorIndex >= 0 ? body.slice(separatorIndex + 1).trim() : undefined
    return {
      type: 'tool_use',
      provider: 'codex',
      tool: tool || 'codex_tool',
      detail,
    }
  }

  if (trimmed.startsWith('[result] ') || trimmed.startsWith('[error] ')) {
    const isError = trimmed.startsWith('[error] ')
    return {
      type: 'tool_result',
      provider: 'codex',
      toolName: 'unknown',
      isError,
      preview: trimmed.slice(isError ? '[error] '.length : '[result] '.length).trim(),
    }
  }

  if (trimmed.startsWith('[done] ')) {
    return {
      type: 'status',
      provider: 'codex',
      message: trimmed.slice('[done] '.length).trim(),
    }
  }

  if (trimmed.startsWith('[system] ') || trimmed.startsWith('[agent] ')) {
    const prefixLength = trimmed.startsWith('[system] ') ? '[system] '.length : '[agent] '.length
    return {
      type: 'status',
      provider: 'codex',
      message: trimmed.slice(prefixLength).trim(),
    }
  }

  return {
    type: 'text',
    provider: 'codex',
    content: trimmed,
  }
}

// ── Progress helpers ─────────────────────────────────────────────────────────

/**
 * Returns the todos from the most recent TodoWrite / update_plan activity in the stream,
 * or null if none exist. Used by TaskDetailPane to derive the progress bar.
 */
export function extractLatestTodos(activities: TaskActivity[]): TodoItem[] | null {
  for (let i = activities.length - 1; i >= 0; i--) {
    const a = activities[i]
    if (a.type === 'tool_use' && a.kind === 'plan') {
      const todos = Array.isArray((a.metadata as any)?.todos)
        ? ((a.metadata as any).todos as TodoItem[])
        : null
      if (todos && todos.length > 0) return todos
    }
  }
  return null
}

// ── Card grouping ────────────────────────────────────────────────────────────

export type CardCategory = 'researching' | 'writing' | 'planning' | 'running' | 'thinking'

const KIND_TO_CATEGORY: Record<TaskToolPresentation['kind'], CardCategory> = {
  read:    'researching',
  search:  'researching',
  web:     'researching',
  agent:   'researching',
  mcp:     'researching',
  image:   'researching',
  info:    'researching',
  write:   'writing',
  create:  'writing',
  plan:    'planning',
  run:     'running',
}

export type CardEntry =
  | { kind: 'tool'; toolUse: Extract<TaskActivity, { type: 'tool_use' }>; toolResult: Extract<TaskActivity, { type: 'tool_result' }> | null }
  | { kind: 'thinking'; preview: string }

export type GroupedStreamItem =
  | { kind: 'card';      category: CardCategory; entries: CardEntry[] }
  | { kind: 'checklist'; todos: TodoItem[] }
  | { kind: 'result';    activity: Extract<TaskActivity, { type: 'text' }> }
  | { kind: 'status';    activity: Extract<TaskActivity, { type: 'status' }> }
  | { kind: 'log';       line: string }

/** Re-export for consumers that need the type without importing from shared */
export type { TodoItem }

export function groupActivitiesIntoCards(items: StreamItem[]): GroupedStreamItem[] {
  const result: GroupedStreamItem[] = []
  let currentCard: { category: CardCategory; entries: CardEntry[] } | null = null

  function flushCard() {
    if (currentCard) {
      result.push({ kind: 'card', category: currentCard.category, entries: currentCard.entries })
      currentCard = null
    }
  }

  for (const item of items) {
    if (item.kind === 'log') {
      flushCard()
      result.push({ kind: 'log', line: item.data })
      continue
    }

    const activity = item.data

    if (activity.type === 'tool_use') {
      const presentation = getToolPresentation(activity)

      // Plan activities with a todos array become a checklist card instead of a planning card.
      if (presentation.kind === 'plan') {
        const todos = Array.isArray((activity.metadata as any)?.todos)
          ? ((activity.metadata as any).todos as TodoItem[])
          : null
        if (todos && todos.length > 0) {
          flushCard()
          result.push({ kind: 'checklist', todos })
          continue
        }
      }

      const category = KIND_TO_CATEGORY[presentation.kind]
      if (currentCard && currentCard.category === category) {
        currentCard.entries.push({ kind: 'tool', toolUse: activity, toolResult: null })
      } else {
        flushCard()
        currentCard = { category, entries: [{ kind: 'tool', toolUse: activity, toolResult: null }] }
      }
      continue
    }

    if (activity.type === 'tool_result') {
      if (currentCard) {
        const last = currentCard.entries[currentCard.entries.length - 1]
        if (last?.kind === 'tool' && last.toolResult === null) {
          last.toolResult = activity
          continue
        }
      }
      // Orphaned result — drop silently
      continue
    }

    if (activity.type === 'thinking') {
      const category: CardCategory = 'thinking'
      if (currentCard && currentCard.category === category) {
        currentCard.entries.push({ kind: 'thinking', preview: activity.preview })
      } else {
        flushCard()
        currentCard = { category, entries: [{ kind: 'thinking', preview: activity.preview }] }
      }
      continue
    }

    if (activity.type === 'text') {
      flushCard()
      const last = result[result.length - 1]
      if (last?.kind === 'result') {
        // Merge consecutive text activities into one result card
        last.activity = { ...last.activity, content: last.activity.content + '\n\n' + activity.content }
      } else {
        result.push({ kind: 'result', activity })
      }
      continue
    }

    if (activity.type === 'status') {
      flushCard()
      result.push({ kind: 'status', activity })
      continue
    }
  }

  flushCard()
  return result
}
