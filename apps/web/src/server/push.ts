import { db } from '@pocketdev/db'
import { pushRelayTokens, pushDeviceTokens, pushNotificationLog } from '@pocketdev/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'

const GORUSH_URL = process.env.GORUSH_URL ?? 'http://gorush:8088'
const APNS_BUNDLE_ID = 'run.pocketdev.mobile'

function generateRelayToken(): string {
  return randomBytes(32).toString('hex')
}

// POST /api/push/provision
// Called by the agent on first user opt-in. No auth required.
// Returns a relay_token the agent stores in its SQLite config.
export async function handlePushProvision(_req: Request): Promise<Response> {
  try {
    const token = generateRelayToken()
    await db.insert(pushRelayTokens).values({ id: token })
    return Response.json({ token })
  } catch (err) {
    console.error('[push] provision error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/push/register-device
// Called by the agent after receiving a device's APNs token.
// Body: { relay_token, apns_token, environment }
export async function handlePushRegisterDevice(req: Request): Promise<Response> {
  try {
    const body = await req.json() as {
      relay_token?: string
      apns_token?: string
      environment?: string
    }
    const { relay_token, apns_token, environment } = body

    if (!relay_token || !apns_token || !environment) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    const relay = await db
      .select()
      .from(pushRelayTokens)
      .where(eq(pushRelayTokens.id, relay_token))
      .limit(1)

    if (!relay.length) {
      return Response.json({ error: 'Invalid relay_token' }, { status: 401 })
    }

    // Update lastSeenAt
    await db
      .update(pushRelayTokens)
      .set({ lastSeenAt: new Date() })
      .where(eq(pushRelayTokens.id, relay_token))

    // Upsert device token
    await db
      .insert(pushDeviceTokens)
      .values({ relayTokenId: relay_token, apnsToken: apns_token, environment })
      .onConflictDoNothing()

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[push] register-device error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/push/send
// Called by the agent when it needs to push a notification.
// Body: { relay_token, apns_token, title, message, data }
export async function handlePushSend(req: Request): Promise<Response> {
  let relayTokenId: string | undefined
  let apnsToken: string | undefined

  try {
    const body = await req.json() as {
      relay_token?: string
      apns_token?: string
      title?: string
      message?: string
      data?: Record<string, string>
    }
    relayTokenId = body.relay_token
    apnsToken = body.apns_token
    const { title, message, data } = body

    if (!relayTokenId || !apnsToken || !title || !message) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Validate relay_token owns this apns_token
    const deviceRow = await db
      .select()
      .from(pushDeviceTokens)
      .where(
        and(
          eq(pushDeviceTokens.relayTokenId, relayTokenId),
          eq(pushDeviceTokens.apnsToken, apnsToken)
        )
      )
      .limit(1)

    if (!deviceRow.length) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const type = (data?.type ?? 'unknown') as string

    // Send via Gorush
    const gorushPayload = {
      notifications: [
        {
          tokens: [apnsToken],
          platform: 1, // iOS
          topic: APNS_BUNDLE_ID,
          title,
          message,
          data: data ?? {},
          sound: 'default',
        },
      ],
    }

    let success = false
    let gorushResponse: string | null = null

    try {
      const gorushRes = await fetch(`${GORUSH_URL}/api/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gorushPayload),
      })
      gorushResponse = await gorushRes.text()
      success = gorushRes.ok
    } catch (gorushErr) {
      gorushResponse = String(gorushErr)
      console.error('[push] gorush error:', gorushErr)
    }

    // Update last used
    await db
      .update(pushDeviceTokens)
      .set({ lastUsedAt: new Date() })
      .where(
        and(
          eq(pushDeviceTokens.relayTokenId, relayTokenId),
          eq(pushDeviceTokens.apnsToken, apnsToken)
        )
      )

    // Log the attempt
    await db.insert(pushNotificationLog).values({
      relayTokenId,
      apnsToken,
      type,
      title,
      success,
      gorushResponse,
    })

    return Response.json({ ok: success, gorushResponse })
  } catch (err) {
    console.error('[push] send error:', err)
    // Still try to log the failure
    if (relayTokenId && apnsToken) {
      try {
        await db.insert(pushNotificationLog).values({
          relayTokenId,
          apnsToken,
          type: 'unknown',
          title: 'unknown',
          success: false,
          gorushResponse: String(err),
        })
      } catch {}
    }
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
