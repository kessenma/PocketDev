/**
 * Device-facing lock/unlock routes (Ed25519 auth required).
 * These are the endpoints the mobile app calls to lock/unlock
 * the server port and check status.
 *
 * POST /api/lock          — lock the port (broadcasts server.locked, closes all WS)
 * GET  /api/lock/status   — unauthenticated status (mobile needs this when port is locked)
 */

import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { lockPort, unlockPort, isLocked, isFirewallEnabled, isFirewallAvailable } from '../services/firewall.ts'
import { broadcast, makeMessage, getConnectedClientCount, closeAllClients } from '../services/ws.ts'

const WAKE_PORT = Number(process.env.POCKETDEV_WAKE_PORT ?? 4388)
const AUTO_LOCK_MINUTES = Number(process.env.POCKETDEV_AUTO_LOCK_MINUTES ?? 0)

export const lockRoutes = new Elysia({ prefix: '/lock' })

  // Unauthenticated — mobile polls this to know why connection is failing
  .get('/status', () => ({
    locked: isLocked(),
    firewallEnabled: isFirewallEnabled(),
    firewallAvailable: isFirewallAvailable(),
    autoLockMinutes: AUTO_LOCK_MINUTES,
    wakePort: WAKE_PORT,
    activeClients: getConnectedClientCount(),
  }))

  // Lock the port — requires device auth
  .post('/lock', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    // Notify all clients before disconnecting them
    broadcast(makeMessage('server.locked', {}))

    // Brief delay to let the WS message flush before we close connections and block
    setTimeout(async () => {
      closeAllClients()
      await lockPort()
    }, 200)

    return { locked: true }
  })

  // Unlock the port — requires device auth
  // Note: this only works if the port is still reachable (firewall not active,
  // or called from the wake server flow where the port was just unblocked).
  .post('/unlock', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    await unlockPort()
    broadcast(makeMessage('server.unlocked', {}))
    return { locked: false }
  })
