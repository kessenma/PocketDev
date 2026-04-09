import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { getTaskList } from '../services/task-manager.ts'
import { getTaskLogs } from '../db/index.ts'

export const taskRoutes = new Elysia({ prefix: '/tasks' })
  .get('', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    return getTaskList()
  })
  .get('/:id/logs', async ({ request, set, params, query }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const limit = Math.min(Number(query.limit) || 500, 2000)
    const logs = getTaskLogs(params.id, limit)

    return {
      taskId: params.id,
      logs: logs.map((row: any) => ({
        stream: row.stream,
        line: row.line,
        timestamp: row.timestamp,
      })),
      total: logs.length,
    }
  }, {
    params: t.Object({ id: t.String() }),
    query: t.Object({ limit: t.Optional(t.String()) }),
  })
