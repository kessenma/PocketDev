import { Elysia, t, type HTTPHeaders } from 'elysia'
import {
  createRegistrationOptions,
  verifyAndStoreRegistration,
  createAuthenticationOptions,
  verifyAuthenticationCredential,
} from '../services/webauthn.ts'
import {
  getAdminAccount,
  getPasskeysByAdminId,
  softDeletePasskey,
} from '../db/index.ts'
import { validateSession, createSession, sessionCookieHeader } from '../services/console-auth.ts'

function requireConsoleSession(request: Request, set: { status?: unknown; headers?: Record<string, string> | HTTPHeaders }) {
  if (!validateSession(request.headers.get('cookie'))) {
    set.status = 401
    return null
  }
  const admin = getAdminAccount()
  return admin ?? null
}

export const passkeyRoutes = new Elysia({ prefix: '/api/console/passkey' })

  // ─── Registration (requires session) ──────────────────

  .post('/register/options', async ({ request, set }) => {
    const admin = requireConsoleSession(request, set)
    if (!admin) return { error: 'Unauthorized' }

    const { options, challengeId } = await createRegistrationOptions(
      admin.id,
      admin.email,
      request,
    )
    return { options, challengeId }
  })

  .post(
    '/register/verify',
    async ({ body, request, set }) => {
      const admin = requireConsoleSession(request, set)
      if (!admin) return { error: 'Unauthorized' }

      try {
        const result = await verifyAndStoreRegistration(
          body.challengeId,
          body.credential,
          body.deviceName ?? null,
          request,
        )
        return result
      } catch (err) {
        set.status = 400
        return { error: err instanceof Error ? err.message : 'Verification failed' }
      }
    },
    {
      body: t.Object({
        challengeId: t.String(),
        credential: t.Any(),
        deviceName: t.Optional(t.String()),
      }),
    },
  )

  // ─── Authentication (no auth required) ────────────────

  .post('/authenticate/options', async ({ request }) => {
    const { options, challengeId } = await createAuthenticationOptions(request)
    return { options, challengeId }
  })

  .post(
    '/authenticate/verify',
    async ({ body, request, set }) => {
      try {
        const { verified, adminId } = await verifyAuthenticationCredential(
          body.challengeId,
          body.credential,
          request,
        )

        if (!verified) {
          set.status = 401
          return { error: 'Authentication failed' }
        }

        const admin = getAdminAccount()
        if (!admin || admin.id !== adminId) {
          set.status = 401
          return { error: 'Admin not found' }
        }

        // Create session (same as password login)
        const token = createSession(admin.email)
        set.headers = {
          'Set-Cookie': sessionCookieHeader(token),
        }

        return { verified: true }
      } catch (err) {
        set.status = 400
        return { error: err instanceof Error ? err.message : 'Authentication failed' }
      }
    },
    {
      body: t.Object({
        challengeId: t.String(),
        credential: t.Any(),
      }),
    },
  )

  // ─── Credential management (requires session) ────────

  .get('/credentials', ({ request, set }) => {
    const admin = requireConsoleSession(request, set)
    if (!admin) return { error: 'Unauthorized' }

    const credentials = getPasskeysByAdminId(admin.id)
    return {
      credentials: credentials.map((c) => ({
        id: c.id,
        deviceName: c.deviceName,
        credentialDeviceType: c.credentialDeviceType,
        credentialBackedUp: c.credentialBackedUp === 1,
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt,
      })),
    }
  })

  .delete('/credentials/:id', ({ params, request, set }) => {
    const admin = requireConsoleSession(request, set)
    if (!admin) return { error: 'Unauthorized' }

    // Verify ownership by checking the credential belongs to this admin
    const credentials = getPasskeysByAdminId(admin.id)
    const target = credentials.find((c) => c.id === params.id)
    if (!target) {
      set.status = 404
      return { error: 'Credential not found' }
    }

    softDeletePasskey(params.id)
    return { ok: true }
  })
