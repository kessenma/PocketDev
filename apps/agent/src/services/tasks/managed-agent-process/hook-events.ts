import type { TaskActivity } from '@pocketdev/shared/types'
import { inferToolKindFromName } from './pane-activity.ts'

export function extractToolDetail(toolName: string, input: Record<string, unknown>): string | undefined {
  const n = toolName.toLowerCase()
  if (n === 'read' || n === 'write' || n === 'edit' || n === 'multiedit') {
    const p = (input.file_path ?? input.path) as string | undefined
    return p ? p.split('/').pop() : undefined
  }
  if (n === 'bash') {
    const cmd = input.command as string | undefined
    return cmd ? cmd.slice(0, 60) : undefined
  }
  if (n === 'glob') return input.pattern as string | undefined
  if (n === 'grep') return (input.pattern ?? input.query) as string | undefined
  const first = Object.values(input).find((v) => typeof v === 'string')
  return typeof first === 'string' ? first.slice(0, 60) : undefined
}

export function extractToolResultPreview(_toolName: string, response: Record<string, unknown>): string | undefined {
  const out = (response.output ?? response.content ?? response.result) as string | undefined
  if (!out) return undefined
  const lines = out.split('\n')
  return lines[0]?.slice(0, 100) + (lines.length > 1 ? ` … (${lines.length} lines)` : '')
}

export function parseHookEvent(raw: string): { activity: TaskActivity | null; isStop: boolean } {
  let event: Record<string, unknown>
  try { event = JSON.parse(raw) } catch { return { activity: null, isStop: false } }

  const eventName = (event.hook_event_name ?? event.hookEventName) as string | undefined
  const toolName = (event.tool_name ?? event.toolName) as string | undefined
  const toolInput = (event.tool_input ?? event.toolInput) as Record<string, unknown> | undefined
  const toolResponse = (event.tool_response ?? event.toolResponse) as Record<string, unknown> | undefined

  if (eventName === 'Stop') return { activity: null, isStop: true }

  if (eventName === 'PreToolUse' && toolName) {
    const todos = toolName === 'TodoWrite' && Array.isArray(toolInput?.todos) ? toolInput.todos : undefined
    return {
      isStop: false,
      activity: {
        type: 'tool_use',
        provider: 'claude',
        tool: toolName,
        kind: inferToolKindFromName(toolName),
        title: toolName,
        detail: toolInput ? extractToolDetail(toolName, toolInput) : undefined,
        ...(todos ? { metadata: { todos } } : {}),
      },
    }
  }

  if (eventName === 'PostToolUse' && toolName) {
    return {
      isStop: false,
      activity: {
        type: 'tool_result',
        provider: 'claude',
        toolName,
        isError: false,
        preview: (toolResponse ? extractToolResultPreview(toolName, toolResponse) : undefined) ?? '',
      },
    }
  }

  return { activity: null, isStop: false }
}
