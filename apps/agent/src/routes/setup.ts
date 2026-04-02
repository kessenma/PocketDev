import { Elysia, t } from 'elysia'
import { hasDevices, isSetupActive, pairDevice } from '../services/setup.ts'

export const setupRoutes = new Elysia()
  .get('/setup', ({ set }) => {
    if (hasDevices()) {
      set.status = 404
      return { error: 'Setup already completed' }
    }
    if (!isSetupActive()) {
      set.status = 404
      return { error: 'Setup mode not active' }
    }
    return { status: 'awaiting_pairing' }
  })
  .post('/setup/pair', ({ body, set }) => {
    if (hasDevices()) {
      set.status = 403
      return { error: 'Already paired' }
    }
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
