import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import { checkMinimaxStatus, configureMinimaxKey, verifyMinimax } from '../services/cli-setup/minimax-setup.ts'

export const minimaxSetupRoutes = new Elysia({ prefix: '/minimax-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkMinimaxStatus()
  })

  .post('/configure', async ({ request, set, body }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const { api_key } = body as { api_key: string }
    return configureMinimaxKey(api_key)
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyMinimax()
  })
