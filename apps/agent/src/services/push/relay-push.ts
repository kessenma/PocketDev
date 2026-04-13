import { getConfig, insertPushLog } from '../../db/index.ts'
import { randomUUID } from 'node:crypto'

const RELAY_URL = 'https://pocketdev.run'

export interface PushPayload {
  apnsToken: string
  title: string
  message: string
  data: Record<string, string>
  deviceId?: string
  taskId?: string
}

// Provision a relay token from pocketdev.run on first opt-in.
// Returns the token or null on failure.
export async function provisionRelayToken(): Promise<string | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/push/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      console.error('[push] provision failed:', res.status, await res.text())
      return null
    }
    const body = await res.json() as { token?: string }
    return body.token ?? null
  } catch (err) {
    console.error('[push] provision error:', err)
    return null
  }
}

// Register a device APNs token with the relay.
export async function registerDeviceWithRelay(opts: {
  relayToken: string
  apnsToken: string
  environment: string
}): Promise<void> {
  try {
    const res = await fetch(`${RELAY_URL}/api/push/register-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        relay_token: opts.relayToken,
        apns_token: opts.apnsToken,
        environment: opts.environment,
      }),
    })
    if (!res.ok) {
      console.error('[push] register-device failed:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[push] register-device error:', err)
  }
}

// Send a push notification via the pocketdev.run relay.
// Fire-and-forget — never throws, never blocks task flow.
export async function sendPush(payload: PushPayload): Promise<void> {
  const relayToken = getConfig('push_relay_token')
  if (!relayToken) {
    return // push not provisioned
  }

  const type = payload.data.type ?? 'unknown'
  let success = false
  let relayStatusCode: number | undefined

  try {
    const res = await fetch(`${RELAY_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        relay_token: relayToken,
        apns_token: payload.apnsToken,
        title: payload.title,
        message: payload.message,
        data: payload.data,
      }),
    })
    relayStatusCode = res.status
    success = res.ok
    if (!res.ok) {
      console.error('[push] relay send failed:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[push] relay send error:', err)
  }

  // Log locally regardless of outcome
  try {
    insertPushLog({
      id: randomUUID(),
      deviceId: payload.deviceId,
      type,
      taskId: payload.taskId,
      title: payload.title,
      success,
      relayStatusCode,
    })
  } catch (logErr) {
    console.error('[push] log error:', logErr)
  }
}
