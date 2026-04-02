import { create } from 'zustand'
import type {
  PlanEntry as SharedPlanEntry,
  PlanProposedEvent,
  PlanAgentMessageEvent,
  PlanStepUpdatedEvent,
  PlanResolvedEvent,
} from '@pocketdev/shared/types'
import type {
  PlanEntry,
  PlanMessage,
  PlanView,
} from '../components/plan/model'
import { fetchActivePlan, fetchPlanHistory } from '../services/api'
import { useConnectionStore } from './connection'

type PlanState = {
  activePlan: PlanEntry | null
  history: PlanEntry[]
  activeView: PlanView
  lastActionMessage: string
  isRefreshing: boolean
  isSubmitting: boolean
  selectView: (view: PlanView) => void
  answerQuestion: (questionId: string, answer: string) => void
  updateNotes: (notes: string) => void
  sendMessage: (text: string) => void
  acceptPlan: () => void
  denyPlan: () => void
  refresh: () => void
  // WS event handlers
  handlePlanProposed: (event: PlanProposedEvent) => void
  handleAgentMessage: (event: PlanAgentMessageEvent) => void
  handleStepUpdated: (event: PlanStepUpdatedEvent) => void
  handlePlanResolved: (event: PlanResolvedEvent) => void
}

function getServer() {
  return useConnectionStore.getState().server
}

function getWs() {
  return useConnectionStore.getState().ws
}

function sharedToLocal(plan: SharedPlanEntry): PlanEntry {
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    agentName: plan.agentName,
    status: plan.status,
    steps: plan.steps,
    questions: plan.questions.map((q) => ({
      id: q.id,
      question: q.question,
      answer: q.answer ?? '',
      required: q.required,
    })),
    messages: plan.messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      relativeTime: m.createdAt,
    })),
    userNotes: plan.notes ?? '',
    createdRelativeTime: plan.createdAt,
    resolvedRelativeTime: plan.resolvedAt,
  }
}

export const usePlanStore = create<PlanState>((set, get) => ({
  activePlan: null,
  history: [],
  activeView: 'plan',
  lastActionMessage: 'Waiting for the agent to propose a plan.',
  isRefreshing: false,
  isSubmitting: false,

  selectView: (view) => set({ activeView: view }),

  answerQuestion: (questionId, answer) => {
    const ws = getWs()
    const plan = get().activePlan
    if (!ws || !plan) return

    // Update local state immediately
    set((state) => {
      if (!state.activePlan) return state
      return {
        activePlan: {
          ...state.activePlan,
          questions: state.activePlan.questions.map((q) =>
            q.id === questionId ? { ...q, answer } : q,
          ),
        },
        lastActionMessage: answer.trim() ? 'Answer saved.' : 'Answer cleared.',
      }
    })

    // Send to server
    ws.send('plan.answer', { planId: plan.id, questionId, answer })
  },

  updateNotes: (notes) => {
    set((state) => {
      if (!state.activePlan) return state
      return { activePlan: { ...state.activePlan, userNotes: notes } }
    })
  },

  sendMessage: (text) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const ws = getWs()
    const plan = get().activePlan
    if (!ws || !plan) return

    const userMsg: PlanMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      relativeTime: 'just now',
    }

    set((state) => {
      if (!state.activePlan) return state
      return {
        activePlan: {
          ...state.activePlan,
          messages: [...state.activePlan.messages, userMsg],
        },
        lastActionMessage: 'Message sent.',
      }
    })

    ws.send('plan.message', { planId: plan.id, text: trimmed })
  },

  acceptPlan: () => {
    const state = get()
    if (state.isSubmitting || !state.activePlan) return

    const ws = getWs()
    if (!ws) return

    set({ isSubmitting: true, lastActionMessage: 'Accepting plan...' })
    ws.send('plan.accept', {
      planId: state.activePlan.id,
      notes: state.activePlan.userNotes || undefined,
    })
  },

  denyPlan: () => {
    const state = get()
    if (state.isSubmitting || !state.activePlan) return

    const ws = getWs()
    if (!ws) return

    set({ isSubmitting: true, lastActionMessage: 'Denying plan...' })
    ws.send('plan.deny', {
      planId: state.activePlan.id,
      notes: state.activePlan.userNotes || undefined,
    })
  },

  refresh: async () => {
    if (get().isRefreshing) return

    const server = getServer()
    if (!server) {
      set({ lastActionMessage: 'Not connected to server.', error: 'Not connected' } as any)
      return
    }

    set({ isRefreshing: true, lastActionMessage: 'Refreshing plan state...' })

    try {
      const [active, history] = await Promise.all([
        fetchActivePlan(server.ip, server.port),
        fetchPlanHistory(server.ip, server.port),
      ])

      set({
        activePlan: active ? sharedToLocal(active) : null,
        history: history.map(sharedToLocal),
        isRefreshing: false,
        lastActionMessage: active
          ? `Active plan: "${active.title}" with ${active.steps.length} steps.`
          : `No active plan. ${history.length} plans in history.`,
      })
    } catch (err) {
      set({
        isRefreshing: false,
        lastActionMessage: 'Failed to load plan state.',
      })
    }
  },

  // ─── WS event handlers ──────────────────────────────────

  handlePlanProposed: (event) => {
    const plan: PlanEntry = {
      id: event.planId,
      title: event.title,
      description: event.description,
      agentName: event.agentName,
      status: 'pending',
      steps: event.steps,
      questions: event.questions.map((q) => ({
        id: q.id,
        question: q.question,
        answer: '',
        required: q.required,
      })),
      messages: [],
      userNotes: '',
      createdRelativeTime: 'just now',
    }

    set({
      activePlan: plan,
      activeView: 'plan',
      lastActionMessage: `New plan from ${event.agentName}: "${event.title}"`,
    })
  },

  handleAgentMessage: (event) => {
    set((state) => {
      if (!state.activePlan || state.activePlan.id !== event.planId) return state

      const msg: PlanMessage = {
        id: event.messageId,
        role: 'agent',
        text: event.text,
        relativeTime: 'just now',
      }

      return {
        activePlan: {
          ...state.activePlan,
          messages: [...state.activePlan.messages, msg],
        },
        lastActionMessage: `${state.activePlan.agentName} replied.`,
      }
    })
  },

  handleStepUpdated: (event) => {
    set((state) => {
      if (!state.activePlan || state.activePlan.id !== event.planId) return state

      return {
        activePlan: {
          ...state.activePlan,
          steps: state.activePlan.steps.map((s) =>
            s.id === event.stepId ? { ...s, completed: event.completed } : s,
          ),
        },
      }
    })
  },

  handlePlanResolved: (event) => {
    set((state) => {
      if (!state.activePlan || state.activePlan.id !== event.planId) {
        return { isSubmitting: false }
      }

      const resolved: PlanEntry = {
        ...state.activePlan,
        status: event.status,
        resolvedRelativeTime: 'just now',
      }

      return {
        activePlan: null,
        history: [resolved, ...state.history],
        isSubmitting: false,
        lastActionMessage: `Plan "${resolved.title}" ${event.status}.`,
      }
    })
  },
}))
