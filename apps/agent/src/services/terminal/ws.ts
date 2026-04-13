import { Elysia } from 'elysia'
import type { WsMessage } from '@pocketdev/shared/types'
import type {
  ContainerLogsChunkEvent,
  ContainerLogsFollowRequest,
  ContainerLogsStoppedEvent,
} from '@pocketdev/shared/types'
import { startTask, killTask, getTaskList, getProcess, continueTask } from '../tasks/task-manager.ts'
import { authenticateRequest, parseDeviceIdFromAuthHeader } from '../auth/auth.ts'
import { DockerServiceError, getContainerLogs, startContainerLogsFollow, type ContainerLogsFollower } from '../system/docker.ts'
import { checkAllPrerequisites } from '../cli-setup/prerequisites.ts'
import { handleAnswer, handlePlanMessage, acceptPlan, denyPlan } from '../tasks/plan-manager.ts'
import type { PlanAnswerCommand, PlanMessageCommand, PlanAcceptCommand, PlanDenyCommand } from '@pocketdev/shared/types'
import { lockPort, isFirewallEnabled } from '../system/firewall.ts'

/** Connected clients keyed by device ID */
interface WsClient {
  send: (data: string) => void
  close: () => void
  ws: unknown
  connectionId: string  // UUID generated per-connection; never reused (ws objects may be reused by Bun)
  connectedAt: number
  messageCount: number
}
const clients = new Map<string, WsClient>()
const containerLogFollowers = new Map<string, ContainerLogsFollower>()

// ─── Auto-lock timer ────────────────────────────────────────
const AUTO_LOCK_MINUTES = Number(process.env.POCKETDEV_AUTO_LOCK_MINUTES ?? 0)
let autoLockTimer: ReturnType<typeof setTimeout> | null = null

function scheduleAutoLock() {
  if (AUTO_LOCK_MINUTES <= 0 || !isFirewallEnabled()) return
  clearAutoLock()
  autoLockTimer = setTimeout(async () => {
    if (clients.size === 0) {
      const running = getTaskList().some((t) => t.status === 'running')
      if (running) {
        console.log('[auto-lock] Task still running — deferring lock')
        scheduleAutoLock()
        return
      }
      console.log('[auto-lock] No active clients — locking port')
      broadcast(makeMessage('server.locked', {}))
      await lockPort()
    }
  }, AUTO_LOCK_MINUTES * 60_000)
}

function clearAutoLock() {
  if (autoLockTimer !== null) {
    clearTimeout(autoLockTimer)
    autoLockTimer = null
  }
}

/** Expose client count for lock status endpoint */
export function getConnectedClientCount() { return clients.size }

/** True when no mobile clients are actively connected via WebSocket */
export function isNoClientConnected() { return clients.size === 0 }

/** Close all connected WebSocket clients (called before locking the port) */
export function closeAllClients() {
  for (const client of clients.values()) {
    try { client.close() } catch { /* already closed */ }
  }
}

// ─── Connection event ring buffer for diagnostics ────────
interface WsConnectionEvent {
  type: 'connect' | 'disconnect' | 'auth_rejected' | 'stale_closed' | 'message_in'
  deviceId: string
  timestamp: number
  detail?: string
}

const WS_EVENT_BUFFER_SIZE = 50
const wsEventBuffer: WsConnectionEvent[] = []
const serverStartedAt = Date.now()

function pushWsEvent(event: WsConnectionEvent) {
  wsEventBuffer.push(event)
  if (wsEventBuffer.length > WS_EVENT_BUFFER_SIZE) {
    wsEventBuffer.shift()
  }
}

/** Get WebSocket debug info for the Network diagnostics tab */
export function getWsDebugInfo() {
  const connectedClients = Array.from(clients.entries()).map(([deviceId, client]) => ({
    deviceId,
    connectedAt: client.connectedAt,
    connectedDuration: Date.now() - client.connectedAt,
    messageCount: client.messageCount,
  }))

  return {
    connectedClients,
    recentEvents: [...wsEventBuffer].reverse(), // newest first
    serverUptime: Date.now() - serverStartedAt,
  }
}

/** Send a WsMessage to all connected clients */
export function broadcast(msg: WsMessage) {
  const data = JSON.stringify(msg)
  for (const client of clients.values()) {
    client.send(data)
  }
}

/** Send a WsMessage to a specific device */
export function sendTo(deviceId: string, msg: WsMessage) {
  const client = clients.get(deviceId)
  if (client) client.send(JSON.stringify(msg))
}

/** Create a WsMessage helper */
export function makeMessage<T>(type: WsMessage['type'], payload: T): WsMessage<T> {
  return {
    type,
    id: crypto.randomUUID(),
    payload,
    timestamp: Date.now(),
  }
}

/** Elysia WebSocket plugin */
export const wsRoutes = new Elysia()
  .ws('/ws', {
    async beforeHandle({ request }) {
      const deviceId = await authenticateRequest(request.headers.get('authorization'))
      if (!deviceId) {
        const parsedId = parseDeviceIdFromAuthHeader(request.headers.get('authorization'))
        console.warn(`[ws] beforeHandle: auth REJECTED for deviceId=${parsedId ?? 'unknown'}`)
        pushWsEvent({ type: 'auth_rejected', deviceId: parsedId ?? 'unknown', timestamp: Date.now() })
        throw new Error('Unauthorized')
      }
      console.log(`[ws] beforeHandle: auth OK for deviceId=${deviceId}`)
    },
    open(ws) {
      const deviceId = parseDeviceIdFromAuthHeader(ws.data.request.headers.get('authorization')) ?? 'dev-device'
      const connectionId = crypto.randomUUID()

      ;(ws as any)._deviceId = deviceId
      ;(ws as any)._connectionId = connectionId

      // Close stale connection from the same device (e.g. mobile app reload).
      // Deferred: closing a WS synchronously inside another WS's open handler
      // can interfere with the new connection in Bun/Elysia, causing it to drop.
      const existing = clients.get(deviceId)
      if (existing) {
        console.log(`[ws] open: scheduling stale WS close for device=${deviceId}`)
        pushWsEvent({ type: 'stale_closed', deviceId, timestamp: Date.now(), detail: `connectedFor=${Date.now() - existing.connectedAt}ms` })
        const staleClient = existing
        const staleConnectionId = existing.connectionId
        setTimeout(() => {
          // If the stale client is still registered (shouldn't happen normally), evict it.
          const currentForDevice = clients.get(deviceId)
          if (currentForDevice && currentForDevice.connectionId === staleConnectionId) {
            clients.delete(deviceId)
          }
          // Close the stale socket regardless (it's probably already dead).
          try { staleClient.close() } catch { /* already closed */ }
        }, 500)
        // Also clean up any container log follower for the old connection
        const follower = containerLogFollowers.get(deviceId)
        if (follower) {
          containerLogFollowers.delete(deviceId)
          follower.stop()
        }
      }

      const client: WsClient = {
        send: (data: string) => ws.send(data),
        close: () => ws.close(),
        ws,
        connectionId,
        connectedAt: Date.now(),
        messageCount: 0,
      }
      clients.set(deviceId, client)
      clearAutoLock()
      pushWsEvent({ type: 'connect', deviceId, timestamp: Date.now(), detail: `staleClient=${!!existing}` })
      console.log(`[ws] open: device=${deviceId}, staleClient=${!!existing}, connectionId=${connectionId}`)
    },
    async message(ws, raw) {
      let containerIdForError = ''

      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw as WsMessage

        // Track message count for diagnostics
        const senderDeviceId = (ws as any)._deviceId as string | undefined
        if (senderDeviceId) {
          const senderClient = clients.get(senderDeviceId)
          if (senderClient) senderClient.messageCount++
        }

        switch (msg.type) {
          case 'ping':
            ws.send(JSON.stringify(makeMessage('pong', {})))
            break

          case 'task.start': {
            const { prompt, agentType, workingDirectory, model, mode } = msg.payload as {
              prompt: string
              agentType?: string
              workingDirectory?: string
              model?: string
              mode?: 'default' | 'plan'
            }
            startTask(prompt, agentType ?? 'claude', workingDirectory ?? null, model ?? null, mode ?? 'default')
            break
          }

          case 'task.kill': {
            const { taskId } = msg.payload as { taskId: string }
            killTask(taskId)
            break
          }

          case 'task.input': {
            const { taskId, data } = msg.payload as { taskId: string; data: string }
            const proc = getProcess(taskId)
            if (proc) proc.sendInput(data)
            break
          }

          case 'task.answer': {
            const { taskId, questionId, answer } = msg.payload as { taskId: string; questionId: string; answer: string }
            const proc = getProcess(taskId)
            if (proc instanceof Object && 'answerQuestion' in proc && typeof proc.answerQuestion === 'function') {
              void proc.answerQuestion(questionId, answer)
            } else if (proc) {
              proc.sendInput(answer + '\n')
            }
            break
          }

          case 'task.continue': {
            const { taskId, prompt, model } = msg.payload as { taskId: string; prompt: string; model?: string }
            const success = continueTask(taskId, prompt, model ?? null)
            if (!success) {
              ws.send(JSON.stringify(makeMessage('task.status_changed', {
                taskId,
                status: 'failed',
                error: 'Cannot continue this task — only completed Claude tasks with a session can be continued.',
              })))
            }
            break
          }

          case 'task.list': {
            const tasks = getTaskList()
            ws.send(JSON.stringify(makeMessage('task.list', { tasks })))
            break
          }

          case 'setup.check_prerequisites': {
            const report = await checkAllPrerequisites()
            ws.send(JSON.stringify(makeMessage('setup.prerequisites_result', report)))
            break
          }

          case 'container.logs.follow': {
            const deviceId = (ws as any)._deviceId as string | undefined
            if (!deviceId) break

            const payload = msg.payload as ContainerLogsFollowRequest
            const currentContainerId = payload.container_id
            containerIdForError = currentContainerId
            const snapshot = payload.direction === 'head'
              ? await getContainerLogs({
                  container_id: currentContainerId,
                  line_count: payload.line_count,
                  direction: 'head',
                  filter: payload.filter,
                })
              : null

            const existingFollower = containerLogFollowers.get(deviceId)
            if (existingFollower) {
              existingFollower.stop()
              containerLogFollowers.delete(deviceId)
            }

            if (snapshot) {
              for (const line of snapshot.lines) {
                const chunk: ContainerLogsChunkEvent = {
                  container_id: currentContainerId,
                  line: line.content,
                  stream: line.stream,
                  is_error: line.is_error,
                }
                sendTo(deviceId, makeMessage('container.logs.chunk', chunk))
              }
            }

            const follower = startContainerLogsFollow(
              {
                container_id: currentContainerId,
                line_count: payload.direction === 'tail' ? payload.line_count : 0,
                filter: payload.filter,
              },
              {
                onLine: (line) => {
                  const chunk: ContainerLogsChunkEvent = {
                    container_id: currentContainerId,
                    line: line.content,
                    stream: line.stream,
                    is_error: line.is_error,
                  }
                  sendTo(deviceId, makeMessage('container.logs.chunk', chunk))
                },
                onStop: (reason) => {
                  containerLogFollowers.delete(deviceId)
                  const stopped: ContainerLogsStoppedEvent = {
                    container_id: currentContainerId,
                    reason,
                  }
                  sendTo(deviceId, makeMessage('container.logs.stopped', stopped))
                },
              },
            )

            containerLogFollowers.set(deviceId, follower)
            break
          }

          case 'plan.answer': {
            handleAnswer(msg.payload as PlanAnswerCommand)
            break
          }

          case 'plan.message': {
            const deviceId = (ws as any)._deviceId as string | undefined
            if (!deviceId) break
            handlePlanMessage(msg.payload as PlanMessageCommand, deviceId)
            break
          }

          case 'plan.accept': {
            acceptPlan(msg.payload as PlanAcceptCommand)
            break
          }

          case 'plan.deny': {
            denyPlan(msg.payload as PlanDenyCommand)
            break
          }

          case 'container.logs.stop': {
            const deviceId = (ws as any)._deviceId as string | undefined
            if (!deviceId) break

            const existingFollower = containerLogFollowers.get(deviceId)
            if (existingFollower) {
              containerLogFollowers.delete(deviceId)
              existingFollower.stop()
            }
            break
          }

          default:
            console.warn(`Unknown message type: ${msg.type}`)
        }
      } catch (err) {
        if (err instanceof DockerServiceError) {
          const deviceId = (ws as any)._deviceId as string | undefined
          if (deviceId) {
            sendTo(deviceId, makeMessage('container.logs.stopped', {
              container_id: containerIdForError,
              reason: 'terminated',
            }))
          }
        }
        console.error('Failed to handle WebSocket message:', err)
      }
    },
    close(ws) {
      const deviceId = (ws as any)._deviceId as string | undefined
      const connectionId = (ws as any)._connectionId as string | undefined
      if (deviceId) {
        const follower = containerLogFollowers.get(deviceId)
        if (follower) {
          containerLogFollowers.delete(deviceId)
          follower.stop()
        }

        // Only delete from clients map if this connectionId is still the registered one.
        // Using connectionId (UUID) instead of ws-object identity because Bun/Elysia
        // may reuse ws objects across connections, making ws === current.ws unreliable.
        const current = clients.get(deviceId)
        if (current && current.connectionId === connectionId) {
          clients.delete(deviceId)
          pushWsEvent({ type: 'disconnect', deviceId, timestamp: Date.now(), detail: 'current_client' })
          console.log(`[ws] close: device=${deviceId}, was current client — removed from map`)
          if (clients.size === 0) scheduleAutoLock()
        } else {
          pushWsEvent({ type: 'disconnect', deviceId, timestamp: Date.now(), detail: 'stale_client_ignored' })
          console.log(`[ws] close: device=${deviceId}, was STALE client — map entry preserved for newer connection`)
        }
      }
    },
  })
