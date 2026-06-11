// Intercepts every console API call (all of which funnel through `#/lib/api`'s
// fetch helpers at `/PocketDev/api/console/*`) and answers with static fixtures.
// Non-API requests (fonts, assets) fall through to the real fetch untouched.
import * as fx from './fixtures'

const API_PREFIX = '/PocketDev/api/console'

/** Sentinel: this route is not explicitly handled, fall back to a method default. */
const PASS = Symbol('pass')

// Mutable demo state so the self-update flow resolves cleanly: once an "update"
// is triggered, /health reports the new version with a fresh uptime, which the
// console's restart-detection poll picks up on its next tick (success → reload).
const state: { updatedToVersion: string | null } = { updatedToVersion: null }

function healthInfo() {
  if (!state.updatedToVersion) return fx.health
  const v = state.updatedToVersion
  return {
    ...fx.health,
    version: v,
    uptime: 6, // < the pre-update baseline, so the poll detects a "restart"
    update: { ...fx.updateInfo, current: v, latest: v, updateAvailable: false },
  }
}

function readBody(init?: RequestInit): any {
  if (!init?.body || typeof init.body !== 'string') return {}
  try {
    return JSON.parse(init.body)
  } catch {
    return {}
  }
}

function randomPasscode(): string {
  const n = Math.floor(100000 + Math.random() * 900000)
  return `${String(n).slice(0, 3)} ${String(n).slice(3)}`
}

function resolve(
  method: string,
  path: string,
  params: URLSearchParams,
  body: any,
): unknown | typeof PASS {
  // ── GET: read endpoints ──
  if (method === 'GET') {
    switch (path) {
      case '/health': return healthInfo()
      case '/status': return fx.status
      case '/users': return fx.users
      case '/prerequisites': return fx.prerequisites
      case '/repo/summary': return fx.repoSummary
      case '/repo/list': return fx.repoList(params.get('path') ?? '.')
      case '/repo/read': return fx.repoFile(params.get('path') ?? '')
      case '/repo/search': return fx.repoSearch(params.get('q') ?? '', params.get('path') ?? '.')
      case '/debug/tasks': return fx.tasksDebug
      case '/debug/setup': return fx.setupDebug
      case '/debug/auth': return fx.authDebug
      case '/debug/network': return fx.networkDebug
      case '/debug/projects': return fx.projectsDebug
      case '/projects': return { projects: fx.projects }
      case '/envs': return { envVars: fx.envVars }
      case '/settings/domain': return fx.domainSettings
      case '/lock/status': return fx.lockStatus
    }
    if (path in fx.debugDefaults) return fx.debugDefaults[path]
    return {}
  }

  // ── Mutations: echo back believable success payloads ──
  switch (path) {
    case '/passcode': return { code: body.code ?? fx.status.passcode }
    case '/passcode/refresh': return { code: randomPasscode() }
    case '/settings/domain': return { ok: true, url: `https://${body.domain}` }
    case '/settings/signup': return { ...fx.users, signupEnabled: !!body.enabled }
    case '/projects/select': return { ok: true }
    case '/version/refresh': return { update: healthInfo().update }
    case '/update':
      state.updatedToVersion = body.version ?? fx.DEMO_LATEST_VERSION
      return { ok: true, message: `Updating to v${state.updatedToVersion}…` }
    case '/envs':
      return {
        id: `env-${Date.now()}`,
        projectPath: body.projectPath ?? fx.DEMO_PROJECT_PATH,
        key: body.key ?? 'NEW_VAR',
        value: body.value ?? null,
        comment: body.comment ?? null,
        isSecret: !!body.isSecret,
        isMultiline: !!body.isMultiline,
        order: fx.envVars.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    case '/envs/bulk': return { envVars: fx.envVars }
  }

  // Dynamic mutation routes
  if (path.startsWith('/users/')) return fx.users // /users/:id/status | /users/:id/role
  if (path.startsWith('/envs/')) return { ok: true } // PATCH/DELETE /envs/:id
  if (path.startsWith('/devices/')) return { ok: true } // PATCH/DELETE /devices/:id
  if (path.startsWith('/debug/tasks/')) return { success: true } // kill | answer
  if (path in fx.debugDefaults) return fx.debugDefaults[path] // /swap/enable | /swap/disable

  return PASS
}

let installed = false

export function installMockFetch(): void {
  if (installed) return
  installed = true

  const realFetch = window.fetch.bind(window)

  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

    const idx = url.indexOf(API_PREFIX)
    if (idx === -1) return realFetch(input, init)

    // Split the path after the prefix from its query string.
    const rest = url.slice(idx + API_PREFIX.length)
    const [rawPath, rawQuery = ''] = rest.split('?')
    const path = rawPath || '/'
    const params = new URLSearchParams(rawQuery)
    const body = input instanceof Request ? {} : readBody(init)

    let result = resolve(method, path, params, body)
    if (result === PASS) result = method === 'GET' ? {} : { ok: true }

    // Tiny latency so spinners/optimistic UI behave like the real thing.
    await new Promise((r) => setTimeout(r, 60))

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  window.fetch = mockFetch as unknown as typeof window.fetch
}
