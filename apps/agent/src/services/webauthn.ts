import { randomUUID, randomBytes } from 'node:crypto'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import {
  getPasskeysByAdminId,
  getPasskeyByCredentialId,
  getAdminAccountById,
  insertPasskeyCredential,
  updatePasskeyCounter,
} from '../db/index.ts'

// ─── In-memory challenge store ─────────────────────────

interface ChallengeEntry {
  challenge: string
  adminId: number | null // null for authentication (user unknown until verified)
  type: 'registration' | 'authentication'
  expiresAt: number
}

const challenges = new Map<string, ChallengeEntry>()

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Cleanup expired challenges every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of challenges) {
    if (now > entry.expiresAt) challenges.delete(id)
  }
}, 60_000)

function storeChallenge(
  challenge: string,
  adminId: number | null,
  type: 'registration' | 'authentication',
): string {
  const challengeId = randomBytes(16).toString('hex')
  challenges.set(challengeId, {
    challenge,
    adminId,
    type,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  })
  return challengeId
}

function consumeChallenge(challengeId: string, type: 'registration' | 'authentication'): ChallengeEntry | null {
  const entry = challenges.get(challengeId)
  if (!entry) return null
  if (entry.type !== type) return null
  if (Date.now() > entry.expiresAt) {
    challenges.delete(challengeId)
    return null
  }
  challenges.delete(challengeId)
  return entry
}

// ─── RP config from request ────────────────────────────

export function getRpConfig(request: Request): { rpID: string; origin: string; rpName: string } {
  const host = request.headers.get('host') ?? 'localhost:4387'
  const hostname = host.replace(/:\d+$/, '')

  // Determine protocol: if hostname is an IP or localhost, use http; otherwise https
  const isLocalOrIp = hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  const proto = isLocalOrIp ? 'http' : 'https'

  return {
    rpID: hostname,
    origin: `${proto}://${host}`,
    rpName: 'PocketDev Agent',
  }
}

// ─── Registration ──────────────────────────────────────

export async function createRegistrationOptions(
  adminId: number,
  email: string,
  request: Request,
) {
  const { rpID, rpName } = getRpConfig(request)

  const existingCredentials = getPasskeysByAdminId(adminId)
  const excludeCredentials = existingCredentials.map((cred) => ({
    id: cred.credentialId,
    transports: cred.transports
      ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
      : undefined,
  }))

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: email,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    excludeCredentials,
  })

  const challengeId = storeChallenge(options.challenge, adminId, 'registration')

  return { options, challengeId }
}

export async function verifyAndStoreRegistration(
  challengeId: string,
  credential: RegistrationResponseJSON,
  deviceName: string | null,
  request: Request,
) {
  const entry = consumeChallenge(challengeId, 'registration')
  if (!entry) throw new Error('Invalid or expired challenge')

  const { rpID, origin } = getRpConfig(request)

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: entry.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed')
  }

  const { credential: regCredential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

  const id = randomUUID()
  insertPasskeyCredential({
    id,
    adminId: entry.adminId!,
    credentialId: regCredential.id,
    publicKey: Buffer.from(regCredential.publicKey).toString('base64url'),
    counter: regCredential.counter,
    credentialDeviceType,
    credentialBackedUp,
    transports: credential.response.transports as string[] | null ?? null,
    deviceName,
    aaguid: verification.registrationInfo.aaguid,
  })

  return { verified: true, credentialId: id }
}

// ─── Authentication ────────────────────────────────────

export async function createAuthenticationOptions(request: Request) {
  const { rpID } = getRpConfig(request)

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    // Empty allowCredentials = discoverable credentials
  })

  const challengeId = storeChallenge(options.challenge, null, 'authentication')

  return { options, challengeId }
}

export async function verifyAuthenticationCredential(
  challengeId: string,
  credential: AuthenticationResponseJSON,
  request: Request,
): Promise<{ verified: boolean; adminId: number }> {
  const entry = consumeChallenge(challengeId, 'authentication')
  if (!entry) throw new Error('Invalid or expired challenge')

  // Look up credential
  const storedCred = getPasskeyByCredentialId(credential.id)
  if (!storedCred || storedCred.isActive !== 1) {
    throw new Error('Credential not found or inactive')
  }

  const { rpID, origin } = getRpConfig(request)

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: entry.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: storedCred.credentialId,
      publicKey: Buffer.from(storedCred.publicKey, 'base64url'),
      counter: storedCred.counter,
      transports: storedCred.transports
        ? (JSON.parse(storedCred.transports) as AuthenticatorTransportFuture[])
        : undefined,
    },
  })

  if (!verification.verified) {
    throw new Error('Authentication verification failed')
  }

  // Update counter
  updatePasskeyCounter(storedCred.credentialId, verification.authenticationInfo.newCounter)

  const user = getAdminAccountById(storedCred.adminId)
  if (!user || user.status !== 'active') {
    throw new Error('User account not found')
  }

  return { verified: true, adminId: storedCred.adminId }
}
