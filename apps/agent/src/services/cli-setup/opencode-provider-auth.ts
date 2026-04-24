import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  CopilotOpenCodeAuthSessionState,
  CopilotOpenCodeAuthSessionStatus,
  CopilotOpenCodeAuthStartResult,
  OpenAIOpenCodeAuthMethod,
  OpenAIOpenCodeAuthSessionState,
  OpenAIOpenCodeAuthSessionStatus,
  OpenAIOpenCodeAuthStartResult,
  OpenCodeProviderAuthStatus,
} from '@pocketdev/shared/types'
import { checkOpenCodeStatus } from './opencode-setup.ts'

// ─── Constants ─────────────────────────────────────────────────────────────

const GITHUB_COPILOT_CLIENT_ID = 'Ov23li8tweQw6odWQebz'
const GITHUB_DOMAIN = 'github.com'

const OPENAI_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const OPENAI_ISSUER = 'https://auth.openai.com'
const OPENAI_DEVICE_CODE_URL = `${OPENAI_ISSUER}/api/accounts/deviceauth/usercode`
const OPENAI_DEVICE_TOKEN_URL = `${OPENAI_ISSUER}/api/accounts/deviceauth/token`
const OPENAI_TOKEN_URL = `${OPENAI_ISSUER}/oauth/token`
const OPENAI_VERIFICATION_URL = 'https://auth.openai.com/codex/device'

const OAUTH_POLLING_SAFETY_MARGIN_MS = 3000
const SESSION_TTL_MS = 10 * 60 * 1000 // 10 minutes

// ─── Auth.json ─────────────────────────────────────────────────────────────

function getAuthJsonPath(): string {
  const home = process.env.HOME ?? '/root'
  // XDG_DATA_HOME or fallback to ~/.local/share/opencode/auth.json
  const dataDir = process.env.XDG_DATA_HOME
    ? `${process.env.XDG_DATA_HOME}/opencode`
    : `${home}/.local/share/opencode`
  return `${dataDir}/auth.json`
}

function readAuthJson(): Record<string, unknown> {
  const path = getAuthJsonPath()
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>
  } catch {
    return {}
  }
}

function writeAuthJson(data: Record<string, unknown>): void {
  const path = getAuthJsonPath()
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), { mode: 0o600 })
}

function setProviderAuth(provider: string, info: Record<string, unknown>): void {
  const current = readAuthJson()
  // Normalize key: strip trailing slashes, remove both variants
  const norm = provider.replace(/\/+$/, '')
  delete current[norm + '/']
  delete current[norm]
  current[norm] = info
  writeAuthJson(current)
}

function getProviderAuthEntry(provider: string): Record<string, unknown> | null {
  const data = readAuthJson()
  const norm = provider.replace(/\/+$/, '')
  return (data[norm] ?? data[norm + '/'] ?? null) as Record<string, unknown> | null
}

// ─── Provider auth status (detect step) ────────────────────────────────────

export async function checkOpenCodeProviderAuthStatus(
  provider: 'openai' | 'github-copilot',
): Promise<OpenCodeProviderAuthStatus> {
  const openCodeStatus = await checkOpenCodeStatus()
  const entry = getProviderAuthEntry(provider)

  let authenticated = false
  let authType: 'oauth' | 'api' | null = null

  if (entry && typeof entry.type === 'string') {
    if (entry.type === 'oauth' && entry.refresh) {
      authenticated = true
      authType = 'oauth'
    } else if (entry.type === 'api' && entry.key) {
      authenticated = true
      authType = 'api'
    }
  }

  return {
    opencode_installed: openCodeStatus.installed,
    opencode_version: openCodeStatus.version,
    provider,
    authenticated,
    auth_type: authType,
  }
}

// ─── GitHub Copilot auth session ────────────────────────────────────────────

interface CopilotAuthSession {
  id: string
  state: CopilotOpenCodeAuthSessionState
  verificationUri: string | null
  userCode: string | null
  deviceCode: string | null
  pollInterval: number
  authenticated: boolean
  error: string | null
  startedAt: number
}

const copilotSessions = new Map<string, CopilotAuthSession>()

function cleanupStaleCopilotSessions(): void {
  const now = Date.now()
  for (const [id, s] of copilotSessions) {
    if (now - s.startedAt > SESSION_TTL_MS) copilotSessions.delete(id)
  }
}

function copilotSessionToStatus(s: CopilotAuthSession): CopilotOpenCodeAuthSessionStatus {
  return {
    session_id: s.id,
    state: s.state,
    authenticated: s.authenticated,
    verification_uri: s.verificationUri,
    user_code: s.userCode,
    output_excerpt: s.verificationUri && s.userCode
      ? `Go to: ${s.verificationUri}\nEnter code: ${s.userCode}`
      : null,
    error: s.error,
  }
}

export async function startCopilotOpenCodeAuth(): Promise<CopilotOpenCodeAuthStartResult> {
  cleanupStaleCopilotSessions()

  const sessionId = randomUUID()
  const session: CopilotAuthSession = {
    id: sessionId,
    state: 'starting',
    verificationUri: null,
    userCode: null,
    deviceCode: null,
    pollInterval: 5000,
    authenticated: false,
    error: null,
    startedAt: Date.now(),
  }
  copilotSessions.set(sessionId, session)

  try {
    const res = await fetch(`https://${GITHUB_DOMAIN}/login/device/code`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'opencode/0.0.0',
      },
      body: JSON.stringify({ client_id: GITHUB_COPILOT_CLIENT_ID, scope: 'read:user' }),
    })

    if (!res.ok) {
      session.state = 'failed'
      session.error = `GitHub device code request failed: ${res.status}`
      return copilotSessionToStatus(session)
    }

    const data = await res.json() as {
      verification_uri: string
      user_code: string
      device_code: string
      interval: number
    }

    session.verificationUri = data.verification_uri
    session.userCode = data.user_code
    session.deviceCode = data.device_code
    session.pollInterval = (data.interval ?? 5) * 1000
    session.state = 'awaiting_device_code'
  } catch (err) {
    session.state = 'failed'
    session.error = err instanceof Error ? err.message : String(err)
  }

  return copilotSessionToStatus(session)
}

export async function getCopilotOpenCodeAuthStatus(sessionId: string): Promise<CopilotOpenCodeAuthSessionStatus | null> {
  const session = copilotSessions.get(sessionId)
  if (!session) return null

  // If already terminal, just return
  if (session.authenticated || session.state === 'failed') {
    return copilotSessionToStatus(session)
  }

  // Poll GitHub for token
  if (session.deviceCode && (session.state === 'awaiting_device_code' || session.state === 'pending')) {
    session.state = 'pending'
    try {
      const res = await fetch(`https://${GITHUB_DOMAIN}/login/oauth/access_token`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'opencode/0.0.0',
        },
        body: JSON.stringify({
          client_id: GITHUB_COPILOT_CLIENT_ID,
          device_code: session.deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      })

      if (res.ok) {
        const data = await res.json() as {
          access_token?: string
          error?: string
          interval?: number
        }

        if (data.access_token) {
          setProviderAuth('github-copilot', {
            type: 'oauth',
            refresh: data.access_token,
            access: data.access_token,
            expires: 0,
          })
          session.authenticated = true
          session.state = 'authenticated'
        } else if (data.error === 'slow_down' && data.interval) {
          session.pollInterval = (data.interval + OAUTH_POLLING_SAFETY_MARGIN_MS / 1000) * 1000
        }
        // authorization_pending: keep polling
      }
    } catch {
      // Network error, keep polling
    }
  }

  return copilotSessionToStatus(session)
}

// ─── OpenAI auth sessions ───────────────────────────────────────────────────

interface OpenAIAuthSession {
  id: string
  method: OpenAIOpenCodeAuthMethod
  state: OpenAIOpenCodeAuthSessionState
  authUrl: string | null
  verificationUrl: string | null
  userCode: string | null
  deviceAuthId: string | null
  codeVerifier: string | null
  authenticated: boolean
  error: string | null
  startedAt: number
}

const openaiSessions = new Map<string, OpenAIAuthSession>()

function cleanupStaleOpenAISessions(): void {
  const now = Date.now()
  for (const [id, s] of openaiSessions) {
    if (now - s.startedAt > SESSION_TTL_MS) openaiSessions.delete(id)
  }
}

function openaiSessionToStatus(s: OpenAIAuthSession): OpenAIOpenCodeAuthSessionStatus {
  return {
    session_id: s.id,
    method: s.method,
    state: s.state,
    authenticated: s.authenticated,
    auth_url: s.authUrl,
    verification_url: s.verificationUrl,
    user_code: s.userCode,
    output_excerpt: s.state === 'awaiting_device_code' && s.userCode
      ? `Go to: ${s.verificationUrl}\nEnter code: ${s.userCode}`
      : null,
    error: s.error,
  }
}

export async function startOpenAIOpenCodeAuth(
  method: OpenAIOpenCodeAuthMethod,
  apiKey?: string,
): Promise<OpenAIOpenCodeAuthStartResult> {
  cleanupStaleOpenAISessions()

  const sessionId = randomUUID()
  const session: OpenAIAuthSession = {
    id: sessionId,
    method,
    state: 'starting',
    authUrl: null,
    verificationUrl: null,
    userCode: null,
    deviceAuthId: null,
    codeVerifier: null,
    authenticated: false,
    error: null,
    startedAt: Date.now(),
  }
  openaiSessions.set(sessionId, session)

  if (method === 'api_key') {
    if (!apiKey?.trim()) {
      session.state = 'failed'
      session.error = 'API key must not be empty.'
      return openaiSessionToStatus(session)
    }
    setProviderAuth('openai', { type: 'api', key: apiKey.trim() })
    session.authenticated = true
    session.state = 'authenticated'
    return openaiSessionToStatus(session)
  }

  if (method === 'headless') {
    try {
      const res = await fetch(OPENAI_DEVICE_CODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'opencode/0.0.0' },
        body: JSON.stringify({ client_id: OPENAI_CLIENT_ID }),
      })

      if (!res.ok) {
        session.state = 'failed'
        session.error = `OpenAI device code request failed: ${res.status}`
        return openaiSessionToStatus(session)
      }

      const data = await res.json() as {
        device_auth_id: string
        user_code: string
        interval: string
      }

      session.deviceAuthId = data.device_auth_id
      session.userCode = data.user_code
      session.verificationUrl = OPENAI_VERIFICATION_URL
      session.state = 'awaiting_device_code'
    } catch (err) {
      session.state = 'failed'
      session.error = err instanceof Error ? err.message : String(err)
    }
    return openaiSessionToStatus(session)
  }

  // browser mode — return the auth URL for the mobile app to open
  // OpenAI's OAuth redirect URI used by opencode
  const authUrl = `${OPENAI_ISSUER}/authorize?client_id=${OPENAI_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(`${OPENAI_ISSUER}/deviceauth/callback`)}`
  session.authUrl = authUrl
  session.state = 'awaiting_browser'
  return openaiSessionToStatus(session)
}

export async function getOpenAIOpenCodeAuthStatus(sessionId: string): Promise<OpenAIOpenCodeAuthSessionStatus | null> {
  const session = openaiSessions.get(sessionId)
  if (!session) return null

  if (session.authenticated || session.state === 'failed') {
    return openaiSessionToStatus(session)
  }

  // Poll for headless device code completion
  if (session.method === 'headless' && session.deviceAuthId && session.userCode &&
      (session.state === 'awaiting_device_code' || session.state === 'pending')) {
    session.state = 'pending'
    try {
      const res = await fetch(OPENAI_DEVICE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'opencode/0.0.0' },
        body: JSON.stringify({ device_auth_id: session.deviceAuthId, user_code: session.userCode }),
      })

      if (res.ok) {
        const data = await res.json() as {
          authorization_code?: string
          code_verifier?: string
          error?: string
        }

        if (data.authorization_code && data.code_verifier) {
          // Exchange authorization code for tokens
          const tokenRes = await fetch(OPENAI_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'opencode/0.0.0' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: data.authorization_code,
              redirect_uri: `${OPENAI_ISSUER}/deviceauth/callback`,
              client_id: OPENAI_CLIENT_ID,
              code_verifier: data.code_verifier,
            }).toString(),
          })

          if (tokenRes.ok) {
            const tokens = await tokenRes.json() as {
              access_token: string
              refresh_token: string
              expires_in?: number
            }
            setProviderAuth('openai', {
              type: 'oauth',
              refresh: tokens.refresh_token,
              access: tokens.access_token,
              expires: Date.now() + (tokens.expires_in ?? 3600) * 1000,
            })
            session.authenticated = true
            session.state = 'authenticated'
          }
        }
        // Otherwise still pending — user hasn't entered code yet
      }
    } catch {
      // Network error, keep polling
    }
    return openaiSessionToStatus(session)
  }

  return openaiSessionToStatus(session)
}

export async function submitOpenAIBrowserCallback(
  sessionId: string,
  callbackUrl: string,
): Promise<OpenAIOpenCodeAuthSessionStatus | null> {
  const session = openaiSessions.get(sessionId)
  if (!session || session.method !== 'browser') return null

  // Try fetching the callback URL on loopback candidates
  const loopbackCandidates = ['localhost', '127.0.0.1', '[::1]']
  let success = false

  for (const host of loopbackCandidates) {
    try {
      const url = callbackUrl.replace(/^https?:\/\/localhost/, `http://${host}`)
      const res = await fetch(url, { redirect: 'manual' })
      if (res.status >= 200 && res.status < 400) {
        success = true
        break
      }
    } catch {
      // try next
    }
  }

  if (success) {
    // Verify auth was stored
    const status = await checkOpenCodeProviderAuthStatus('openai')
    if (status.authenticated) {
      session.authenticated = true
      session.state = 'authenticated'
    } else {
      session.error = 'Callback processed but authentication not confirmed. Please try again.'
    }
  } else {
    session.error = 'Could not reach the callback URL. Make sure you copied the full URL from the browser.'
  }

  return openaiSessionToStatus(session)
}

export async function verifyOpenCodeProviderAuth(
  provider: 'openai' | 'github-copilot',
): Promise<OpenCodeProviderAuthStatus> {
  return checkOpenCodeProviderAuthStatus(provider)
}
