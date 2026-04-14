// db/vectorOperations.ts
// Vec0 / fallback embedding storage for file embeddings.
// Adapted from rag-mobile/utils/vectorDatabase.ts, simplified for
// single-dimension (384d) file embeddings in the main pocketdev.db.

import type { DB } from '@op-engineering/op-sqlite'
import { EMBEDDING_DIM } from '../services/embedding'

let hasVec0 = false

/**
 * Probe for vec0 extension and create virtual table if available.
 * Call once during DatabaseProvider init, after tables are created.
 */
export async function initVectorSupport(db: DB): Promise<boolean> {
  try {
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS _vec_probe USING vec0(
        embedding float[2]
      );
    `)
    await db.execute('DROP TABLE IF EXISTS _vec_probe;')
    hasVec0 = true
    console.log('[vectors] vec0 extension available')

    // Create the vec0 virtual table for file embeddings
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_file_${EMBEDDING_DIM} USING vec0(
        embedding float[${EMBEDDING_DIM}]
      );
    `)
    console.log(`[vectors] vec_file_${EMBEDDING_DIM} virtual table ready`)
  } catch {
    hasVec0 = false
    console.log('[vectors] vec0 not available — using BLOB fallback')
  }
  return hasVec0
}

export function isVec0Available(): boolean {
  return hasVec0
}

// ─── Blob conversion ───────────────────────────────────

function vectorToBlob(embedding: number[]): string {
  const float32 = new Float32Array(embedding)
  const buffer = new Uint8Array(float32.buffer)
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function blobToVector(blob: string | ArrayBuffer | Uint8Array | null | undefined): number[] {
  if (!blob) return []

  if (blob instanceof ArrayBuffer) {
    return Array.from(new Float32Array(blob))
  }

  if (blob instanceof Uint8Array) {
    return Array.from(new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4))
  }

  if (typeof blob === 'string') {
    const hex = blob.startsWith('0x') ? blob.slice(2) : blob
    const buffer = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      buffer[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return Array.from(new Float32Array(buffer.buffer))
  }

  return []
}

// ─── Insert ────────────────────────────────────────────

/**
 * Upsert a file embedding into SQLite.
 * Writes to file_embeddings (regular table) always.
 * If vec0 is available, also writes to the virtual table.
 */
export async function insertFileEmbedding(
  db: DB,
  projectId: string,
  path: string,
  enrichedText: string,
  embedding: number[],
  builtAt: number,
  contentPreview?: string,
): Promise<void> {
  const blobHex = vectorToBlob(embedding)

  // Upsert into regular table
  await db.execute(
    `INSERT OR REPLACE INTO file_embeddings (project_id, path, enriched_text, embedding, built_at, content_preview)
     VALUES (?, ?, ?, x'${blobHex}', ?, ?)`,
    [projectId, path, enrichedText, builtAt, contentPreview ?? ''],
  )

  // If vec0 available, also insert into virtual table
  if (hasVec0) {
    // Get the rowid of the just-inserted regular row
    const result = await db.execute(
      'SELECT id FROM file_embeddings WHERE project_id = ? AND path = ?',
      [projectId, path],
    )
    if (result.rows && result.rows.length > 0) {
      const rowId = (result.rows[0] as { id: number }).id
      // vec0 uses rowid-based insertion
      try {
        await db.execute(
          `INSERT OR REPLACE INTO vec_file_${EMBEDDING_DIM} (rowid, embedding)
           VALUES (?, x'${blobHex}')`,
          [rowId],
        )
      } catch {
        // Non-fatal — fallback search still works
      }
    }
  }
}

/**
 * Batch insert file embeddings in a transaction.
 */
export async function insertFileEmbeddingsBatch(
  db: DB,
  projectId: string,
  items: Array<{ path: string; enrichedText: string; embedding: number[]; contentPreview?: string }>,
  builtAt: number,
): Promise<void> {
  await db.execute('BEGIN TRANSACTION')
  try {
    for (const item of items) {
      await insertFileEmbedding(db, projectId, item.path, item.enrichedText, item.embedding, builtAt, item.contentPreview)
    }
    await db.execute('COMMIT')
  } catch (e) {
    await db.execute('ROLLBACK')
    throw e
  }
}

// ─── Search ────────────────────────────────────────────

export interface EmbeddingSearchResult {
  path: string
  enrichedText: string
  distance: number
}

/**
 * Search for similar file embeddings by vector similarity.
 */
export async function searchFileEmbeddings(
  db: DB,
  projectId: string,
  queryVector: number[],
  limit = 10,
): Promise<EmbeddingSearchResult[]> {
  if (hasVec0) {
    return searchVec0(db, projectId, queryVector, limit)
  }
  return searchFallback(db, projectId, queryVector, limit)
}

async function searchVec0(
  db: DB,
  projectId: string,
  queryVector: number[],
  limit: number,
): Promise<EmbeddingSearchResult[]> {
  const blobHex = vectorToBlob(queryVector)

  const result = await db.execute(
    `SELECT
       fe.path,
       fe.enriched_text,
       distance(v.embedding, x'${blobHex}') AS distance
     FROM vec_file_${EMBEDDING_DIM} v
     INNER JOIN file_embeddings fe ON v.rowid = fe.id
     WHERE fe.project_id = ?
     ORDER BY distance ASC
     LIMIT ?`,
    [projectId, limit],
  )

  if (!result.rows) return []
  return (result.rows as Array<{ path: string; enriched_text: string; distance: number }>).map((r) => ({
    path: r.path,
    enrichedText: r.enriched_text,
    distance: r.distance,
  }))
}

async function searchFallback(
  db: DB,
  projectId: string,
  queryVector: number[],
  limit: number,
): Promise<EmbeddingSearchResult[]> {
  const result = await db.execute(
    'SELECT path, enriched_text, embedding FROM file_embeddings WHERE project_id = ?',
    [projectId],
  )

  if (!result.rows) return []

  const results: EmbeddingSearchResult[] = []
  for (const row of result.rows as Array<{ path: string; enriched_text: string; embedding: ArrayBuffer | string }>) {
    const vec = blobToVector(row.embedding)
    if (vec.length === 0) continue
    const similarity = cosineSimilarity(queryVector, vec)
    results.push({
      path: row.path,
      enrichedText: row.enriched_text,
      distance: 1 - similarity,
    })
  }

  results.sort((a, b) => a.distance - b.distance)
  return results.slice(0, limit)
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

// ─── Load / query ──────────────────────────────────────

export interface StoredFileEmbedding {
  path: string
  enrichedText: string
  embedding: number[]
  builtAt: number
  contentPreview: string
}

/**
 * Load all embeddings for a project (for reconstructing FileIndex in memory).
 */
export async function loadProjectEmbeddings(
  db: DB,
  projectId: string,
): Promise<StoredFileEmbedding[]> {
  const result = await db.execute(
    'SELECT path, enriched_text, embedding, built_at, content_preview FROM file_embeddings WHERE project_id = ? ORDER BY path',
    [projectId],
  )

  if (!result.rows) return []

  return (result.rows as Array<{
    path: string
    enriched_text: string
    embedding: ArrayBuffer | string
    built_at: number
    content_preview: string | null
  }>).map((r) => ({
    path: r.path,
    enrichedText: r.enriched_text,
    embedding: blobToVector(r.embedding),
    builtAt: r.built_at,
    contentPreview: r.content_preview ?? '',
  }))
}

/**
 * Count embeddings for a project.
 */
export async function getEmbeddingCount(db: DB, projectId: string): Promise<number> {
  const result = await db.execute(
    'SELECT COUNT(*) as cnt FROM file_embeddings WHERE project_id = ?',
    [projectId],
  )
  return (result.rows?.[0] as { cnt: number } | undefined)?.cnt ?? 0
}

// ─── Cleanup ───────────────────────────────────────────

/**
 * Delete all embeddings for a project (e.g., on re-index or project switch).
 */
export async function deleteProjectEmbeddings(db: DB, projectId: string): Promise<void> {
  if (hasVec0) {
    // Delete from vec0 table first (needs the rowids)
    const rows = await db.execute(
      'SELECT id FROM file_embeddings WHERE project_id = ?',
      [projectId],
    )
    if (rows.rows && rows.rows.length > 0) {
      const ids = (rows.rows as Array<{ id: number }>).map((r) => r.id)
      for (const id of ids) {
        try {
          await db.execute(`DELETE FROM vec_file_${EMBEDDING_DIM} WHERE rowid = ?`, [id])
        } catch { /* vec0 row may not exist */ }
      }
    }
  }

  await db.execute('DELETE FROM file_embeddings WHERE project_id = ?', [projectId])
}
