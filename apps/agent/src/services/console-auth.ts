import { randomBytes } from 'node:crypto'
import {
  hasAdminAccount,
  getAdminAccount,
  insertAdminAccount,
  getConfig,
  setConfig,
} from '../db/index.ts'
import { setCustomCode, refreshSetupCode, getSetupCode } from './setup.ts'

// ─── Admin account ──────────────────────────────────────

export async function createAdmin(email: string, password: string): Promise<void> {
  if (hasAdminAccount()) {
    throw new Error('Admin account already exists')
  }
  const hash = await Bun.password.hash(password)
  insertAdminAccount(email, hash)
}

export async function verifyAdmin(email: string, password: string): Promise<boolean> {
  const admin = getAdminAccount()
  if (!admin || admin.email !== email) return false
  return Bun.password.verify(password, admin.passwordHash)
}

// ─── Session management ─────────────────────────────────

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export function createSession(email: string): string {
  const token = randomBytes(32).toString('hex')
  const key = `console_session:${token}`
  const value = JSON.stringify({ email, expiresAt: Date.now() + SESSION_TTL_MS })
  setConfig(key, value)
  return token
}

export function validateSession(cookieHeader: string | null): boolean {
  const token = parseCookie(cookieHeader, 'pocketdev_session')
  if (!token) return false

  const raw = getConfig(`console_session:${token}`)
  if (!raw) return false

  try {
    const session = JSON.parse(raw) as { email: string; expiresAt: number }
    if (Date.now() > session.expiresAt) return false
    // Ensure the admin account still exists (may have been reset via install script)
    if (!hasAdminAccount()) return false
    return true
  } catch {
    return false
  }
}

export function clearSession(cookieHeader: string | null): void {
  const token = parseCookie(cookieHeader, 'pocketdev_session')
  if (!token) return
  // Remove from server_config by setting to expired
  setConfig(`console_session:${token}`, JSON.stringify({ email: '', expiresAt: 0 }))
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match?.[1] ?? null
}

// ─── Custom passcode ────────────────────────────────────

export function setCustomPasscode(code: string): void {
  setCustomCode(code)
  setConfig('custom_setup_code', code)
}

export function getActivePasscode(): string | null {
  return getSetupCode()
}

export function regeneratePasscode(): string {
  return refreshSetupCode()
}

export function sessionCookieHeader(token: string): string {
  return `pocketdev_session=${token}; HttpOnly; Path=/PocketDev; SameSite=Strict; Max-Age=86400`
}
