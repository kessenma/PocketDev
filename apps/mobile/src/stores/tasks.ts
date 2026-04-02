import { create } from 'zustand'
import type { Task } from '@pocketdev/shared/types'
import type { TaskStatus, AgentType } from '@pocketdev/shared/schema'
import { useConnectionStore } from './connection'

interface TaskState {
  tasks: Map<string, Task>
  activeTaskId: string | null
  taskLogs: Map<string, string[]>
  setTasks: (tasks: Task[]) => void
  startTask: (prompt: string, agentType: AgentType) => void
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

  startTask: (prompt: string, agentType: AgentType) => {
    const ws = useConnectionStore.getState().ws
    if (!ws) return

    ws.send('task.start', { prompt, agent_type: agentType })
  },

  killTask: (id: string) => {
    const ws = useConnectionStore.getState().ws
    if (!ws) return

    ws.send('task.kill', { task_id: id })
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
      }
      return { tasks }
    })
  },

  setActiveTask: (id: string | null) => {
    set({ activeTaskId: id })
  },
}))
