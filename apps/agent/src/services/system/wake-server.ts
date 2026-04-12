/**
 * Wake server — a minimal HTTP server on port 4388 (POCKETDEV_WAKE_PORT).
 *
 * This is the only way to reopen port 4387 after it has been locked.
 * Accepts exactly one endpoint: POST /wake with a valid Ed25519 auth header.
 *
 * Rate-limited to 3 attempts per IP per 60 seconds to prevent brute force.
 * Only started when POCKETDEV_FIREWALL_LOCK_ENABLED=true.
 */

import { authenticateRequest } from '../auth/auth.ts'
import { unlockPort, isFirewallEnabled } from './firewall.ts'

const WAKE_PORT = Number(process.env.POCKETDEV_WAKE_PORT ?? 4388)

// In-memory rate limiting — no persistence needed
interface RateRecord { count: number; windowStart: number }
const rateLimit = new Map<string, RateRecord>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 3

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const rec = rateLimit.get(ip)
  if (!rec || now - rec.windowStart > RATE_WINDOW_MS) {
    rateLimit.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (rec.count >= RATE_MAX) return false
  rec.count++
  return true
}

// Periodic cleanup so the map doesn't grow unboundedly on long-running servers
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS
  for (const [ip, rec] of rateLimit.entries()) {
    if (rec.windowStart < cutoff) rateLimit.delete(ip)
  }
}, 5 * 60_000)

export function startWakeServer(): void {
  if (!isFirewallEnabled()) return

  Bun.serve({
    port: WAKE_PORT,
    hostname: '0.0.0.0',
    async fetch(req) {
      const url = new URL(req.url)

      // Health check (unauthenticated — lets mobile detect wake port is alive)
      if (req.method === 'GET' && url.pathname === '/wake/health') {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (req.method !== 'POST' || url.pathname !== '/wake') {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? req.headers.get('x-real-ip')
        ?? 'unknown'

      if (!checkRateLimit(ip)) {
        console.warn(`[wake] Rate limit hit for IP ${ip}`)
        return new Response(JSON.stringify({ error: 'Rate limited' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const deviceId = await authenticateRequest(req.headers.get('authorization'))
      if (!deviceId) {
        console.warn(`[wake] Unauthorized wake attempt from IP ${ip}`)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      console.log(`[wake] Wake request from device=${deviceId} IP=${ip} — unlocking port`)
      await unlockPort()

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })

  console.log(`[wake] Wake server running on port ${WAKE_PORT}`)
}
