import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import {
  checkCodexStatus,
  getCodexAuthStatus,
  installCodex,
  startCodexAuth,
  submitCodexAuthInput,
  verifyCodexAuth,
} from '../services/codex-setup.ts'

export const codexSetupRoutes = new Elysia({ prefix: '/codex-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkCodexStatus()
  })

  .post('/install', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return installCodex()
  })

  .post('/auth/start', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return startCodexAuth()
  })

  .get('/auth/status/:sessionId', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return getCodexAuthStatus(params.sessionId)
    } catch (error) {
      set.status = 404
      return { error: error instanceof Error ? error.message : 'Codex auth session not found' }
    }
  })

  .post('/auth/submit/:sessionId', async ({ request, params, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const code = typeof body === 'object' && body && 'code' in body
      ? String((body as Record<string, unknown>).code ?? '')
      : ''
    if (!code.trim()) {
      set.status = 400
      return { error: 'Code is required' }
    }

    try {
      return submitCodexAuthInput(params.sessionId, code)
    } catch (error) {
      set.status = 404
      return { error: error instanceof Error ? error.message : 'Codex auth session not found' }
    }
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyCodexAuth()
  })
