import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { checkAllPrerequisites } from '../services/prerequisites.ts'

export const prerequisitesRoutes = new Elysia()
  .get('/prerequisites', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    return checkAllPrerequisites()
  })
