import { create } from 'zustand'
import type { ConnectionStatus } from '../services/websocket'
import { PocketDevWebSocket } from '../services/websocket'
import { buildWsUrl, unpairFromServer, setSecureMode, fetchLockStatus, wakeServer, registerPushToken } from '../services/api'
import { getServer, clearAll, getPushNotificationsEnabled, type StoredServer } from '../services/storage'
import { getApnsToken } from '../services/push-notifications'
import type { WsMessage } from '@pocketdev/shared/types'
import { useTaskStore } from './tasks'
import { useContainerStore } from './containers'
import { useSetupStore } from './setup'
import { usePlanStore } from './plan'
import { useNewTaskDraftStore } from './new-task-draft'
import { useScriptsStore } from './scripts'
import { navigationRef } from '../navigation/ref'

export interface ConnectionEvent {
  timestamp: number
  event: string
  detail?: string
}

const CONNECTION_LOG_MAX = 100

interface ConnectionState {
  status: ConnectionStatus
  server: StoredServer | null
  ws: PocketDevWebSocket | null
  connectionLog: ConnectionEvent[]
  serverLocked: boolean
  connect: () => void
  disconnect: () => void
  setPaired: (server: StoredServer) => void
  unpair: () => void
  loadFromStorage: () => void
  getConnectionLogText: () => string
  setServerLocked: (locked: boolean) => void
  wakeAndConnect: () => Promise<void>
}

const _initialServer = getServer()
if (_initialServer) setSecureMode(_initialServer.secure)

function pushLog(set: Function, get: Function, event: string, detail?: string) {
  const entry: ConnectionEvent = { timestamp: Date.now(), event, detail }
  const log = get().connectionLog
  const next = [...log, entry]
  if (next.length > CONNECTION_LOG_MAX) next.splice(0, next.length - CONNECTION_LOG_MAX)
  set({ connectionLog: next })
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'disconnected',
  server: _initialServer,
  ws: null,
  connectionLog: [],
  serverLocked: false,

  setServerLocked: (locked: boolean) => set({ serverLocked: locked }),

  wakeAndConnect: async () => {
    const { server } = get()
    if (!server) return
    pushLog(set, get, 'wakeAndConnect()', `ip=${server.ip}`)
    try {
      const status = await fetchLockStatus(server.ip, server.port).catch(() => null)
      const wakePort = status?.wakePort ?? 4388
      const ok = await wakeServer(server.ip, wakePort)
      if (ok) {
        set({ serverLocked: false })
        pushLog(set, get, 'wake_ok', `wakePort=${wakePort}`)
        // Brief pause so iptables rule clears before we attempt the WS connection
        await new Promise(r => setTimeout(r, 1500))
        get().connect()
      } else {
        pushLog(set, get, 'wake_failed')
      }
    } catch (err) {
      pushLog(set, get, 'wake_error', String(err))
    }
  },

  loadFromStorage: () => {
    const server = get().server
    console.log('[connection] loadFromStorage:', server ? { ip: server.ip, port: server.port, deviceId: server.deviceId } : 'no server stored')
    if (server) {
      get().connect()
    }
  },

  connect: () => {
    const { server, ws: existingWs } = get()
    if (!server) {
      console.warn('[connection] connect() called but no server in store')
      return
    }

    pushLog(set, get, 'connect()', `existingWs=${!!existingWs}`)
    console.log('[connection] connect() called:', {
      ip: server.ip,
      port: server.port,
      secure: server.secure,
      deviceId: server.deviceId,
      hasExistingWs: !!existingWs,
    })
    if (existingWs) {
      console.log('[connection] disconnecting existing WS before creating new one')
      pushLog(set, get, 'disconnect_existing')
    }
    existingWs?.disconnect()

    // Set the module-level secure flag so all API/WS calls use the right protocol
    setSecureMode(server.secure)

    const url = buildWsUrl(server.ip, server.port)
    const ws = new PocketDevWebSocket(
      url,
      (status) => {
        // Guard: only update store if this WS is still the current one.
        // Prevents stale WS instances from overwriting a newer connection's status.
        if (get().ws !== ws) {
          console.log('[connection] STALE WebSocket status ignored:', status)
          pushLog(set, get, 'stale_ignored', status)
          return
        }
        console.log('[connection] WebSocket status:', status)
        pushLog(set, get, 'status', status)
        set({ status })
        if (status === 'connected') {
          useNewTaskDraftStore.getState().loadCapabilities()
          useTaskStore.getState().refreshFromServer().catch(() => {})
          // Re-register push token on every connect (token may have rotated)
          if (getPushNotificationsEnabled()) {
            const s = get().server
            if (s) {
              getApnsToken().then((token) => {
                if (token) {
                  const env = __DEV__ ? 'development' : 'production'
                  registerPushToken(s.ip, s.port, s.deviceId, token, env).catch(() => {})
                }
              }).catch(() => {})
            }
          }
        }
      },
      (message: WsMessage) => handleWsMessage(message),
    )

    set({ ws })
    ws.connect()
  },

  disconnect: () => {
    pushLog(set, get, 'disconnect()')
    get().ws?.disconnect()
    set({ ws: null, status: 'disconnected' })
  },

  setPaired: (server: StoredServer) => {
    set({ server })
    get().connect()
  },

  getConnectionLogText: () => {
    const { connectionLog, server, status } = get()
    const header = `PocketDev Connection Log\nServer: ${server?.ip}:${server?.port} (secure=${server?.secure})\nDevice: ${server?.deviceId}\nCurrent status: ${status}\nTimestamp: ${new Date().toISOString()}\n${'─'.repeat(50)}\n`
    const lines = connectionLog.map((e) => {
      const ts = new Date(e.timestamp).toISOString()
      return `[${ts}] ${e.event}${e.detail ? ` — ${e.detail}` : ''}`
    })
    return header + lines.join('\n')
  },

  unpair: () => {
    const { server, ws } = get()
    ws?.disconnect()
    if (server) {
      unpairFromServer(server.ip, server.port)
    }
    useSetupStore.getState().resetForUnpair(server?.deviceId).catch(() => {})
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
      const { taskId, line } = message.payload as { taskId: string; stream: string; line: string }
      tasks.appendLog(taskId, line)
      scripts.handleTaskOutput(taskId, line)
      break
    }
    case 'task.status_changed': {
      const { taskId, status } = message.payload as { taskId: string; status: string }
      const pendingQCount = useTaskStore.getState().pendingQuestions.get(taskId)?.length ?? 0
      console.log(`[ws] task.status_changed → ${status} | taskId=${taskId} pendingQuestions=${pendingQCount} t=${Date.now()}`)
      tasks.updateTaskStatus(taskId, status as any)
      scripts.handleTaskStatusChange(taskId, status)
      break
    }
    case 'task.completed': {
      const { taskId, sessionId } = message.payload as { taskId: string; exitCode: number; status: string; sessionId?: string | null }
      if (sessionId) tasks.updateTaskSessionId(taskId, sessionId)
      break
    }
    case 'task.activity': {
      const { taskId, activity } = message.payload as { taskId: string; activity: import('@pocketdev/shared/types').TaskActivity }
      tasks.appendActivity(taskId, activity)
      break
    }
    case 'task.question': {
      const question = message.payload as import('@pocketdev/shared/types').TaskQuestion
      console.log(`[ws] task.question received | taskId=${question.taskId} qId=${question.questionId} type=${question.type} t=${Date.now()}`)
      tasks.addQuestion(question.taskId, question)
      break
    }
    case 'task.turn_started': {
      const { taskId, turnNumber } = message.payload as { taskId: string; turnNumber: number }
      tasks.appendActivity(taskId, { type: 'status', message: `Turn ${turnNumber}` })
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
      useSetupStore.getState().applyLiveReport(message.payload as any).catch(() => {})
      break
    case 'plan.proposed':
      usePlanStore.getState().handlePlanProposed(message.payload as any)
      if (navigationRef.isReady()) {
        navigationRef.navigate('Plan')
      }
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

  // Handle lock events (string guard avoids narrowing errors before type regen)
  const t = message.type as string
  if (t === 'server.locked') {
    const store = useConnectionStore.getState()
    store.setServerLocked(true)
    store.ws?.suppressReconnect()
  } else if (t === 'server.unlocked') {
    useConnectionStore.getState().setServerLocked(false)
  }
}
