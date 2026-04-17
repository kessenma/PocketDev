import type { TaskActivity, TaskToolKind } from '@pocketdev/shared/types'
import { asRecord, truncate, stringifyUnknown } from './utils.ts'

export function createToolUseActivity(opts: {
  provider: string
  tool: string
  toolCallId: string
  input: Record<string, unknown>
}): TaskActivity & { type: 'tool_use' } {
  const activity: TaskActivity & { type: 'tool_use' } = {
    type: 'tool_use',
    provider: opts.provider,
    tool: opts.tool,
    toolCallId: opts.toolCallId,
  }

  if (typeof opts.input.file_path === 'string') activity.filePath = opts.input.file_path
  if (typeof opts.input.path === 'string' && !activity.filePath) activity.filePath = opts.input.path
  if (typeof opts.input.command === 'string') activity.command = truncate(opts.input.command, 300)
  if (typeof opts.input.pattern === 'string') activity.pattern = opts.input.pattern
  if (typeof opts.input.description === 'string') activity.description = opts.input.description

  const normalized = classifyToolUse(opts.tool, opts.input)
  activity.kind = normalized.kind
  activity.title = normalized.title
  activity.detail = normalized.detail
  activity.metadata = normalized.metadata

  return activity
}

export function classifyToolUse(tool: string, input: Record<string, unknown>): {
  kind: TaskToolKind
  title: string
  detail?: string
  metadata?: Record<string, unknown>
} {
  const normalizedTool = tool.toLowerCase()
  const filePath = typeof input.file_path === 'string'
    ? input.file_path
    : typeof input.path === 'string'
      ? input.path
      : undefined
  const command = typeof input.command === 'string' ? input.command : undefined
  const pattern = typeof input.pattern === 'string' ? input.pattern : undefined
  const description = typeof input.description === 'string' ? input.description : undefined

  if (normalizedTool === 'write') {
    return { kind: 'create', title: 'Creating', detail: filePath }
  }
  if (normalizedTool === 'edit' || normalizedTool === 'apply_patch' || normalizedTool === 'filechange' || normalizedTool === 'file_change') {
    return { kind: 'write', title: 'Editing', detail: filePath ?? summarizeFileChanges(input.changes) }
  }
  if (normalizedTool === 'read') {
    return { kind: 'read', title: 'Reading', detail: filePath }
  }
  if (normalizedTool === 'glob' || normalizedTool === 'listfiles' || normalizedTool === 'list_files') {
    return { kind: 'search', title: 'Finding', detail: filePath ?? pattern }
  }
  if (normalizedTool === 'grep' || normalizedTool === 'search') {
    return { kind: 'search', title: 'Searching', detail: pattern ?? filePath }
  }
  if (normalizedTool === 'bash' || normalizedTool === 'exec_command' || normalizedTool === 'command_execution') {
    return { kind: 'run', title: 'Running', detail: command ?? description }
  }
  if (normalizedTool === 'agent' || normalizedTool === 'spawnagent' || normalizedTool === 'spawn_agent') {
    return { kind: 'agent', title: 'Sub-agent', detail: description ?? command }
  }
  if (normalizedTool === 'sendinput' || normalizedTool === 'send_input' || normalizedTool === 'resumeagent' || normalizedTool === 'resume_agent' || normalizedTool === 'waitforagents' || normalizedTool === 'closeagent' || normalizedTool === 'close_agent') {
    return { kind: 'agent', title: 'Agent Action', detail: description ?? command }
  }
  if (normalizedTool === 'todowrite' || normalizedTool === 'update_plan' || normalizedTool === 'codextodolist' || normalizedTool === 'plan') {
    // Include the raw todos/items array in metadata for the checklist card + progress bar on mobile.
    const todos = Array.isArray(input.todos) ? input.todos
      : Array.isArray(input.items) ? input.items
      : undefined
    return {
      kind: 'plan',
      title: 'Planning',
      detail: description ?? summarizeTodoList(input),
      ...(todos ? { metadata: { todos } } : {}),
    }
  }
  if (normalizedTool.startsWith('mcp:') || normalizedTool === 'mcp_tool_call') {
    return { kind: 'mcp', title: 'MCP', detail: description ?? command ?? tool }
  }
  if (normalizedTool === 'codexwebsearch' || normalizedTool === 'web_search') {
    return { kind: 'web', title: 'Web Search', detail: description ?? stringifyUnknown(input) }
  }
  if (normalizedTool === 'codeximagegeneration' || normalizedTool === 'image_generation' || normalizedTool === 'codeximageview' || normalizedTool === 'image_view') {
    return { kind: 'image', title: 'Image Tool', detail: description ?? stringifyUnknown(input) }
  }

  return {
    kind: 'info',
    title: tool,
    detail: command ?? filePath ?? pattern ?? description,
  }
}

function summarizeFileChanges(changes: unknown): string | undefined {
  if (!Array.isArray(changes) || changes.length === 0) return undefined
  const paths = changes
    .map((change) => {
      const entry = asRecord(change)
      const direct = typeof entry.path === 'string'
        ? entry.path
        : typeof entry.file_path === 'string'
          ? entry.file_path
          : typeof entry.move_path === 'string'
            ? entry.move_path
            : null
      return direct
    })
    .filter((value): value is string => Boolean(value))

  if (paths.length === 0) return `${changes.length} file change${changes.length === 1 ? '' : 's'}`
  if (paths.length === 1) return paths[0]
  return `${paths[0]} +${paths.length - 1} more`
}

function summarizeTodoList(input: Record<string, unknown>): string | undefined {
  const items = Array.isArray(input.items) ? input.items : Array.isArray(input.todos) ? input.todos : []
  if (!items.length) return undefined
  return `${items.length} item${items.length === 1 ? '' : 's'}`
}
