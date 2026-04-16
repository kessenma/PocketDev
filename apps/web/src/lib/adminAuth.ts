import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { timingSafeEqual } from 'node:crypto'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type { AuthenticatorTransport } from '@simplewebauthn/server'
import { db } from '@pocketdev/db'
import { adminPasskeys } from '@pocketdev/db/schema'
import { eq } from 'drizzle-orm'

const SESSION_COOKIE = 'admin_session'
const CHALLENGE_COOKIE = 'admin_webauthn_challenge'
const RP_NAME = 'PocketDev Admin'
// Stable user ID for the single admin account — "pocketdev" in bytes
const ADMIN_USER_ID = new Uint8Array([0x70, 0x6f, 0x63, 0x6b, 0x65, 0x74, 0x64, 0x65, 0x76])

function getWebAuthnConfig() {
  const appUrl = process.env.VITE_APP_URL ?? 'http://localhost:3000'
  const rpId = new URL(appUrl).hostname
  return { rpId, origin: appUrl }
}

function sessionCookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/admin',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  }
}

async function computeSessionToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD ?? ''
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('pocketdev-admin'))
  return Buffer.from(sig).toString('hex')
}

async function isSessionValid(cookie: string): Promise<boolean> {
  try {
    const expected = await computeSessionToken()
    const a = Buffer.from(cookie, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// ── Session ───────────────────────────────────────────────────────────────────

export const checkAdminSession = createServerFn().handler(async (): Promise<boolean> => {
  const cookie = getCookie(SESSION_COOKIE)
  if (!cookie) return false
  return isSessionValid(cookie)
})

export const loginWithPassword = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ password: z.string() }))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD
    if (!expected || data.password !== expected) {
      return { success: false }
    }
    const token = await computeSessionToken()
    setCookie(SESSION_COOKIE, token, sessionCookieOpts(60 * 60 * 24 * 30))
    return { success: true }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  deleteCookie(SESSION_COOKIE, { path: '/admin' })
  return { success: true }
})

// ── Passkey helpers ───────────────────────────────────────────────────────────

export const getPasskeyCount = createServerFn().handler(async () => {
  const rows = await db.select({ id: adminPasskeys.id }).from(adminPasskeys)
  return rows.length
})

export const listPasskeys = createServerFn().handler(async () => {
  const cookie = getCookie(SESSION_COOKIE)
  if (!cookie || !(await isSessionValid(cookie))) throw redirect({ to: '/admin/login' })
  const rows = await db
    .select({
      id: adminPasskeys.id,
      deviceName: adminPasskeys.deviceName,
      createdAt: adminPasskeys.createdAt,
      lastUsedAt: adminPasskeys.lastUsedAt,
    })
    .from(adminPasskeys)
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
  }))
})

export const deletePasskeyFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const cookie = getCookie(SESSION_COOKIE)
    if (!cookie || !(await isSessionValid(cookie))) throw redirect({ to: '/admin/login' })
    await db.delete(adminPasskeys).where(eq(adminPasskeys.id, data.id))
    return { success: true }
  })

// ── Passkey registration ──────────────────────────────────────────────────────

export const getPasskeyRegisterOptions = createServerFn({ method: 'POST' }).handler(async () => {
  const cookie = getCookie(SESSION_COOKIE)
  if (!cookie || !(await isSessionValid(cookie))) throw redirect({ to: '/admin/login' })

  const { rpId } = getWebAuthnConfig()
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@pocketdev.run'

  const existing = await db
    .select({ credentialId: adminPasskeys.credentialId, transports: adminPasskeys.transports })
    .from(adminPasskeys)

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId,
    userID: ADMIN_USER_ID,
    userName: adminEmail,
    userDisplayName: adminEmail,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: (p.transports ?? []) as AuthenticatorTransport[],
    })),
  })

  setCookie(CHALLENGE_COOKIE, options.challenge, sessionCookieOpts(300))
  return options
})

export const verifyPasskeyRegistration = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ deviceName: z.string(), response: z.any() }))
  .handler(async ({ data }) => {
    const cookie = getCookie(SESSION_COOKIE)
    if (!cookie || !(await isSessionValid(cookie))) throw redirect({ to: '/admin/login' })

    const challenge = getCookie(CHALLENGE_COOKIE)
    if (!challenge) return { success: false, error: 'Challenge expired — try again' }

    const { rpId, origin } = getWebAuthnConfig()

    let verification
    try {
      verification = await verifyRegistrationResponse({
        response: data.response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: true,
      })
    } catch (err) {
      return { success: false, error: String(err) }
    }

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'Verification failed' }
    }

    const { credential } = verification.registrationInfo
    await db.insert(adminPasskeys).values({
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      deviceName: data.deviceName,
      transports: (data.response.response?.transports ?? []) as string[],
    })

    deleteCookie(CHALLENGE_COOKIE, { path: '/admin' })
    return { success: true }
  })

// ── Passkey authentication ────────────────────────────────────────────────────

export const getPasskeyAuthOptions = createServerFn({ method: 'POST' }).handler(async () => {
  const { rpId } = getWebAuthnConfig()

  const existing = await db
    .select({ credentialId: adminPasskeys.credentialId, transports: adminPasskeys.transports })
    .from(adminPasskeys)

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: (p.transports ?? []) as AuthenticatorTransport[],
    })),
    userVerification: 'required',
  })

  setCookie(CHALLENGE_COOKIE, options.challenge, sessionCookieOpts(300))
  return options
})

export const verifyPasskeyAuth = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ response: z.any() }))
  .handler(async ({ data }) => {
    const challenge = getCookie(CHALLENGE_COOKIE)
    if (!challenge) return { success: false, error: 'Challenge expired — try again' }

    const { rpId, origin } = getWebAuthnConfig()

    const passkey = await db
      .select()
      .from(adminPasskeys)
      .where(eq(adminPasskeys.credentialId, data.response.id))
      .then((r) => r[0])

    if (!passkey) return { success: false, error: 'Unknown passkey' }

    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response: data.response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: true,
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
          counter: passkey.counter,
          transports: (passkey.transports ?? []) as AuthenticatorTransport[],
        },
      })
    } catch (err) {
      return { success: false, error: String(err) }
    }

    if (!verification.verified) return { success: false, error: 'Verification failed' }

    await db
      .update(adminPasskeys)
      .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() })
      .where(eq(adminPasskeys.id, passkey.id))

    const token = await computeSessionToken()
    setCookie(SESSION_COOKIE, token, sessionCookieOpts(60 * 60 * 24 * 30))
    deleteCookie(CHALLENGE_COOKIE, { path: '/admin' })
    return { success: true }
  })
