import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import { checkOpenCodeStatus, getOpenCodeInstallCommand, installOpenCode, verifyOpenCode } from '../services/cli-setup/opencode-setup.ts'
import {
  checkOpenCodeProviderAuthStatus,
  getCopilotOpenCodeAuthStatus,
  getOpenAIOpenCodeAuthStatus,
  startCopilotOpenCodeAuth,
  startOpenAIOpenCodeAuth,
  submitOpenAIBrowserCallback,
  verifyOpenCodeProviderAuth,
} from '../services/cli-setup/opencode-provider-auth.ts'

export const opencodeSetupRoutes = new Elysia({ prefix: '/opencode-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkOpenCodeStatus()
  })

  .post('/install', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return installOpenCode()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyOpenCode()
  })

  .get('/install-command', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return { command: getOpenCodeInstallCommand() }
  })

  // ─── Provider auth endpoints ──────────────────────────────────────────────

  .get('/provider-auth-status', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const provider = query.provider as string
    if (provider !== 'openai' && provider !== 'github-copilot') {
      set.status = 400; return { error: 'Invalid provider. Must be "openai" or "github-copilot".' }
    }
    return checkOpenCodeProviderAuthStatus(provider)
  })

  // ── OpenAI auth ───────────────────────────────────────────────────────────

  .post('/openai-auth/start', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const body = await request.json() as { method?: string; api_key?: string }
    const method = body.method as 'browser' | 'headless' | 'api_key' | undefined
    if (!method || !['browser', 'headless', 'api_key'].includes(method)) {
      set.status = 400; return { error: 'Invalid method. Must be "browser", "headless", or "api_key".' }
    }
    return startOpenAIOpenCodeAuth(method, body.api_key)
  })

  .get('/openai-auth/status/:sessionId', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const status = await getOpenAIOpenCodeAuthStatus(decodeURIComponent(params.sessionId))
    if (!status) { set.status = 404; return { error: 'Session not found.' } }
    return status
  })

  .post('/openai-auth/callback/:sessionId', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const body = await request.json() as { callback_url?: string }
    if (!body.callback_url) { set.status = 400; return { error: 'callback_url required.' } }

    const status = await submitOpenAIBrowserCallback(decodeURIComponent(params.sessionId), body.callback_url)
    if (!status) { set.status = 404; return { error: 'Session not found.' } }
    return status
  })

  // ── GitHub Copilot auth ───────────────────────────────────────────────────

  .post('/copilot-auth/start', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return startCopilotOpenCodeAuth()
  })

  .get('/copilot-auth/status/:sessionId', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const status = await getCopilotOpenCodeAuthStatus(decodeURIComponent(params.sessionId))
    if (!status) { set.status = 404; return { error: 'Session not found.' } }
    return status
  })

  // ── Provider verify ───────────────────────────────────────────────────────

  .post('/verify-provider', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    const body = await request.json() as { provider?: string }
    const provider = body.provider as string
    if (provider !== 'openai' && provider !== 'github-copilot') {
      set.status = 400; return { error: 'Invalid provider.' }
    }
    return verifyOpenCodeProviderAuth(provider)
  })
