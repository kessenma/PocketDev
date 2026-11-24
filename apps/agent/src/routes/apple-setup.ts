import { Elysia } from 'elysia'
import type { AppleCreateKeyRequest, AppleImportKeyRequest } from '@pocketdev/shared/types'
import { authenticateRequest } from '../services/auth/auth.ts'
import {
  buildCreateKeyCommand,
  buildXcodesInstallCommand,
  finishCreatedKey,
  getAppleSetupStatus,
  importKey,
  setAscTelemetry,
  verifyAppleSetup,
} from '../services/cli-setup/apple-setup.ts'
import { invalidatePrerequisitesCache } from '../services/cli-setup/prerequisites.ts'

async function authorized(request: Request, set: { status?: number | string }) {
  const deviceId = await authenticateRequest(request.headers.get('authorization'))
  if (!deviceId) { set.status = 401; return false }
  return true
}

/** Apple / App Store Connect setup (Xcode + asc CLI). macOS hosts only; Linux reports supported: false. */
export const appleSetupRoutes = new Elysia({ prefix: '/apple-setup' })
  .get('/status', async ({ request, set, query }) => {
    if (!(await authorized(request, set))) return { error: 'Unauthorized' }
    return getAppleSetupStatus({ validate: query.validate === '1' })
  })

  .post('/xcodes-command', async ({ request, set, body }) => {
    if (!(await authorized(request, set))) return { error: 'Unauthorized' }
    const appleId = typeof (body as { apple_id?: unknown })?.apple_id === 'string' ? (body as { apple_id: string }).apple_id.trim() : null
    return { command: buildXcodesInstallCommand(appleId) }
  })

  .post('/telemetry', async ({ request, set, body }) => {
    if (!(await authorized(request, set))) return { error: 'Unauthorized' }
    return setAscTelemetry((body as { enabled?: unknown })?.enabled === true)
  })

  .post('/create-key-command', async ({ request, set, body }) => {
    if (!(await authorized(request, set))) return { error: 'Unauthorized' }
    const result = await buildCreateKeyCommand((body ?? {}) as AppleCreateKeyRequest)
    if ('error' in result) set.status = 400
    return result
  })

  .post('/finish-key', async ({ request, set }) => {
    if (!(await authorized(request, set))) return { error: 'Unauthorized' }
    const result = await finishCreatedKey()
    invalidatePrerequisitesCache()
    return result
  })

  .post('/import-key', async ({ request, set, body }) => {
    if (!(await authorized(request, set))) return { error: 'Unauthorized' }
    const result = await importKey((body ?? {}) as AppleImportKeyRequest)
    if (!result.ok) set.status = 400
    invalidatePrerequisitesCache()
    return result
  })

  .post('/verify', async ({ request, set }) => {
    if (!(await authorized(request, set))) return { error: 'Unauthorized' }
    invalidatePrerequisitesCache()
    return verifyAppleSetup()
  })
