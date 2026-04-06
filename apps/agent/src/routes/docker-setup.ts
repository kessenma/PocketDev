import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { checkDockerStatus, verifyDocker } from '../services/docker-setup.ts'

export const dockerSetupRoutes = new Elysia({ prefix: '/docker-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkDockerStatus()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyDocker()
  })
