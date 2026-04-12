import { Elysia } from 'elysia'
import type { ContainerLogsFilter, ContainerLogsDirection } from '@pocketdev/shared/types'
import { authenticateRequest } from '../services/auth/auth.ts'
import { DockerServiceError, getContainerLogs, listContainers } from '../services/system/docker.ts'

function normalizeDirection(value: unknown): ContainerLogsDirection {
  return value === 'head' ? 'head' : 'tail'
}

function normalizeFilter(value: unknown): ContainerLogsFilter {
  return value === 'errors' ? 'errors' : 'all'
}

export const containerRoutes = new Elysia({ prefix: '/containers' })
  .get('/', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    try {
      return { containers: await listContainers() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list containers.'
      set.status = error instanceof DockerServiceError ? error.statusCode : 500
      return { error: message }
    }
  })
  .get('/:containerId/logs', async ({ params, query, request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    try {
      return await getContainerLogs({
        container_id: params.containerId,
        line_count: Number(query.line_count ?? 100),
        direction: normalizeDirection(query.direction),
        filter: normalizeFilter(query.filter),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch container logs.'
      set.status = error instanceof DockerServiceError ? error.statusCode : 500
      return { error: message }
    }
  })