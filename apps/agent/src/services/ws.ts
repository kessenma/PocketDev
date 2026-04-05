import { Elysia } from 'elysia'
import type { WsMessage } from '@pocketdev/shared/types'
import type {
  ContainerLogsChunkEvent,
  ContainerLogsFollowRequest,
  ContainerLogsStoppedEvent,
} from '@pocketdev/shared/types'
import { startTask, killTask, getTaskList } from './task-manager.ts'
import { authenticateRequest, parseDeviceIdFromAuthHeader } from './auth.ts'
import { DockerServiceError, getContainerLogs, startContainerLogsFollow, type ContainerLogsFollower } from './docker.ts'
import { checkAllPrerequisites } from './prerequisites.ts'
import { handleAnswer, handlePlanMessage, acceptPlan, denyPlan } from './plan-manager.ts'
import type { PlanAnswerCommand, PlanMessageCommand, PlanAcceptCommand, PlanDenyCommand } from '@pocketdev/shared/types'

/** Connected clients keyed by device ID */
const clients = new Map<string, { send: (data: string) => void }>()
const containerLogFollowers = new Map<string, ContainerLogsFollower>()

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
        throw new Error('Unauthorized')
      }
    },
    open(ws) {
      const deviceId = parseDeviceIdFromAuthHeader(ws.data.request.headers.get('authorization')) ?? 'dev-device'

      ;(ws as any)._deviceId = deviceId
      clients.set(deviceId, { send: (data: string) => ws.send(data) })
      console.log(`Device connected: ${deviceId}`)
    },
    async message(ws, raw) {
      let containerIdForError = ''

      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw as WsMessage

        switch (msg.type) {
          case 'ping':
            ws.send(JSON.stringify(makeMessage('pong', {})))
            break

          case 'task.start': {
            const { prompt, agentType, workingDirectory, model } = msg.payload as {
              prompt: string
              agentType?: string
              workingDirectory?: string
              model?: string
            }
            startTask(prompt, agentType ?? 'claude', workingDirectory ?? null, model ?? null)
            break
          }

          case 'task.kill': {
            const { taskId } = msg.payload as { taskId: string }
            killTask(taskId)
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
      if (deviceId) {
        const follower = containerLogFollowers.get(deviceId)
        if (follower) {
          containerLogFollowers.delete(deviceId)
          follower.stop()
        }
        clients.delete(deviceId)
        console.log(`Device disconnected: ${deviceId}`)
      }
    },
  })
