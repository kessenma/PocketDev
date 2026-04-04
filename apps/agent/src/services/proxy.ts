import { Elysia } from 'elysia'
import { authenticateRequest } from './auth.ts'
import type { BrowserSessionCreateResult } from '@pocketdev/shared/types'

/** Default dev server port — can be overridden via env or auto-detected */
let devServerPort = Number(process.env.POCKETDEV_DEV_PORT ?? 5173)

interface BrowserSession {
  id: string
  targetUrl: string
  targetOrigin: string
  createdAt: number
}

const browserSessions = new Map<string, BrowserSession>()
const BROWSER_SESSION_TTL_MS = 30 * 60_000

function pruneBrowserSessions() {
  const now = Date.now()
  for (const [id, session] of browserSessions.entries()) {
    if (now - session.createdAt > BROWSER_SESSION_TTL_MS) {
      browserSessions.delete(id)
    }
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

function normalizeLocalTarget(input: string): URL {
  const url = new URL(input)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https targets are supported')
  }
  if (!isLocalHost(url.hostname)) {
    throw new Error('Only localhost targets on the server are allowed')
  }
  return url
}

function sanitizeProxyHeaders(headers: Headers): Headers {
  const next = new Headers(headers)
  next.delete('host')
  next.delete('connection')
  next.delete('transfer-encoding')
  next.delete('authorization')
  return next
}

function rewriteHtmlForBrowserSession(html: string, sessionId: string): string {
  const prefix = `/PocketDev/browser/session/${sessionId}`

  let next = html.replace(
    /<(head)([^>]*)>/i,
    `<$1$2><base href="${prefix}/">`,
  )

  next = next
    .replace(/(src=|href=|action=)(["'])\/(?!\/)/gi, `$1$2${prefix}/`)
    .replace(/(["'])\/(api|assets|src|@vite|vite|sockjs|static|favicon)/gi, `$1${prefix}/$2`)

  return next
}

async function proxyToTarget(
  request: Request,
  set: { status?: number; headers: Record<string, string> },
  targetUrl: string,
  rewriteHtmlSessionId?: string,
) {
  try {
    const proxyReq = new Request(targetUrl, {
      method: request.method,
      headers: sanitizeProxyHeaders(request.headers),
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? request.body
        : undefined,
      redirect: 'manual',
    })

    const resp = await fetch(proxyReq)
    const headers: Record<string, string> = {}
    resp.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection', 'content-security-policy'].includes(key.toLowerCase())) {
        headers[key] = value
      }
    })

    set.status = resp.status
    set.headers = headers

    const contentType = resp.headers.get('content-type') ?? ''
    if (rewriteHtmlSessionId && contentType.includes('text/html')) {
      const html = await resp.text()
      set.headers['content-type'] = contentType
      return rewriteHtmlForBrowserSession(html, rewriteHtmlSessionId)
    }

    return resp.body
  } catch {
    set.status = 502
    return { error: 'Target not reachable' }
  }
}

function buildSessionRoutePath(sessionId: string, targetUrl: URL): string {
  const path = targetUrl.pathname === '/' ? '' : targetUrl.pathname
  return `/PocketDev/browser/session/${sessionId}${path}${targetUrl.search}`
}

export function createBrowserSession(target: string): BrowserSessionCreateResult {
  pruneBrowserSessions()
  const targetUrl = normalizeLocalTarget(target)
  const id = crypto.randomUUID()
  browserSessions.set(id, {
    id,
    targetUrl: targetUrl.toString(),
    targetOrigin: targetUrl.origin,
    createdAt: Date.now(),
  })

  return {
    session_id: id,
    target_url: targetUrl.toString(),
    proxied_url: buildSessionRoutePath(id, targetUrl),
  }
}

/** Update the dev server port (called when auto-detected from task output) */
export function setDevServerPort(port: number) {
  devServerPort = port
  console.log(`Dev server port set to ${port}`)
}

export function getDevServerPort(): number {
  return devServerPort
}

/** Auto-detect dev server port from process output lines */
export function detectDevServerPort(line: string): number | null {
  const patterns = [
    /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/,
    /listening on (?:port )?(\d+)/i,
    /server (?:running|started) (?:at|on) .*?:(\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      const port = Number(match[1])
      if (port > 0 && port < 65536) return port
    }
  }
  return null
}

export const proxyRoutes = new Elysia()
  .post('/api/browser/sessions', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    pruneBrowserSessions()

    const target = typeof body === 'object' && body && 'target_url' in body
      ? String((body as Record<string, unknown>).target_url ?? '')
      : ''

    try {
      return createBrowserSession(target)
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Invalid browser target' }
    }
  })
  .all('/browser/session/:sessionId', async ({ request, params, set }) => {
    pruneBrowserSessions()
    const session = browserSessions.get(params.sessionId)
    if (!session) {
      set.status = 404
      return { error: 'Browser session not found' }
    }

    return proxyToTarget(request, set as any, session.targetUrl, params.sessionId)
  })
  .all('/browser/session/:sessionId/*', async ({ request, params, set }) => {
    pruneBrowserSessions()
    const session = browserSessions.get(params.sessionId)
    if (!session) {
      set.status = 404
      return { error: 'Browser session not found' }
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(`/PocketDev/browser/session/${params.sessionId}`, '') || '/'
    const targetUrl = `${session.targetOrigin}${path}${url.search}`
    return proxyToTarget(request, set as any, targetUrl, params.sessionId)
  })
  .all('/preview/*', async ({ request, set }) => {
    const url = new URL(request.url)
    const targetPath = url.pathname.replace(/^\/preview/, '') || '/'
    const targetUrl = `http://localhost:${devServerPort}${targetPath}${url.search}`

    return proxyToTarget(request, set as any, targetUrl)
  })
