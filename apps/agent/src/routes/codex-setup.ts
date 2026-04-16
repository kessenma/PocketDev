import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import {
  checkCodexStatus,
  getCodexAuthStatus,
  installCodex,
  replayCodexAuthCallback,
  startCodexAuth,
  submitCodexAuthInput,
  verifyCodexAuth,
} from '../services/cli-setup/codex-setup.ts'

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

  .post('/auth/start', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const mode = typeof body === 'object' && body && 'mode' in body
      ? String((body as Record<string, unknown>).mode ?? '')
      : ''
    if (mode !== 'browser' && mode !== 'device_code') {
      set.status = 400
      return { error: 'Valid auth mode is required' }
    }

    return startCodexAuth(mode)
  })

  .get('/auth/status/:sessionId', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return await getCodexAuthStatus(params.sessionId)
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

  .post('/auth/callback/:sessionId', async ({ request, params, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const callbackUrl = typeof body === 'object' && body && 'callback_url' in body
      ? String((body as Record<string, unknown>).callback_url ?? '')
      : ''
    if (!callbackUrl.trim()) {
      set.status = 400
      return { error: 'Callback URL is required' }
    }

    try {
      const result = await replayCodexAuthCallback(params.sessionId, callbackUrl)
      if (!result.success) {
        set.status = result.status_code ? 400 : 502
      }
      return result
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
