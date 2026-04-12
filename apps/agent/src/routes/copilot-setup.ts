import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import {
  checkCopilotStatus,
  getCopilotTrustStatus,
  installCopilot,
  startCopilotTrust,
  verifyCopilotSetup,
} from '../services/cli-setup/copilot-setup.ts'

export const copilotSetupRoutes = new Elysia({ prefix: '/copilot-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkCopilotStatus()
  })

  .post('/install', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return installCopilot()
  })

  .post('/trust/start', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return startCopilotTrust()
  })

  .get('/trust/status/:sessionId', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return getCopilotTrustStatus(params.sessionId)
    } catch (error) {
      set.status = 404
      return { error: error instanceof Error ? error.message : 'Copilot trust session not found' }
    }
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyCopilotSetup()
  })
