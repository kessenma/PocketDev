import { Elysia, t } from 'elysia'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { authenticateRequest } from '../services/auth/auth.ts'

const DATA_DIR = process.env.POCKETDEV_DATA_DIR ?? join(process.cwd(), 'data')
const ATTACHMENTS_DIR = join(DATA_DIR, 'attachments')
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

function sanitizeFilename(name: string): string {
  // Strip directory components, replace unsafe chars with underscores
  const base = basename(name)
  return base.replace(/[^a-zA-Z0-9._\-() ]/g, '_').slice(0, 200) || 'attachment'
}

/** Ensure the destination filename is unique within the folder */
async function uniqueFilename(dir: string, name: string): Promise<string> {
  const dot = name.lastIndexOf('.')
  const stem = dot >= 0 ? name.slice(0, dot) : name
  const ext = dot >= 0 ? name.slice(dot) : ''
  let candidate = name
  let n = 1
  while (true) {
    try {
      await stat(join(dir, candidate))
      candidate = `${stem}_${n}${ext}`
      n++
    } catch {
      return candidate
    }
  }
}

export const attachmentRoutes = new Elysia({ prefix: '/attachments' })
  .post('/upload', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const file = body.file
    if (file.size > MAX_FILE_SIZE) {
      set.status = 413
      return { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` }
    }

    await mkdir(ATTACHMENTS_DIR, { recursive: true })
    const safe = sanitizeFilename(file.name)
    const filename = await uniqueFilename(ATTACHMENTS_DIR, safe)
    const dest = join(ATTACHMENTS_DIR, filename)
    await Bun.write(dest, await file.arrayBuffer())

    return {
      filename,
      originalName: file.name,
      size: file.size,
      folder: ATTACHMENTS_DIR,
    }
  }, {
    body: t.Object({ file: t.File() }),
  })

  .get('/list', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    try {
      await mkdir(ATTACHMENTS_DIR, { recursive: true })
      const entries = await readdir(ATTACHMENTS_DIR, { withFileTypes: true })
      const files = await Promise.all(
        entries
          .filter((e) => e.isFile())
          .map(async (e) => {
            const info = await stat(join(ATTACHMENTS_DIR, e.name))
            return {
              filename: e.name,
              size: info.size,
              uploadedAt: info.birthtime.toISOString(),
            }
          }),
      )
      files.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      return { attachments: files, folder: ATTACHMENTS_DIR }
    } catch {
      return { attachments: [], folder: ATTACHMENTS_DIR }
    }
  })

  .delete('/file', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const safe = sanitizeFilename(query.filename)
    const target = resolve(join(ATTACHMENTS_DIR, safe))
    if (!target.startsWith(resolve(ATTACHMENTS_DIR))) {
      set.status = 403
      return { error: 'Path outside attachments directory' }
    }

    try {
      await rm(target)
      return { deleted: safe }
    } catch {
      set.status = 404
      return { error: 'File not found' }
    }
  }, {
    query: t.Object({ filename: t.String() }),
  })

  .delete('/wipe', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    try {
      await rm(ATTACHMENTS_DIR, { recursive: true, force: true })
      await mkdir(ATTACHMENTS_DIR, { recursive: true })
      return { wiped: true }
    } catch (e) {
      set.status = 500
      return { error: 'Failed to wipe attachments' }
    }
  })
