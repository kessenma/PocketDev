import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import { checkOpenCodeStatus, getOpenCodeInstallCommand, installOpenCode, verifyOpenCode } from '../services/cli-setup/opencode-setup.ts'

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
