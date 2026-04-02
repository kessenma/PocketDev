export type PlanView = 'plan' | 'conversation' | 'history'

export type PlanStatus = 'pending' | 'accepted' | 'denied' | 'revised'

export type PlanStepKind = 'create' | 'modify' | 'delete' | 'run' | 'note'

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
  answer: string
  required: boolean
}

export interface PlanMessage {
  id: string
  role: 'agent' | 'user'
  text: string
  relativeTime: string
}

export interface PlanEntry {
  id: string
  title: string
  description: string
  agentName: string
  status: PlanStatus
  steps: PlanStep[]
  questions: PlanQuestion[]
  messages: PlanMessage[]
  userNotes: string
  createdRelativeTime: string
  resolvedRelativeTime?: string
}
