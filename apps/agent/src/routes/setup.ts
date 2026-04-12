import { Elysia, t } from 'elysia'
import { isSetupActive, pairDevice } from '../services/auth/setup.ts'
import { authenticateRequest } from '../services/auth/auth.ts'
import { deleteDevice } from '../db/index.ts'

export const setupRoutes = new Elysia()
  .delete('/unpair', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    deleteDevice(deviceId)
    return { ok: true }
  })
  .post('/pair', ({ body, set }) => {
    if (!isSetupActive()) {
      set.status = 403
      return { error: 'Setup expired or not active' }
    }

    const result = pairDevice(body.code, body.publicKey, body.deviceName, body.platform ?? null)
    if (!result) {
      set.status = 401
      return { error: 'Invalid setup code' }
    }

    return result
  }, {
    body: t.Object({
      code: t.String(),
      publicKey: t.String(),
      deviceName: t.String(),
      platform: t.Optional(t.String()),
    }),
  })
