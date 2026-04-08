// ── Task Activity (structured events from AI CLI stream) ──

export type TaskActivity =
  | ToolUseActivity
  | ToolResultActivity
  | ThinkingActivity
  | TextActivity
  | StatusActivity

export interface ToolUseActivity {
  type: 'tool_use'
  tool: string
  filePath?: string
  command?: string
  pattern?: string
  description?: string
}

export interface ToolResultActivity {
  type: 'tool_result'
  toolName: string
  isError: boolean
  preview: string
}

export interface ThinkingActivity {
  type: 'thinking'
  preview: string
}

export interface TextActivity {
  type: 'text'
  content: string
}

export interface StatusActivity {
  type: 'status'
  message: string
}

export interface TaskActivityEvent {
  taskId: string
  activity: TaskActivity
  timestamp: number
}

// ── Task Questions (AI CLI prompts requiring user input) ──

export type QuestionType = 'permission' | 'yes_no' | 'multiple_choice' | 'free_response'

export interface TaskQuestion {
  questionId: string
  taskId: string
  prompt: string
  type: QuestionType
  options?: string[]
  toolDetails?: {
    toolName: string
    toolInput?: Record<string, unknown>
  }
}
