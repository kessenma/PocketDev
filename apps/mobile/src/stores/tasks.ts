import { create } from 'zustand'
import type { DB } from '@op-engineering/op-sqlite'
import type { Task, TaskTurn, TaskActivity, TaskQuestion } from '@pocketdev/shared/types'
import type { TaskStatus, AgentType, TaskMode } from '@pocketdev/shared/schema'
import { fetchTaskList, fetchTaskLogs, fetchTaskTurns } from '../services/api'
import {
  upsertTasks,
  getCachedTasks,
  saveTaskLogs,
  getCachedTaskLogs,
  hasTaskLogs,
  updateCachedTaskStatus,
  deleteOldTasks,
  upsertTaskTurns,
  getCachedTaskTurns,
} from '../db/taskOperations'
import { useConnectionStore } from './connection'

/**
 * Normalize a task object from the server (camelCase Drizzle rows) to our snake_case Task interface.
 * Handles both camelCase and snake_case input for robustness.
 */
function normalizeTask(raw: any): Task {
  return {
    id: raw.id,
    prompt: raw.prompt,
    agent_type: raw.agent_type ?? raw.agentType ?? 'claude',
    mode: raw.mode ?? 'default',
    model: raw.model ?? null,
    status: raw.status ?? 'pending',
    working_directory: raw.working_directory ?? raw.workingDirectory ?? null,
    project_id: raw.project_id ?? raw.projectId ?? null,
    project_name: raw.project_name ?? raw.projectName ?? null,
    session_id: raw.session_id ?? raw.sessionId ?? null,
    turn_count: raw.turn_count ?? raw.turnCount ?? 1,
    created_at: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    started_at: raw.started_at ?? raw.startedAt ?? null,
    completed_at: raw.completed_at ?? raw.completedAt ?? null,
  }
}

export interface PermissionDenial {
  tool_name: string
  tool_use_id?: string
  tool_input?: Record<string, unknown>
}

// Module-level DB reference — set from TaskDatabaseProvider
let _db: DB | null = null

export function setTaskStoreDb(db: DB | null) {
  _db = db
}

interface TaskState {
  tasks: Map<string, Task>
  activeTaskId: string | null
  taskLogs: Map<string, string[]>
  taskActivities: Map<string, TaskActivity[]>
  taskTurns: Map<string, TaskTurn[]>
  pendingPermissions: Map<string, PermissionDenial[]>
  pendingQuestions: Map<string, TaskQuestion[]>
  setTasks: (tasks: Task[]) => void
  refreshFromServer: () => Promise<void>
  loadLogsForTask: (taskId: string) => Promise<void>
  loadTurnsForTask: (taskId: string) => Promise<void>
  startTask: (
    prompt: string,
    agentType: AgentType,
    workingDirectory?: string | null,
    model?: string | null,
    mode?: TaskMode,
  ) => void
  continueTask: (taskId: string, prompt: string, model?: string | null) => void
  killTask: (id: string) => void
  sendInput: (taskId: string, data: string) => void
  appendLog: (taskId: string, line: string) => void
  appendActivity: (taskId: string, activity: TaskActivity) => void
  updateTaskStatus: (taskId: string, status: TaskStatus) => void
  addPermissionRequest: (taskId: string, denials: PermissionDenial[]) => void
  clearPermissions: (taskId: string) => void
  addQuestion: (taskId: string, question: TaskQuestion) => void
  removeQuestion: (taskId: string, questionId: string) => void
  clearQuestions: (taskId: string) => void
  answerQuestion: (taskId: string, questionId: string, answer: string) => void
  setActiveTask: (id: string | null) => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: new Map(),
  pendingPermissions: new Map(),
  pendingQuestions: new Map(),
  activeTaskId: null,
  taskLogs: new Map(),
  taskActivities: new Map(),
  taskTurns: new Map(),

  setTasks: (tasks: Task[]) => {
    const map = new Map<string, Task>()
    tasks.forEach((t) => map.set(t.id, normalizeTask(t)))
    set({ tasks: map })
  },

  refreshFromServer: async () => {
    const server = useConnectionStore.getState().server
    if (!server) return

    // Load from local DB first for instant display (if in-memory is empty)
    if (get().tasks.size === 0 && _db) {
      try {
        const cached = await getCachedTasks(_db)
        if (cached.length > 0) {
          get().setTasks(cached)
        }
      } catch { /* ignore cache failures */ }
    }

    // Then fetch from server and update both in-memory + local DB
    const taskList = await fetchTaskList(server.ip, server.port) as Task[]
    const activeTaskId = get().activeTaskId
    const nextActiveTaskId = activeTaskId && taskList.some((task) => task.id === activeTaskId)
      ? activeTaskId
      : taskList[0]?.id ?? null

    get().setTasks(taskList)
    set({ activeTaskId: nextActiveTaskId })

    // Persist to local DB in background
    if (_db) {
      void upsertTasks(_db, taskList).catch(() => {})
      void deleteOldTasks(_db, 100).catch(() => {})
    }
  },

  loadLogsForTask: async (taskId: string) => {
    // Partition log rows into raw output lines and rehydrated activities.
    // Agent persists hook-sourced activities as rows with stream === 'activity'
    // (JSON-encoded TaskActivity) so TaskStreamer can rehydrate after reload.
    const applyRows = (rows: Array<{ stream: string; line: string }>) => {
      const lines: string[] = []
      const activities: TaskActivity[] = []
      for (const row of rows) {
        if (row.stream === 'activity') {
          try { activities.push(JSON.parse(row.line) as TaskActivity) } catch { /* skip malformed */ }
        } else {
          lines.push(row.line)
        }
      }
      set((state) => {
        const logs = new Map(state.taskLogs)
        logs.set(taskId, lines)
        if (activities.length === 0) return { taskLogs: logs }
        // Only overwrite if we don't already have a richer live-streamed set
        const existing = state.taskActivities.get(taskId) ?? []
        if (activities.length <= existing.length) return { taskLogs: logs }
        const nextActivities = new Map(state.taskActivities)
        nextActivities.set(taskId, activities)
        return { taskLogs: logs, taskActivities: nextActivities }
      })
    }

    // Already have logs in memory — skip
    const existingLogs = get().taskLogs.get(taskId)
    if (existingLogs && existingLogs.length > 0) return

    // Try local DB first
    if (_db) {
      try {
        const hasCached = await hasTaskLogs(_db, taskId)
        if (hasCached) {
          const cachedRows = await getCachedTaskLogs(_db, taskId)
          if (cachedRows.length > 0) {
            applyRows(cachedRows)
            return
          }
        }
      } catch { /* fall through to server */ }
    }

    // Fetch from server
    const server = useConnectionStore.getState().server
    if (!server) return

    try {
      const result = await fetchTaskLogs(server.ip, server.port, taskId)
      applyRows(result.logs)

      // Cache to local DB (preserves stream so activities rehydrate on next open)
      if (_db) {
        void saveTaskLogs(_db, taskId, result.logs).catch(() => {})
      }
    } catch {
      // Silent fail — logs just won't show
    }
  },

  loadTurnsForTask: async (taskId: string) => {
    // Already loaded
    const existing = get().taskTurns.get(taskId)
    if (existing && existing.length > 0) return

    // Try local DB cache first
    if (_db) {
      try {
        const cached = await getCachedTaskTurns(_db, taskId)
        if (cached.length > 0) {
          set((state) => {
            const turns = new Map(state.taskTurns)
            turns.set(taskId, cached)
            return { taskTurns: turns }
          })
          return
        }
      } catch { /* fall through */ }
    }

    // Fetch from server
    const server = useConnectionStore.getState().server
    if (!server) return

    try {
      const result = await fetchTaskTurns(server.ip, server.port, taskId)
      const typedTurns = result.turns as TaskTurn[]
      set((state) => {
        const turns = new Map(state.taskTurns)
        turns.set(taskId, typedTurns)
        return { taskTurns: turns }
      })

      // Cache locally
      if (_db) {
        void upsertTaskTurns(_db, taskId, typedTurns).catch(() => {})
      }
    } catch { /* silent */ }
  },

  continueTask: (taskId: string, prompt: string, model = null) => {
    const ws = useConnectionStore.getState().ws
    if (!ws) return

    ws.send('task.continue', { taskId, prompt, model })

    // Optimistically add the user turn
    const task = get().tasks.get(taskId)
    const turnNumber = (task?.turn_count ?? 1) + 1
    const newTurn: TaskTurn = {
      id: crypto.randomUUID(),
      task_id: taskId,
      turn_number: turnNumber,
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    }
    set((state) => {
      const turns = new Map(state.taskTurns)
      const existing = turns.get(taskId) ?? []
      turns.set(taskId, [...existing, newTurn])
      return { taskTurns: turns }
    })
  },

  startTask: (prompt: string, agentType: AgentType, workingDirectory = null, model = null, mode = 'default') => {
    const ws = useConnectionStore.getState().ws
    if (!ws) return

    ws.send('task.start', { prompt, agentType, workingDirectory, model, mode })
    setTimeout(() => {
      void get().refreshFromServer().catch(() => {})
    }, 500)
    setTimeout(() => {
      void get().refreshFromServer().catch(() => {})
    }, 2000)
  },

  killTask: (id: string) => {
    const ws = useConnectionStore.getState().ws
    if (!ws) return

    ws.send('task.kill', { taskId: id })
  },

  sendInput: (taskId: string, data: string) => {
    const ws = useConnectionStore.getState().ws
    if (!ws) return

    ws.send('task.input', { taskId, data })
  },

  appendLog: (taskId: string, line: string) => {
    set((state) => {
      const logs = new Map(state.taskLogs)
      const existing = logs.get(taskId) ?? []
      logs.set(taskId, [...existing, line])
      return { taskLogs: logs }
    })
  },

  appendActivity: (taskId: string, activity: TaskActivity) => {
    set((state) => {
      const activities = new Map(state.taskActivities)
      const existing = activities.get(taskId) ?? []
      activities.set(taskId, [...existing, activity])
      return { taskActivities: activities }
    })
  },

  updateTaskStatus: (taskId: string, status: TaskStatus) => {
    set((state) => {
      const tasks = new Map(state.tasks)
      const task = tasks.get(taskId)
      if (task) {
        tasks.set(taskId, { ...task, status })

        // On completion, cache logs to local DB after a short delay
        const isTerminal = status === 'completed' || status === 'failed' || status === 'killed'
        if (isTerminal && _db) {
          const logs = state.taskLogs.get(taskId)
          if (logs && logs.length > 0) {
            const db = _db
            setTimeout(() => {
              void saveTaskLogs(db, taskId, logs.map((line) => ({ stream: 'stdout', line }))).catch(() => {})
              void updateCachedTaskStatus(db, taskId, status).catch(() => {})
            }, 500)
          }
        }

        return { tasks }
      }

      setTimeout(() => {
        void get().refreshFromServer().catch(() => {})
      }, 0)
      return state
    })
  },

  addPermissionRequest: (taskId: string, denials: PermissionDenial[]) => {
    set((state) => {
      const pending = new Map(state.pendingPermissions)
      const existing = pending.get(taskId) ?? []
      pending.set(taskId, [...existing, ...denials])
      return { pendingPermissions: pending }
    })
  },

  clearPermissions: (taskId: string) => {
    set((state) => {
      const pending = new Map(state.pendingPermissions)
      pending.delete(taskId)
      return { pendingPermissions: pending }
    })
  },

  addQuestion: (taskId: string, question: TaskQuestion) => {
    set((state) => {
      const questions = new Map(state.pendingQuestions)
      const existing = questions.get(taskId) ?? []
      questions.set(taskId, [...existing, question])
      return { pendingQuestions: questions }
    })
  },

  removeQuestion: (taskId: string, questionId: string) => {
    set((state) => {
      const questions = new Map(state.pendingQuestions)
      const existing = questions.get(taskId) ?? []
      const filtered = existing.filter((q) => q.questionId !== questionId)
      if (filtered.length === 0) {
        questions.delete(taskId)
      } else {
        questions.set(taskId, filtered)
      }
      return { pendingQuestions: questions }
    })
  },

  clearQuestions: (taskId: string) => {
    set((state) => {
      const questions = new Map(state.pendingQuestions)
      questions.delete(taskId)
      return { pendingQuestions: questions }
    })
  },

  answerQuestion: (taskId: string, questionId: string, answer: string) => {
    const ws = useConnectionStore.getState().ws
    if (ws) {
      ws.send('task.answer', { taskId, questionId, answer })
    }
    get().removeQuestion(taskId, questionId)
  },

  setActiveTask: (id: string | null) => {
    set({ activeTaskId: id })
  },
}))
