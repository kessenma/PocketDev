import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import {
  checkClaudeStatus,
  verifyClaudeAuth,
  startClaudeAuth,
  getClaudeAuthStatus,
  submitClaudeAuthInput,
} from '../services/cli-setup/claude-setup.ts'

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

  .post('/auth/start', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return startClaudeAuth()
  })

  .get('/auth/status/:sessionId', async ({ request, set, params }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return getClaudeAuthStatus(params.sessionId)
    } catch {
      set.status = 404
      return { error: 'Session not found' }
    }
  })

  .post('/auth/submit/:sessionId', async ({ request, set, params, body }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const { code } = body as { code: string }
    if (!code) { set.status = 400; return { error: 'Missing code' } }

    try {
      return submitClaudeAuthInput(params.sessionId, code)
    } catch {
      set.status = 404
      return { error: 'Session not found' }
    }
  })
