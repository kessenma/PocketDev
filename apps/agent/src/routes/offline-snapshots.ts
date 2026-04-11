import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import { getSessionUser } from '../services/console-auth.ts'
import {
  upsertDeviceOfflineSnapshot,
  deleteDeviceOfflineSnapshot,
  getDeviceOfflineSnapshots,
} from '../db/index.ts'

export const offlineSnapshotRoutes = new Elysia({ prefix: '/offline-snapshots' })
  // GET — console: list all offline snapshots across all devices (session auth)
  .get('', ({ request, set }) => {
    const user = getSessionUser(request.headers.get('cookie'))
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    return { snapshots: getDeviceOfflineSnapshots() }
  })

  // POST — mobile: upsert snapshot record for the requesting device
  .post('', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    upsertDeviceOfflineSnapshot(
      deviceId,
      body.projectId,
      body.branch,
      body.fileCount,
      body.totalBytes,
      body.downloadedAt,
    )
    return { ok: true }
  }, {
    body: t.Object({
      projectId: t.String(),
      branch: t.String(),
      fileCount: t.Number(),
      totalBytes: t.Number(),
      downloadedAt: t.String(),
    }),
  })

  // DELETE — mobile: remove snapshot record for the requesting device
  .delete('/:projectId/:branch', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    deleteDeviceOfflineSnapshot(deviceId, params.projectId, decodeURIComponent(params.branch))
    return { ok: true }
  })
