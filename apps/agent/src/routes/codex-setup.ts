import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { checkCodexStatus, verifyCodexAuth } from '../services/codex-setup.ts'

export const codexSetupRoutes = new Elysia({ prefix: '/codex-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkCodexStatus()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyCodexAuth()
  })
