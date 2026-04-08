import { create } from 'zustand'
import type { Task, TaskActivity, TaskQuestion } from '@pocketdev/shared/types'
import type { TaskStatus, AgentType, TaskMode } from '@pocketdev/shared/schema'
import { fetchTaskList } from '../services/api'
import { useConnectionStore } from './connection'

export interface PermissionDenial {
  tool_name: string
  tool_use_id?: string
  tool_input?: Record<string, unknown>
}

interface TaskState {
  tasks: Map<string, Task>
  activeTaskId: string | null
  taskLogs: Map<string, string[]>
  taskActivities: Map<string, TaskActivity[]>
  pendingPermissions: Map<string, PermissionDenial[]>
  pendingQuestions: Map<string, TaskQuestion[]>
  setTasks: (tasks: Task[]) => void
  refreshFromServer: () => Promise<void>
  startTask: (
    prompt: string,
    agentType: AgentType,
    workingDirectory?: string | null,
    model?: string | null,
    mode?: TaskMode,
  ) => void
  killTask: (id: string) => void
  sendInput: (taskId: string, data: string) => void
  appendLog: (taskId: string, line: string) => void
  appendActivity: (taskId: string, activity: TaskActivity) => void
  updateTaskStatus: (taskId: string, status: TaskStatus) => void
  addPermissionRequest: (taskId: string, denials: PermissionDenial[]) => void
  clearPermissions: (taskId: string) => void
  addQuestion: (taskId: string, question: TaskQuestion) => void
  removeQuestion: (taskId: string, questionId: string) => void
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

  setTasks: (tasks: Task[]) => {
    const map = new Map<string, Task>()
    tasks.forEach((t) => map.set(t.id, t))
    set({ tasks: map })
  },

  refreshFromServer: async () => {
    const server = useConnectionStore.getState().server
    if (!server) return

    const taskList = await fetchTaskList(server.ip, server.port) as Task[]
    const activeTaskId = get().activeTaskId
    const nextActiveTaskId = activeTaskId && taskList.some((task) => task.id === activeTaskId)
      ? activeTaskId
      : taskList[0]?.id ?? null

    get().setTasks(taskList)
    set({ activeTaskId: nextActiveTaskId })
  },

  startTask: (prompt: string, agentType: AgentType, workingDirectory = null, model = null, mode = 'default') => {
    const ws = useConnectionStore.getState().ws
    if (!ws) return

    ws.send('task.start', { prompt, agentType, workingDirectory, model, mode })
    setTimeout(() => {
      void get().refreshFromServer().catch(() => {})
    }, 250)
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
