import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import { checkRustStatus, verifyRust } from '../services/cli-setup/rust-setup.ts'

export const rustSetupRoutes = new Elysia({ prefix: '/rust-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkRustStatus()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyRust()
  })
