import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { checkGoStatus, verifyGo, getGoInstallCommand } from '../services/go-setup.ts'

export const goSetupRoutes = new Elysia({ prefix: '/go-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkGoStatus()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyGo()
  })

  .get('/install-command', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return { command: getGoInstallCommand() }
  })
