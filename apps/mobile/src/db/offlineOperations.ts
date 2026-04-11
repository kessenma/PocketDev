import type { DB } from '@op-engineering/op-sqlite'
import type { FileSearchResult } from '@pocketdev/shared/types'
import { inferLanguage, pathToName } from '../components/files/model'
import type { FileNode } from '../components/files/model'

const BATCH_SIZE = 200

export interface OfflineSnapshotRow {
  id: string
  projectId: string
  branch: string
  rootPath: string
  downloadedAt: string
  fileCount: number
  totalBytes: number
}

export interface OfflineFileInsert {
  path: string
  kind: 'file' | 'directory'
  language?: string
  content?: string | null
  sizeBytes?: number | null
}

// ─── Snapshot management ─────────────────────────────────────────────────────

export async function upsertOfflineSnapshot(
  db: DB,
  projectId: string,
  branch: string,
  rootPath: string,
): Promise<string> {
  // Delete existing snapshot first so CASCADE removes offline_files + FTS entries
  await db.execute(
    'DELETE FROM offline_snapshots WHERE project_id = ? AND branch = ?',
    [projectId, branch],
  )

  const id = generateUUID()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO offline_snapshots (id, project_id, branch, root_path, downloaded_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, projectId, branch, rootPath, now],
  )
  return id
}

export async function getOfflineSnapshot(
  db: DB,
  projectId: string,
  branch: string,
): Promise<OfflineSnapshotRow | null> {
  const result = await db.execute(
    'SELECT id, project_id, branch, root_path, downloaded_at, file_count, total_bytes FROM offline_snapshots WHERE project_id = ? AND branch = ?',
    [projectId, branch],
  )
  const row = result.rows?.[0]
  if (!row) return null
  return rowToSnapshot(row)
}

export async function deleteOfflineSnapshot(
  db: DB,
  projectId: string,
  branch: string,
): Promise<void> {
  await db.execute(
    'DELETE FROM offline_snapshots WHERE project_id = ? AND branch = ?',
    [projectId, branch],
  )
}

export async function listOfflineSnapshots(db: DB): Promise<OfflineSnapshotRow[]> {
  const result = await db.execute(
    'SELECT id, project_id, branch, root_path, downloaded_at, file_count, total_bytes FROM offline_snapshots ORDER BY downloaded_at DESC',
  )
  const rows: OfflineSnapshotRow[] = []
  const count = result.rows?.length ?? 0
  for (let i = 0; i < count; i++) {
    const row = result.rows?.[i]
    if (row) rows.push(rowToSnapshot(row))
  }
  return rows
}

// ─── File storage ─────────────────────────────────────────────────────────────

export async function insertOfflineFiles(
  db: DB,
  snapshotId: string,
  files: OfflineFileInsert[],
): Promise<void> {
  if (files.length === 0) return

  for (let start = 0; start < files.length; start += BATCH_SIZE) {
    const batch = files.slice(start, start + BATCH_SIZE)
    await db.execute('BEGIN TRANSACTION')
    try {
      for (const file of batch) {
        await db.execute(
          `INSERT OR IGNORE INTO offline_files (snapshot_id, path, kind, language, size_bytes, content)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            snapshotId,
            file.path,
            file.kind,
            file.language ?? null,
            file.sizeBytes ?? null,
            file.content ?? null,
          ],
        )
      }
      await db.execute('COMMIT')
    } catch (e) {
      await db.execute('ROLLBACK')
      throw e
    }
  }
}

// ─── Directory read ───────────────────────────────────────────────────────────

export async function getOfflineDirectory(
  db: DB,
  snapshotId: string,
  path: string,
): Promise<FileNode[]> {
  let query: string
  let params: string[]

  if (path === '.') {
    // Root: entries whose path has no '/'
    query = `SELECT path, kind, language FROM offline_files
             WHERE snapshot_id = ? AND path NOT LIKE '%/%'
             ORDER BY
               CASE kind WHEN 'directory' THEN 0 ELSE 1 END,
               path ASC`
    params = [snapshotId]
  } else {
    // Subdirectory: direct children only (one level deep)
    query = `SELECT path, kind, language FROM offline_files
             WHERE snapshot_id = ?
               AND path LIKE ? || '/%'
               AND path NOT LIKE ? || '/%/%'
             ORDER BY
               CASE kind WHEN 'directory' THEN 0 ELSE 1 END,
               path ASC`
    params = [snapshotId, path, path]
  }

  const result = await db.execute(query, params)
  const nodes: FileNode[] = []
  const count = result.rows?.length ?? 0
  for (let i = 0; i < count; i++) {
    const row = result.rows?.[i]
    if (!row) continue
    const rowPath = String(row.path)
    const name = pathToName(rowPath)
    nodes.push({
      id: rowPath,
      name,
      path: rowPath,
      kind: row.kind === 'directory' ? 'directory' : 'file',
      language: row.language ? row.language as FileNode['language'] : inferLanguage(name),
    })
  }
  return nodes
}

export async function getOfflineFileContent(
  db: DB,
  snapshotId: string,
  path: string,
): Promise<string | null> {
  const result = await db.execute(
    'SELECT content FROM offline_files WHERE snapshot_id = ? AND path = ?',
    [snapshotId, path],
  )
  const row = result.rows?.[0]
  if (!row) return null
  return row.content != null ? String(row.content) : null
}

// ─── Full-text search ─────────────────────────────────────────────────────────

export async function searchOfflineFiles(
  db: DB,
  snapshotId: string,
  query: string,
  limit = 50,
): Promise<FileSearchResult[]> {
  const result = await db.execute(
    `SELECT f.path, snippet(offline_files_fts, 1, '', '', '...', 32) AS text, 0 AS line_number
     FROM offline_files_fts fts
     JOIN offline_files f ON f.id = fts.rowid
     WHERE fts.content MATCH ?
       AND f.snapshot_id = ?
     ORDER BY rank
     LIMIT ?`,
    [query, snapshotId, limit],
  )

  const results: FileSearchResult[] = []
  const count = result.rows?.length ?? 0
  for (let i = 0; i < count; i++) {
    const row = result.rows?.[i]
    if (!row) continue
    results.push({
      path: String(row.path),
      line_number: 0,
      text: row.text ? String(row.text) : '',
    })
  }
  return results
}

// ─── Stats update ─────────────────────────────────────────────────────────────

export async function updateSnapshotStats(db: DB, snapshotId: string): Promise<void> {
  await db.execute(
    `UPDATE offline_snapshots SET
       file_count = (SELECT COUNT(*) FROM offline_files WHERE snapshot_id = ? AND kind = 'file'),
       total_bytes = (SELECT COALESCE(SUM(size_bytes), 0) FROM offline_files WHERE snapshot_id = ?)
     WHERE id = ?`,
    [snapshotId, snapshotId, snapshotId],
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToSnapshot(row: Record<string, unknown>): OfflineSnapshotRow {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    branch: String(row.branch),
    rootPath: String(row.root_path),
    downloadedAt: String(row.downloaded_at),
    fileCount: Number(row.file_count ?? 0),
    totalBytes: Number(row.total_bytes ?? 0),
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
