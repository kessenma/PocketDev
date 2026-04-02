export type PlanStepKind = 'create' | 'modify' | 'delete' | 'run' | 'note'

export type PlanStatus = 'pending' | 'accepted' | 'denied'

export interface PlanStep {
  id: string
  kind: PlanStepKind
  title: string
  description: string
  filePath?: string
  completed: boolean
}

export interface PlanQuestion {
  id: string
  question: string
  answer?: string
  required: boolean
}

export interface PlanMessageEntry {
  id: string
  role: 'agent' | 'user'
  text: string
  createdAt: string
}

export interface PlanEntry {
  id: string
  taskId: string
  title: string
  description: string
  agentName: string
  status: PlanStatus
  steps: PlanStep[]
  questions: PlanQuestion[]
  messages: PlanMessageEntry[]
  notes?: string
  createdAt: string
  resolvedAt?: string
}

// ─── WebSocket event payloads ────────────────────────────

export interface PlanProposedEvent {
  planId: string
  taskId: string
  title: string
  description: string
  agentName: string
  steps: PlanStep[]
  questions: PlanQuestion[]
}

export interface PlanAgentMessageEvent {
  planId: string
  messageId: string
  text: string
}

export interface PlanStepUpdatedEvent {
  planId: string
  stepId: string
  completed: boolean
}

export interface PlanResolvedEvent {
  planId: string
  status: 'accepted' | 'denied'
}

// ─── WebSocket command payloads ──────────────────────────

export interface PlanAnswerCommand {
  planId: string
  questionId: string
  answer: string
}

export interface PlanMessageCommand {
  planId: string
  text: string
}

export interface PlanAcceptCommand {
  planId: string
  notes?: string
}

export interface PlanDenyCommand {
  planId: string
  notes?: string
}
