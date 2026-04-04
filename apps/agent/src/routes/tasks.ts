import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { getTaskList } from '../services/task-manager.ts'

export const taskRoutes = new Elysia({ prefix: '/tasks' })
  .get('', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    return getTaskList()
  })
