import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { checkClaudeStatus, verifyClaudeAuth } from '../services/claude-setup.ts'

export const claudeSetupRoutes = new Elysia({ prefix: '/claude-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkClaudeStatus()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyClaudeAuth()
  })
