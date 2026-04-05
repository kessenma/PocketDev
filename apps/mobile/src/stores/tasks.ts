import { create } from 'zustand'
import type { Task } from '@pocketdev/shared/types'
import type { TaskStatus, AgentType, TaskMode } from '@pocketdev/shared/schema'
import { fetchTaskList } from '../services/api'
import { useConnectionStore } from './connection'

interface TaskState {
  tasks: Map<string, Task>
  activeTaskId: string | null
  taskLogs: Map<string, string[]>
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
  appendLog: (taskId: string, line: string) => void
  updateTaskStatus: (taskId: string, status: TaskStatus) => void
  setActiveTask: (id: string | null) => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: new Map(),
  activeTaskId: null,
  taskLogs: new Map(),

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

  appendLog: (taskId: string, line: string) => {
    set((state) => {
      const logs = new Map(state.taskLogs)
      const existing = logs.get(taskId) ?? []
      logs.set(taskId, [...existing, line])
      return { taskLogs: logs }
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

  setActiveTask: (id: string | null) => {
    set({ activeTaskId: id })
  },
}))
