import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import {
  getDevice,
  updateDeviceApnsToken,
  getConfig,
  setConfig,
} from '../db/index.ts'
import {
  provisionRelayToken,
  registerDeviceWithRelay,
} from '../services/push/relay-push.ts'

export const pushTokenRoutes = new Elysia({ prefix: '/devices' })

  // POST /devices/:id/push-token
  // Mobile app calls this after user opts in to push notifications.
  .post('/:id/push-token', async ({ request, set, params, body }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    // Only allow a device to update its own push token
    if (deviceId !== params.id) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const device = getDevice(params.id)
    if (!device) {
      set.status = 404
      return { error: 'Device not found' }
    }

    const { pushToken, environment } = body as { pushToken: string; environment: string }

    // 1. Store the APNs token locally
    updateDeviceApnsToken(params.id, pushToken)

    // 2. Lazy-provision relay token if we don't have one yet
    let relayToken = getConfig('push_relay_token')
    if (!relayToken) {
      relayToken = await provisionRelayToken()
      if (relayToken) {
        setConfig('push_relay_token', relayToken)
      } else {
        console.error('[push] could not provision relay token')
        set.status = 502
        return { error: 'Could not reach push relay' }
      }
    }

    // 3. Register this device's token with the relay (fire-and-forget errors)
    await registerDeviceWithRelay({ relayToken, apnsToken: pushToken, environment })

    return { ok: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      pushToken: t.String(),
      environment: t.Union([t.Literal('development'), t.Literal('production')]),
    }),
  })

  // DELETE /devices/:id/push-token
  // Called when user disables push notifications in Settings.
  .delete('/:id/push-token', async ({ request, set, params }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    if (deviceId !== params.id) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    updateDeviceApnsToken(params.id, null)

    return { ok: true }
  }, {
    params: t.Object({ id: t.String() }),
  })
