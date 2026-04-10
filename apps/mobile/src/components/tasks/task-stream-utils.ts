import type { TaskQuestionOption, ToolUseActivity } from '@pocketdev/shared/types'

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
