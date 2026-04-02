import type {
  PlanEntry,
  PlanStep,
  PlanQuestion,
  PlanProposedEvent,
  PlanAgentMessageEvent,
  PlanStepUpdatedEvent,
  PlanResolvedEvent,
  PlanAnswerCommand,
  PlanMessageCommand,
  PlanAcceptCommand,
  PlanDenyCommand,
} from '@pocketdev/shared/types'
import {
  insertPlan,
  insertPlanStep,
  insertPlanQuestion,
  insertPlanMessage,
  updatePlanQuestionAnswer,
  updatePlanStepCompleted,
  resolvePlan,
  getActivePlan,
  getPlanSteps,
  getPlanQuestions,
  getPlanMessages,
  getPlanHistory as dbGetPlanHistory,
  type PlanRow,
} from '../db/index.ts'
import { broadcast, makeMessage } from './ws.ts'

// ─── Plan lifecycle ──────────────────────────────────────

export function proposePlan(
  taskId: string,
  title: string,
  description: string,
  agentName: string,
  steps: PlanStep[],
  questions: PlanQuestion[],
): string {
  const planId = crypto.randomUUID()

  insertPlan(planId, taskId, title, description, agentName)

  steps.forEach((step, index) => {
    insertPlanStep(step.id, planId, step.kind, step.title, step.description, step.filePath ?? null, index)
  })

  questions.forEach((q) => {
    insertPlanQuestion(q.id, planId, q.question, q.required)
  })

  const event: PlanProposedEvent = {
    planId,
    taskId,
    title,
    description,
    agentName,
    steps,
    questions,
  }

  broadcast(makeMessage('plan.proposed', event))
  return planId
}

export function handleAnswer(payload: PlanAnswerCommand): void {
  updatePlanQuestionAnswer(payload.questionId, payload.answer)
}

export function handlePlanMessage(payload: PlanMessageCommand, _deviceId: string): void {
  const messageId = crypto.randomUUID()
  insertPlanMessage(messageId, payload.planId, 'user', payload.text)

  // Broadcast to all clients so other connected devices see it too
  broadcast(makeMessage('plan.agent_message', {
    planId: payload.planId,
    messageId,
    text: payload.text,
  } satisfies PlanAgentMessageEvent))
}

export function acceptPlan(payload: PlanAcceptCommand): void {
  resolvePlan(payload.planId, 'accepted', payload.notes)

  broadcast(makeMessage('plan.resolved', {
    planId: payload.planId,
    status: 'accepted',
  } satisfies PlanResolvedEvent))
}

export function denyPlan(payload: PlanDenyCommand): void {
  resolvePlan(payload.planId, 'denied', payload.notes)

  broadcast(makeMessage('plan.resolved', {
    planId: payload.planId,
    status: 'denied',
  } satisfies PlanResolvedEvent))
}

export function markStepCompleted(planId: string, stepId: string, completed: boolean): void {
  updatePlanStepCompleted(stepId, completed)

  broadcast(makeMessage('plan.step_updated', {
    planId,
    stepId,
    completed,
  } satisfies PlanStepUpdatedEvent))
}

// ─── Emitting agent messages (called from task output parsing) ───

export function emitAgentMessage(planId: string, text: string): void {
  const messageId = crypto.randomUUID()
  insertPlanMessage(messageId, planId, 'agent', text)

  broadcast(makeMessage('plan.agent_message', {
    planId,
    messageId,
    text,
  } satisfies PlanAgentMessageEvent))
}

// ─── Query helpers ───────────────────────────────────────

export function getActivePlanEntry(): PlanEntry | null {
  const row = getActivePlan()
  if (!row) return null
  return rowToPlanEntry(row)
}

export function getPlanHistoryEntries(limit = 20): PlanEntry[] {
  const rows = dbGetPlanHistory(limit)
  return rows.map(rowToPlanEntry)
}

function rowToPlanEntry(row: PlanRow): PlanEntry {
  const steps = getPlanSteps(row.id)
  const questions = getPlanQuestions(row.id)
  const messages = getPlanMessages(row.id)

  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    description: row.description ?? '',
    agentName: row.agent_name ?? '',
    status: row.status as PlanEntry['status'],
    steps: steps.map((s) => ({
      id: s.id,
      kind: s.kind as PlanStep['kind'],
      title: s.title,
      description: s.description ?? '',
      filePath: s.file_path ?? undefined,
      completed: s.completed === 1,
    })),
    questions: questions.map((q) => ({
      id: q.id,
      question: q.question,
      answer: q.answer ?? undefined,
      required: q.required === 1,
    })),
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role as 'agent' | 'user',
      text: m.text,
      createdAt: m.created_at,
    })),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  }
}
