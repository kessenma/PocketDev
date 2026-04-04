import { Elysia, t } from 'elysia'
import { existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import {
  createAdmin,
  verifyAdmin,
  createSession,
  validateSession,
  clearSession,
  setCustomPasscode,
  getActivePasscode,
  regeneratePasscode,
  sessionCookieHeader,
} from '../services/console-auth.ts'
import { hasDevices } from '../services/setup.ts'
import { hasAdminAccount, getDevices, deleteDevice, updateDeviceName } from '../db/index.ts'
import { checkAllPrerequisites } from '../services/prerequisites.ts'
import { getTerminalDebugLog } from '../services/terminal-ws.ts'
import { getCodexAuthDebug } from '../services/codex-setup.ts'
import { getClaudeAuthDebug } from '../services/claude-setup.ts'
import { getGitHubAuthDebug } from '../services/git-setup.ts'

const PORT = Number(process.env.POCKETDEV_PORT ?? 4387)

// Resolve console SPA dist directory
// In dev: apps/agent/console/dist
// In production (installed): /opt/pocketdev/console
const CONSOLE_DIST = existsSync(join(import.meta.dir, '../../console/dist'))
  ? join(import.meta.dir, '../../console/dist')
  : join(process.cwd(), 'console')

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function extractHostIp(request: Request): string {
  const host = request.headers.get('host') ?? ''
  // Strip port
  const ip = host.replace(/:\d+$/, '')
  return ip || '0.0.0.0'
}

export const consoleRoutes = new Elysia({ prefix: '/api/console' })
  // ─── Health (no auth) ─────────────────────────────────
  .get('/health', () => ({
    hasAdmin: hasAdminAccount(),
    paired: hasDevices(),
    uptime: process.uptime(),
  }))

  // ─── Setup (create admin, no auth) ────────────────────
  .post('/setup', async ({ body, set }) => {
    if (hasAdminAccount()) {
      set.status = 403
      return { error: 'Admin account already exists' }
    }

    try {
      await createAdmin(body.email, body.password)
      const token = createSession(body.email)
      set.headers['set-cookie'] = sessionCookieHeader(token)
      return { ok: true }
    } catch (err) {
      set.status = 400
      return { error: err instanceof Error ? err.message : 'Setup failed' }
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })

  // ─── Login (no auth) ─────────────────────────────────
  .post('/login', async ({ body, set }) => {
    const valid = await verifyAdmin(body.email, body.password)
    if (!valid) {
      set.status = 401
      return { error: 'Invalid email or password' }
    }

    const token = createSession(body.email)
    set.headers['set-cookie'] = sessionCookieHeader(token)
    return { ok: true }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })

  // ─── Logout ───────────────────────────────────────────
  .post('/logout', ({ request, set }) => {
    clearSession(request.headers.get('cookie'))
    set.headers['set-cookie'] = 'pocketdev_session=; HttpOnly; Path=/PocketDev; Max-Age=0'
    return { ok: true }
  })

  // ─── Status (requires session) ────────────────────────
  .get('/status', ({ request, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const devices = getDevices().map((d) => ({
      id: d.id,
      name: d.name,
      platform: d.platform,
      lastSeenAt: d.lastSeenAt,
    }))

    return {
      paired: hasDevices(),
      devices,
      passcode: getActivePasscode(),
      serverIp: extractHostIp(request),
      port: PORT,
    }
  })

  // ─── Set custom passcode (requires session) ──────────
  .post('/passcode', ({ request, body, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    setCustomPasscode(body.code)
    return { ok: true, code: body.code }
  }, {
    body: t.Object({
      code: t.String(),
    }),
  })

  // ─── Refresh passcode (requires session) ──────────────
  .post('/passcode/refresh', ({ request, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const code = regeneratePasscode()
    return { ok: true, code }
  })

  // ─── Rename device (requires session) ─────────────────
  .patch('/devices/:id', ({ request, params, body, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    updateDeviceName(params.id, body.name)
    return { ok: true }
  }, {
    body: t.Object({
      name: t.String(),
    }),
  })

  // ─── Delete device (requires session) ─────────────────
  .delete('/devices/:id', ({ request, params, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    deleteDevice(params.id)
    return { ok: true }
  })

  // ─── Auth debug (requires session) ────────────────────
  .get('/debug/auth', ({ request, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const devices = getDevices().map((d) => ({
      id: d.id,
      name: d.name,
      platform: d.platform,
      publicKeyPrefix: d.publicKey?.slice(0, 16) + '...',
      lastSeenAt: d.lastSeenAt,
    }))

    return {
      serverTime: Date.now(),
      serverTimeISO: new Date().toISOString(),
      deviceCount: devices.length,
      devices,
    }
  })

  // ─── Test auth header (requires session, simulates mobile auth check) ──
  .post('/debug/test-auth', async ({ request, body, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const { authenticateRequest } = await import('../services/auth.ts')
    const authHeader = body.authHeader as string
    const result = await authenticateRequest(authHeader)

    // Also decode to show what we got
    let decoded = null
    try {
      const token = authHeader.replace(/^PocketDev\s+/i, '')
      decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    } catch { /* ignore */ }

    return {
      authenticated: !!result,
      deviceId: result,
      decoded,
      serverTime: Date.now(),
      timeDiff: decoded?.timestamp ? Math.abs(Date.now() - decoded.timestamp) : null,
    }
  }, {
    body: t.Object({
      authHeader: t.String(),
    }),
  })

  // ─── Terminal debug log (requires session) ────────────
  .get('/debug/terminal', ({ request, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    return { entries: getTerminalDebugLog() }
  })

  .get('/debug/codex-auth', ({ request, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    return getCodexAuthDebug()
  })

  .get('/debug/claude-auth', ({ request, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    return getClaudeAuthDebug()
  })

  .get('/debug/github-auth', ({ request, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    return getGitHubAuthDebug()
  })

  // ─── Prerequisites (requires session) ─────────────────
  .get('/prerequisites', async ({ request, set }) => {
    if (!validateSession(request.headers.get('cookie'))) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    return checkAllPrerequisites()
  })

// ─── Static file serving for console SPA ────────────────
export const consoleStaticRoutes = new Elysia()
  // Serve static assets (JS, CSS, images)
  .get('/assets/*', ({ params, set }) => {
    const filePath = join(CONSOLE_DIST, 'assets', params['*'])
    const file = Bun.file(filePath)

    if (!file.size) {
      set.status = 404
      return 'Not found'
    }

    const ext = extname(filePath)
    set.headers['content-type'] = MIME_TYPES[ext] ?? 'application/octet-stream'
    set.headers['cache-control'] = 'public, max-age=31536000, immutable'
    return file
  })

  // SPA fallback: serve index.html for all non-API, non-asset routes
  .get('/*', ({ params, set }) => {
    const path = params['*']

    // Don't intercept API routes, WebSocket, or preview paths
    if (path.startsWith('api/') || path.startsWith('ws') || path.startsWith('preview/')) {
      set.status = 404
      return 'Not found'
    }

    const indexPath = join(CONSOLE_DIST, 'index.html')
    const file = Bun.file(indexPath)

    if (!file.size) {
      set.status = 404
      return 'Console UI not found. Run the console build first.'
    }

    set.headers['content-type'] = 'text/html'
    return file
  })
