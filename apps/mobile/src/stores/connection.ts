import { create } from 'zustand'
import type { ConnectionStatus } from '../services/websocket'
import { PocketDevWebSocket } from '../services/websocket'
import { buildWsUrl, unpairFromServer, setSecureMode } from '../services/api'
import { getServer, clearAll, type StoredServer } from '../services/storage'
import type { WsMessage } from '@pocketdev/shared/types'
import { useTaskStore } from './tasks'
import { useContainerStore } from './containers'
import { useSetupStore } from './setup'
import { usePlanStore } from './plan'
import { useNewTaskDraftStore } from './new-task-draft'
import { useScriptsStore } from './scripts'

interface ConnectionState {
  status: ConnectionStatus
  server: StoredServer | null
  ws: PocketDevWebSocket | null
  connect: () => void
  disconnect: () => void
  setPaired: (server: StoredServer) => void
  unpair: () => void
  loadFromStorage: () => void
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'disconnected',
  server: null,
  ws: null,

  loadFromStorage: () => {
    const server = getServer()
    console.log('[connection] loadFromStorage:', server ? { ip: server.ip, port: server.port, deviceId: server.deviceId } : 'no server stored')
    if (server) {
      set({ server })
      get().connect()
    }
  },

  connect: () => {
    const { server, ws: existingWs } = get()
    if (!server) {
      console.warn('[connection] connect() called but no server in store')
      return
    }

    console.log('[connection] Connecting to:', { ip: server.ip, port: server.port, secure: server.secure, deviceId: server.deviceId })
    existingWs?.disconnect()

    // Set the module-level secure flag so all API/WS calls use the right protocol
    setSecureMode(server.secure)

    const url = buildWsUrl(server.ip, server.port)
    const ws = new PocketDevWebSocket(
      url,
      (status) => {
        console.log('[connection] WebSocket status:', status)
        set({ status })
        if (status === 'connected') {
          useNewTaskDraftStore.getState().loadCapabilities()
        }
      },
      (message: WsMessage) => handleWsMessage(message),
    )

    set({ ws })
    ws.connect()
  },

  disconnect: () => {
    get().ws?.disconnect()
    set({ ws: null, status: 'disconnected' })
  },

  setPaired: (server: StoredServer) => {
    set({ server })
    get().connect()
  },

  unpair: () => {
    const { server, ws } = get()
    ws?.disconnect()
    if (server) {
      unpairFromServer(server.ip, server.port)
    }
    clearAll()
    set({ ws: null, server: null, status: 'disconnected' })
  },
}))

function handleWsMessage(message: WsMessage) {
  const tasks = useTaskStore.getState()
  const containers = useContainerStore.getState()
  const scripts = useScriptsStore.getState()

  switch (message.type) {
    case 'task.output': {
      const { task_id, data } = message.payload as { task_id: string; data: string }
      tasks.appendLog(task_id, data)
      scripts.handleTaskOutput(task_id, data)
      break
    }
    case 'task.status_changed': {
      const { task_id, status } = message.payload as { task_id: string; status: string }
      tasks.updateTaskStatus(task_id, status as any)
      scripts.handleTaskStatusChange(task_id, status)
      break
    }
    case 'task.permission_request':
      tasks.addPermissionRequest(
        (message.payload as { taskId: string }).taskId,
        (message.payload as { denials: Array<{ tool_name: string; tool_use_id?: string; tool_input?: Record<string, unknown> }> }).denials,
      )
      break
    case 'files.changed':
      // Phase 4 will handle file changes
      break
    case 'container.logs.chunk':
      containers.appendLogChunk(message.payload as any)
      break
    case 'container.logs.stopped':
      containers.handleLogsStopped(message.payload as any)
      break
    case 'setup.prerequisites_result':
      useSetupStore.setState({
        report: message.payload as any,
        loading: false,
      })
      useNewTaskDraftStore.getState().loadCapabilities()
      break
    case 'plan.proposed':
      usePlanStore.getState().handlePlanProposed(message.payload as any)
      break
    case 'plan.agent_message':
      usePlanStore.getState().handleAgentMessage(message.payload as any)
      break
    case 'plan.step_updated':
      usePlanStore.getState().handleStepUpdated(message.payload as any)
      break
    case 'plan.resolved':
      usePlanStore.getState().handlePlanResolved(message.payload as any)
      break
  }
}
