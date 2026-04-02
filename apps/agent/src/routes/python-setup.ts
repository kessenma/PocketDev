import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { checkPythonStatus, verifyPython } from '../services/python-setup.ts'

export const pythonSetupRoutes = new Elysia({ prefix: '/python-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return checkPythonStatus()
  })

  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    return verifyPython()
  })
