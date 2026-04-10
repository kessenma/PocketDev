// ── Task Activity (structured events from AI CLI stream) ──

export type TaskActivity =
  | ToolUseActivity
  | ToolResultActivity
  | ThinkingActivity
  | TextActivity
  | StatusActivity

export type TaskToolKind =
  | 'read'
  | 'search'
  | 'write'
  | 'create'
  | 'run'
  | 'agent'
  | 'plan'
  | 'mcp'
  | 'web'
  | 'image'
  | 'info'

export interface ToolUseActivity {
  type: 'tool_use'
  tool: string
  toolCallId?: string
  provider?: string
  kind?: TaskToolKind
  title?: string
  detail?: string
  filePath?: string
  command?: string
  pattern?: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface ToolResultActivity {
  type: 'tool_result'
  toolName: string
  toolCallId?: string
  provider?: string
  isError: boolean
  preview: string
  metadata?: Record<string, unknown>
}

export interface ThinkingActivity {
  type: 'thinking'
  provider?: string
  preview: string
}

export interface TextActivity {
  type: 'text'
  provider?: string
  content: string
}

export interface StatusActivity {
  type: 'status'
  provider?: string
  message: string
}

export interface TaskActivityEvent {
  taskId: string
  activity: TaskActivity
  timestamp: number
}

// ── Task Questions (AI CLI prompts requiring user input) ──

export type QuestionType = 'permission' | 'yes_no' | 'multiple_choice' | 'free_response' | 'form'

export interface TaskQuestionOption {
  value: string
  label: string
  description?: string
}

export interface TaskQuestionField {
  id: string
  header?: string
  prompt: string
  options?: TaskQuestionOption[]
  allowOther?: boolean
  isSecret?: boolean
}

export interface TaskQuestion {
  questionId: string
  taskId: string
  prompt: string
  type: QuestionType
  provider?: string
  options?: TaskQuestionOption[]
  fields?: TaskQuestionField[]
  toolDetails?: {
    toolName: string
    toolInput?: Record<string, unknown>
    detail?: string
  }
  metadata?: Record<string, unknown>
}
