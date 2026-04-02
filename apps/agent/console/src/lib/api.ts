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

export async function removeDevice(id: string) {
  const res = await del(`/devices/${id}`)
  if (!res.ok) throw new Error('Failed to remove device')
  return res.json()
}
