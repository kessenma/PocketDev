import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { checkTypeScriptStatus, verifyTypeScript } from '../services/typescript-setup.ts'

export const typescriptSetupRoutes = new Elysia({ prefix: '/typescript-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkTypeScriptStatus()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyTypeScript()
  })
