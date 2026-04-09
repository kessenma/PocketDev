import { randomBytes } from 'node:crypto'
import {
  hasAdminAccount,
  getAdminAccountByEmail,
  getAdminAccountById,
  insertAdminAccount,
  insertPendingAdminAccount,
  touchAdminAccountLogin,
  getConfig,
  setConfig,
  type AdminAccountRow,
  type ConsoleUserRole,
} from '../db/index.ts'
import { setCustomCode, refreshSetupCode, getSetupCode } from './setup.ts'

const CONSOLE_SIGNUP_ENABLED_KEY = 'console_signup_enabled'
const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export type ConsolePermissions = {
  canManageUsers: boolean
  canManageRoles: boolean
  canToggleSignup: boolean
}

type LoginResult =
  | { ok: true; user: AdminAccountRow }
  | { ok: false; error: string }

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match?.[1] ?? null
}

function isActiveUser(user: AdminAccountRow | undefined): user is AdminAccountRow {
  return !!user && user.status === 'active'
}

export function getConsolePermissions(user: AdminAccountRow): ConsolePermissions {
  const isOwner = user.role === 'owner'
  const canManageUsers = isOwner || user.role === 'admin'

  return {
    canManageUsers,
    canManageRoles: isOwner,
    canToggleSignup: isOwner,
  }
}

export function isConsoleSignupEnabled(): boolean {
  return getConfig(CONSOLE_SIGNUP_ENABLED_KEY) !== '0'
}

export function setConsoleSignupEnabled(enabled: boolean): void {
  setConfig(CONSOLE_SIGNUP_ENABLED_KEY, enabled ? '1' : '0')
}

export function canManageTargetUser(actor: AdminAccountRow, target: AdminAccountRow): boolean {
  if (target.role === 'owner') return false
  if (actor.role === 'owner') return true
  return actor.role === 'admin' && target.role === 'member'
}

export async function createAdmin(email: string, password: string): Promise<void> {
  if (hasAdminAccount()) {
    throw new Error('Admin account already exists')
  }

  const normalizedEmail = normalizeEmail(email)
  const hash = await Bun.password.hash(password)
  insertAdminAccount(normalizedEmail, hash)
}

export async function createSignupRequest(email: string, password: string): Promise<void> {
  if (!hasAdminAccount()) {
    throw new Error('Use setup to create the first owner account')
  }

  if (!isConsoleSignupEnabled()) {
    throw new Error('Sign-ups are currently closed')
  }

  const normalizedEmail = normalizeEmail(email)
  const existing = getAdminAccountByEmail(normalizedEmail)
  if (existing) {
    if (existing.status === 'pending') {
      throw new Error('A signup request for this email is already pending')
    }
    if (existing.status === 'active') {
      throw new Error('An account already exists for this email')
    }
    if (existing.status === 'denied') {
      throw new Error('This signup request was denied')
    }
    throw new Error('This account has been revoked')
  }

  const hash = await Bun.password.hash(password)
  insertPendingAdminAccount(normalizedEmail, hash)
}

export async function authenticateConsoleUser(email: string, password: string): Promise<LoginResult> {
  const normalizedEmail = normalizeEmail(email)
  const user = getAdminAccountByEmail(normalizedEmail)
  if (!user) {
    return { ok: false, error: 'Invalid email or password' }
  }

  const valid = await Bun.password.verify(password, user.passwordHash)
  if (!valid) {
    return { ok: false, error: 'Invalid email or password' }
  }

  if (user.status === 'pending') {
    return { ok: false, error: 'Your signup is still pending approval' }
  }
  if (user.status === 'denied') {
    return { ok: false, error: 'Your signup request was denied' }
  }
  if (user.status === 'revoked') {
    return { ok: false, error: 'Your access has been revoked' }
  }

  touchAdminAccountLogin(user.id)
  return { ok: true, user: getAdminAccountById(user.id) ?? user }
}

export function createSession(userId: number): string {
  const token = randomBytes(32).toString('hex')
  const key = `console_session:${token}`
  const value = JSON.stringify({ userId, expiresAt: Date.now() + SESSION_TTL_MS })
  setConfig(key, value)
  return token
}

export function getSessionUser(cookieHeader: string | null): AdminAccountRow | null {
  const token = parseCookie(cookieHeader, 'pocketdev_session')
  if (!token) return null

  const raw = getConfig(`console_session:${token}`)
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as { userId: number; expiresAt: number }
    if (Date.now() > session.expiresAt) return null

    const user = getAdminAccountById(session.userId)
    if (!isActiveUser(user)) return null
    return user
  } catch {
    return null
  }
}

export function validateSession(cookieHeader: string | null): boolean {
  return getSessionUser(cookieHeader) !== null
}

export function clearSession(cookieHeader: string | null): void {
  const token = parseCookie(cookieHeader, 'pocketdev_session')
  if (!token) return
  setConfig(`console_session:${token}`, JSON.stringify({ userId: 0, expiresAt: 0 }))
}

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

export function isOwnerRole(role: ConsoleUserRole) {
  return role === 'owner'
}
