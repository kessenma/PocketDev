import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { checkPkgManagerStatus, verifyPkgManagers } from '../services/pkg-setup.ts'

export const pkgSetupRoutes = new Elysia({ prefix: '/pkg-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkPkgManagerStatus()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyPkgManagers()
  })
