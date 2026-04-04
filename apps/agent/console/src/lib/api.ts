const BASE = '/PocketDev/api/console'

async function post(path: string, body?: Record<string, string>) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  return response
}

async function get(path: string) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
  })
  return response
}

async function del(path: string) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  })
  return response
}

export async function checkHealth(): Promise<{
  hasAdmin: boolean
  paired: boolean
  uptime: number
}> {
  const res = await get('/health')
  return res.json()
}

export async function createAdmin(email: string, password: string) {
  const res = await post('/setup', { email, password })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Setup failed' }))
    throw new Error(data.error || 'Setup failed')
  }
  return res.json()
}

export async function login(email: string, password: string) {
  const res = await post('/login', { email, password })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Login failed' }))
    throw new Error(data.error || 'Login failed')
  }
  return res.json()
}

export async function logout() {
  await post('/logout')
}

export interface ConsoleStatus {
  paired: boolean
  devices: Array<{
    id: string
    name: string | null
    platform: string | null
    lastSeenAt: string | null
  }>
  passcode: string | null
  serverIp: string
  port: number
}

export async function fetchStatus(): Promise<ConsoleStatus> {
  const res = await get('/status')
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export async function setPasscode(code: string) {
  const res = await post('/passcode', { code })
  if (!res.ok) throw new Error('Failed to set passcode')
  return res.json()
}

export async function refreshPasscode() {
  const res = await post('/passcode/refresh')
  if (!res.ok) throw new Error('Failed to refresh passcode')
  return res.json()
}

export interface ToolCheck {
  id: string
  name: string
  status: 'installed' | 'missing' | 'misconfigured'
  auth_status: 'authenticated' | 'unauthenticated' | 'unknown' | 'not_applicable'
  version: string | null
  path: string | null
  required: boolean
  details: Record<string, string | null>
}

export interface PrerequisitesReport {
  os: string
  arch: string
  tools: ToolCheck[]
  ready: boolean
}

export async function fetchPrerequisites(): Promise<PrerequisitesReport> {
  const res = await get('/prerequisites')
  if (!res.ok) throw new Error('Failed to fetch prerequisites')
  return res.json()
}

export async function renameDevice(id: string, name: string) {
  const res = await fetch(`${BASE}/devices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
    credentials: 'same-origin',
  })
  if (!res.ok) throw new Error('Failed to rename device')
  return res.json()
}

export async function removeDevice(id: string) {
  const res = await del(`/devices/${id}`)
  if (!res.ok) throw new Error('Failed to remove device')
  return res.json()
}

// ─── Debug ──────────────────────────────────────────────

export interface AuthDebugInfo {
  serverTime: number
  serverTimeISO: string
  deviceCount: number
  devices: Array<{
    id: string
    name: string | null
    platform: string | null
    publicKeyPrefix: string
    lastSeenAt: string | null
  }>
}

export async function fetchAuthDebug(): Promise<AuthDebugInfo> {
  const res = await get('/debug/auth')
  if (!res.ok) throw new Error('Failed to fetch auth debug')
  return res.json()
}

export interface TerminalDebugEntry {
  ts: string
  msg: string
}

export async function fetchTerminalDebug(): Promise<TerminalDebugEntry[]> {
  const res = await get('/debug/terminal')
  if (!res.ok) throw new Error('Failed to fetch terminal debug')
  const data = await res.json() as { entries: TerminalDebugEntry[] }
  return data.entries
}

export interface CodexAuthDebugSession {
  sessionId: string
  state: string
  authenticated: boolean
  completed: boolean
  authUrl: string | null
  verificationCode: string | null
  prompt: string | null
  error: string | null
  startedAt: string
  updatedAt: string
  outputExcerpt: string | null
}

export interface CodexReplayDebugInfo {
  sessionId: string | null
  inputCallbackUrl: string | null
  attempts: string[]
  success: boolean
  statusCode: number | null
  error: string | null
  sessionOutputExcerpt: string | null
  sessionPrompt: string | null
  recordedAt: string
}

export interface CodexAuthDebugInfo {
  activeSessionCount: number
  sessions: CodexAuthDebugSession[]
  lastReplayDebug: CodexReplayDebugInfo | null
  persistedState: {
    toolId: string
    path: string | null
    version: string | null
    authenticated: boolean
    updatedAt: string | null
  } | null
}

export async function fetchCodexAuthDebug(): Promise<CodexAuthDebugInfo> {
  const res = await get('/debug/codex-auth')
  if (!res.ok) throw new Error('Failed to fetch Codex auth debug')
  return res.json()
}

export interface ClaudeAuthDebugSession {
  sessionId: string
  state: string
  authenticated: boolean
  completed: boolean
  authUrl: string | null
  prompt: string | null
  error: string | null
  themeHandled: boolean
  methodHandled: boolean
  startedAt: string
  updatedAt: string
  outputExcerpt: string | null
}

export interface ClaudeAuthDebugInfo {
  activeSessionCount: number
  sessions: ClaudeAuthDebugSession[]
  persistedState: {
    toolId: string
    path: string | null
    version: string | null
    authenticated: boolean
    updatedAt: string | null
  } | null
}

export async function fetchClaudeAuthDebug(): Promise<ClaudeAuthDebugInfo> {
  const res = await get('/debug/claude-auth')
  if (!res.ok) throw new Error('Failed to fetch Claude auth debug')
  return res.json()
}

export interface GitHubAuthDebugSession {
  sessionId: string
  state: string
  authenticated: boolean
  completed: boolean
  authUrl: string | null
  verificationCode: string | null
  githubUsername: string | null
  privateRepoAccess: boolean
  error: string | null
  startedAt: string
  updatedAt: string
  outputExcerpt: string | null
}

export interface GitHubAuthDebugInfo {
  activeSessionCount: number
  sessions: GitHubAuthDebugSession[]
  persistedState: {
    toolId: string
    path: string | null
    version: string | null
    authenticated: boolean
    updatedAt: string | null
  } | null
}

export async function fetchGitHubAuthDebug(): Promise<GitHubAuthDebugInfo> {
  const res = await get('/debug/github-auth')
  if (!res.ok) throw new Error('Failed to fetch GitHub auth debug')
  return res.json()
}
