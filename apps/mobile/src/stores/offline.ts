import { create } from 'zustand'
import type { DB } from '@op-engineering/op-sqlite'
import { listDirectory, fetchFileContent } from '../services/api'
import { inferLanguage } from '../components/files/model'
import {
  upsertOfflineSnapshot,
  deleteOfflineSnapshot,
  listOfflineSnapshots,
  insertOfflineFiles,
  updateSnapshotStats,
  type OfflineFileInsert,
  type OfflineSnapshotRow,
} from '../db/offlineOperations'
import { subscribeToGitEvents } from '../services/gitEventBus'

// Binary extensions that aren't worth fetching/storing as text
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'pdf', 'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar',
  'mp4', 'mp3', 'wav', 'ogg', 'webm', 'mov', 'avi',
  'exe', 'dll', 'so', 'dylib', 'bin', 'o', 'a',
  'pyc', 'class', 'jar',
])

function isBinaryPath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase()
  return ext ? BINARY_EXTENSIONS.has(ext) : false
}

export interface OfflineSnapshot {
  id: string
  projectId: string
  branch: string
  fileCount: number
  totalBytes: number
  downloadedAt: string
}

type SnapshotMap = Record<string, OfflineSnapshot>

interface OfflineState {
  _db: DB | null
  snapshots: SnapshotMap
  downloadingKey: string | null
  downloadProgress: { fetched: number; total: number } | null
  downloadError: string | null

  setDb: (db: DB | null) => void
  loadAllSnapshots: () => Promise<void>
  isOfflineAvailable: (projectId: string, branch: string) => boolean
  getSnapshot: (projectId: string, branch: string) => OfflineSnapshot | null
  startDownload: (projectId: string, branch: string, serverIp: string, serverPort: number, rootPath: string) => Promise<void>
  cancelDownload: () => void
  clearOfflineData: (projectId: string, branch: string) => Promise<void>
}

// Module-level cancel flag — checked between network calls in startDownload
let _cancelRequested = false

export function setOfflineStoreDb(db: DB | null): void {
  useOfflineStore.getState().setDb(db)
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  _db: null,
  snapshots: {},
  downloadingKey: null,
  downloadProgress: null,
  downloadError: null,

  setDb: (db) => {
    set({ _db: db })
    if (db) {
      // Subscribe to branch switches to keep UI in sync
      subscribeToGitEvents((event) => {
        if (event.type === 'branch_switched') {
          // Don't delete anything — just let the files store re-evaluate
          // whether offline data exists for the new branch
        }
      })
    }
  },

  loadAllSnapshots: async () => {
    const db = get()._db
    if (!db) return
    try {
      const rows = await listOfflineSnapshots(db)
      const map: SnapshotMap = {}
      for (const row of rows) {
        const key = snapshotKey(row.projectId, row.branch)
        map[key] = rowToSnapshot(row)
      }
      set({ snapshots: map })
    } catch (error) {
      console.error('[offline] Failed to load snapshots:', error)
    }
  },

  isOfflineAvailable: (projectId, branch) =>
    snapshotKey(projectId, branch) in get().snapshots,

  getSnapshot: (projectId, branch) =>
    get().snapshots[snapshotKey(projectId, branch)] ?? null,

  startDownload: async (projectId, branch, serverIp, serverPort, rootPath) => {
    const db = get()._db
    if (!db) {
      set({ downloadError: 'Offline database not ready.' })
      return
    }
    if (get().downloadingKey !== null) return

    const key = snapshotKey(projectId, branch)
    _cancelRequested = false
    set({ downloadingKey: key, downloadProgress: { fetched: 0, total: 0 }, downloadError: null })

    let snapshotId: string
    try {
      snapshotId = await upsertOfflineSnapshot(db, projectId, branch, rootPath)
    } catch (error) {
      set({ downloadingKey: null, downloadProgress: null, downloadError: String(error) })
      return
    }

    try {
      await runDownload(db, snapshotId, serverIp, serverPort, set, get)

      await updateSnapshotStats(db, snapshotId)
      await get().loadAllSnapshots()

      // Notify agent (fire-and-forget)
      const snap = await import('../db/offlineOperations').then((m) =>
        m.getOfflineSnapshot(db, projectId, branch),
      )
      if (snap) {
        void reportSnapshotToAgent(projectId, branch, snap.fileCount, snap.totalBytes, snap.downloadedAt)
      }

      set({ downloadingKey: null, downloadProgress: null })
    } catch (error) {
      if (_cancelRequested) {
        // Cancelled — clean up the partial snapshot
        try { await deleteOfflineSnapshot(db, projectId, branch) } catch { /* ignore */ }
        set({ downloadingKey: null, downloadProgress: null })
      } else {
        // Real error — clean up and report
        try { await deleteOfflineSnapshot(db, projectId, branch) } catch { /* ignore */ }
        await get().loadAllSnapshots()
        set({ downloadingKey: null, downloadProgress: null, downloadError: String(error) })
      }
    }
  },

  cancelDownload: () => {
    _cancelRequested = true
  },

  clearOfflineData: async (projectId, branch) => {
    const db = get()._db
    if (!db) return
    try {
      await deleteOfflineSnapshot(db, projectId, branch)
      const key = snapshotKey(projectId, branch)
      set((state) => {
        const next = { ...state.snapshots }
        delete next[key]
        return { snapshots: next }
      })
      void deleteSnapshotFromAgent(projectId, branch)
    } catch (error) {
      console.error('[offline] Failed to clear offline data:', error)
    }
  },
}))

// ─── Download engine ──────────────────────────────────────────────────────────

async function runDownload(
  db: DB,
  snapshotId: string,
  serverIp: string,
  serverPort: number,
  set: (partial: Partial<OfflineState> | ((state: OfflineState) => Partial<OfflineState>)) => void,
  get: () => OfflineState,
): Promise<void> {
  const dirQueue: string[] = ['.']
  let fetched = 0
  let total = 0

  while (dirQueue.length > 0) {
    if (_cancelRequested) return

    const currentDir = dirQueue.shift()!
    const listing = await listDirectory(serverIp, serverPort, currentDir)
    const entries = listing.entries ?? []

    const filePaths: string[] = []
    const dirPaths: string[] = []
    const batch: OfflineFileInsert[] = []

    for (const entry of entries) {
      if (entry.type === 'dir') {
        dirPaths.push(entry.path)
        batch.push({ path: entry.path, kind: 'directory' })
      } else {
        filePaths.push(entry.path)
      }
    }

    // Enqueue subdirectories
    dirQueue.push(...dirPaths)
    total += filePaths.length
    set({ downloadProgress: { fetched, total } })

    // Fetch file contents with concurrency-5 pool
    const fileResults = await fetchFilesInPool(serverIp, serverPort, filePaths, 5)
    for (const fr of fileResults) {
      batch.push(fr)
    }

    if (batch.length > 0) {
      if (_cancelRequested) return
      await insertOfflineFiles(db, snapshotId, batch)
    }

    fetched += filePaths.length
    set({ downloadProgress: { fetched, total } })
  }
}

async function fetchFilesInPool(
  serverIp: string,
  serverPort: number,
  paths: string[],
  concurrency: number,
): Promise<OfflineFileInsert[]> {
  const results: OfflineFileInsert[] = []
  let index = 0

  async function worker() {
    while (index < paths.length) {
      if (_cancelRequested) return
      const path = paths[index++]!
      const name = path.split('/').pop() ?? path

      if (isBinaryPath(path)) {
        results.push({ path, kind: 'file', language: 'unknown', content: null })
        continue
      }

      try {
        const file = await fetchFileContent(serverIp, serverPort, path)
        results.push({
          path,
          kind: 'file',
          language: inferLanguage(name),
          content: file.content,
          sizeBytes: file.size,
        })
      } catch {
        // On error, store the entry without content (falls back to server on open)
        results.push({ path, kind: 'file', language: inferLanguage(name), content: null })
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, paths.length) }, worker)
  await Promise.all(workers)
  return results
}

// ─── Agent reporting (fire-and-forget) ───────────────────────────────────────

async function reportSnapshotToAgent(
  projectId: string,
  branch: string,
  fileCount: number,
  totalBytes: number,
  downloadedAt: string,
): Promise<void> {
  try {
    const { useConnectionStore } = await import('./connection')
    const server = useConnectionStore.getState().server
    if (!server) return
    const { buildPocketDevAuthorizationHeader } = await import('../services/auth')
    const header = await buildPocketDevAuthorizationHeader()
    await fetch(`http://${server.ip}:${server.port}/PocketDev/api/console/offline-snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: header },
      body: JSON.stringify({ projectId, branch, fileCount, totalBytes, downloadedAt }),
    })
  } catch {
    // Non-fatal
  }
}

async function deleteSnapshotFromAgent(projectId: string, branch: string): Promise<void> {
  try {
    const { useConnectionStore } = await import('./connection')
    const server = useConnectionStore.getState().server
    if (!server) return
    const { buildPocketDevAuthorizationHeader } = await import('../services/auth')
    const header = await buildPocketDevAuthorizationHeader()
    const encodedBranch = encodeURIComponent(branch)
    await fetch(
      `http://${server.ip}:${server.port}/PocketDev/api/console/offline-snapshots/${encodeURIComponent(projectId)}/${encodedBranch}`,
      { method: 'DELETE', headers: { Authorization: header } },
    )
  } catch {
    // Non-fatal
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snapshotKey(projectId: string, branch: string): string {
  return `${projectId}:${branch}`
}

function rowToSnapshot(row: OfflineSnapshotRow): OfflineSnapshot {
  return {
    id: row.id,
    projectId: row.projectId,
    branch: row.branch,
    fileCount: row.fileCount,
    totalBytes: row.totalBytes,
    downloadedAt: row.downloadedAt,
  }
}
