// db/gitHistoryOperations.ts
// Pure CRUD functions for cached git commit history.
// Follows the same pattern as taskOperations.ts.

import type { DB } from '@op-engineering/op-sqlite'
import type { GitDetailedCommitEntry, GitCommitFileEntry } from '@pocketdev/shared/types'

// ─── Upsert commits from agent API ────────────────────

export async function upsertGitCommits(
  db: DB,
  commits: GitDetailedCommitEntry[],
): Promise<void> {
  if (commits.length === 0) return

  await db.execute('BEGIN TRANSACTION')
  try {
    for (const c of commits) {
      // We need a stable ID — agent uses "projectId:sha" but we may not know projectId.
      // Use fullSha as a unique key for dedup, id = projectId:sha if available, else sha.
      const id = c.fullSha

      await db.execute(
        `INSERT OR REPLACE INTO git_commits
         (id, project_id, sha, short_sha, message, author_name, author_email,
          committed_at, branch, additions, deletions, files_changed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          '', // project_id — populated by caller if known
          c.fullSha,
          c.sha,
          c.message,
          c.author,
          c.authorEmail ?? null,
          c.committedAt,
          c.branch ?? null,
          c.files.reduce((sum, f) => sum + f.additions, 0),
          c.files.reduce((sum, f) => sum + f.deletions, 0),
          c.filesChanged,
        ],
      )

      // Delete existing file entries for this commit (re-insert pattern)
      await db.execute('DELETE FROM git_commit_files WHERE commit_id = ?', [id])

      for (const f of c.files) {
        await db.execute(
          `INSERT INTO git_commit_files (commit_id, path, old_path, kind, additions, deletions)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, f.path, f.oldPath ?? null, f.kind, f.additions, f.deletions],
        )
      }
    }
    await db.execute('COMMIT')
  } catch (e) {
    await db.execute('ROLLBACK')
    throw e
  }
}

/**
 * Upsert with project_id awareness.
 */
export async function upsertGitCommitsForProject(
  db: DB,
  projectId: string,
  commits: GitDetailedCommitEntry[],
): Promise<void> {
  if (commits.length === 0) return

  await db.execute('BEGIN TRANSACTION')
  try {
    for (const c of commits) {
      const id = `${projectId}:${c.fullSha}`

      await db.execute(
        `INSERT OR REPLACE INTO git_commits
         (id, project_id, sha, short_sha, message, author_name, author_email,
          committed_at, branch, additions, deletions, files_changed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          projectId,
          c.fullSha,
          c.sha,
          c.message,
          c.author,
          c.authorEmail ?? null,
          c.committedAt,
          c.branch ?? null,
          c.files.reduce((sum, f) => sum + f.additions, 0),
          c.files.reduce((sum, f) => sum + f.deletions, 0),
          c.filesChanged,
        ],
      )

      await db.execute('DELETE FROM git_commit_files WHERE commit_id = ?', [id])

      for (const f of c.files) {
        await db.execute(
          `INSERT INTO git_commit_files (commit_id, path, old_path, kind, additions, deletions)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, f.path, f.oldPath ?? null, f.kind, f.additions, f.deletions],
        )
      }
    }
    await db.execute('COMMIT')
  } catch (e) {
    await db.execute('ROLLBACK')
    throw e
  }
}

// ─── Read cached commits ──────────────────────────────

export async function getCachedGitCommits(
  db: DB,
  projectId: string,
  limit = 50,
  offset = 0,
): Promise<GitDetailedCommitEntry[]> {
  const result = await db.execute(
    `SELECT * FROM git_commits
     WHERE project_id = ?
     ORDER BY committed_at DESC
     LIMIT ? OFFSET ?`,
    [projectId, limit, offset],
  )

  if (!result.rows || result.rows.length === 0) return []

  const commits: GitDetailedCommitEntry[] = []
  for (const row of result.rows as Array<Record<string, unknown>>) {
    const id = row.id as string
    const filesResult = await db.execute(
      'SELECT * FROM git_commit_files WHERE commit_id = ?',
      [id],
    )

    const files: GitCommitFileEntry[] = ((filesResult.rows ?? []) as Array<Record<string, unknown>>).map((f) => ({
      path: f.path as string,
      oldPath: (f.old_path as string) || undefined,
      kind: f.kind as GitCommitFileEntry['kind'],
      additions: (f.additions as number) ?? 0,
      deletions: (f.deletions as number) ?? 0,
    }))

    commits.push({
      sha: row.short_sha as string,
      fullSha: row.sha as string,
      message: row.message as string,
      author: row.author_name as string,
      authorEmail: (row.author_email as string) || undefined,
      committedAt: row.committed_at as string,
      branch: (row.branch as string) || undefined,
      relativeTime: '',
      filesChanged: (row.files_changed as number) ?? 0,
      files,
    })
  }

  return commits
}

// ─── File history ─────────────────────────────────────

export async function getFileHistory(
  db: DB,
  projectId: string,
  filePath: string,
  limit = 20,
): Promise<GitDetailedCommitEntry[]> {
  const result = await db.execute(
    `SELECT DISTINCT gc.*
     FROM git_commits gc
     INNER JOIN git_commit_files gcf ON gc.id = gcf.commit_id
     WHERE gc.project_id = ? AND gcf.path = ?
     ORDER BY gc.committed_at DESC
     LIMIT ?`,
    [projectId, filePath, limit],
  )

  if (!result.rows || result.rows.length === 0) return []

  const commits: GitDetailedCommitEntry[] = []
  for (const row of result.rows as Array<Record<string, unknown>>) {
    const id = row.id as string
    const filesResult = await db.execute(
      'SELECT * FROM git_commit_files WHERE commit_id = ?',
      [id],
    )

    const files: GitCommitFileEntry[] = ((filesResult.rows ?? []) as Array<Record<string, unknown>>).map((f) => ({
      path: f.path as string,
      oldPath: (f.old_path as string) || undefined,
      kind: f.kind as GitCommitFileEntry['kind'],
      additions: (f.additions as number) ?? 0,
      deletions: (f.deletions as number) ?? 0,
    }))

    commits.push({
      sha: row.short_sha as string,
      fullSha: row.sha as string,
      message: row.message as string,
      author: row.author_name as string,
      authorEmail: (row.author_email as string) || undefined,
      committedAt: row.committed_at as string,
      branch: (row.branch as string) || undefined,
      relativeTime: '',
      filesChanged: (row.files_changed as number) ?? 0,
      files,
    })
  }

  return commits
}

// ─── Task-commit associations ─────────────────────────

export async function getTaskCommits(
  db: DB,
  taskId: string,
): Promise<GitDetailedCommitEntry[]> {
  const result = await db.execute(
    `SELECT gc.*
     FROM git_commits gc
     INNER JOIN task_commits tc ON gc.id = tc.commit_id
     WHERE tc.task_id = ?
     ORDER BY gc.committed_at DESC`,
    [taskId],
  )

  if (!result.rows || result.rows.length === 0) return []

  const commits: GitDetailedCommitEntry[] = []
  for (const row of result.rows as Array<Record<string, unknown>>) {
    const id = row.id as string
    const filesResult = await db.execute(
      'SELECT * FROM git_commit_files WHERE commit_id = ?',
      [id],
    )

    const files: GitCommitFileEntry[] = ((filesResult.rows ?? []) as Array<Record<string, unknown>>).map((f) => ({
      path: f.path as string,
      oldPath: (f.old_path as string) || undefined,
      kind: f.kind as GitCommitFileEntry['kind'],
      additions: (f.additions as number) ?? 0,
      deletions: (f.deletions as number) ?? 0,
    }))

    commits.push({
      sha: row.short_sha as string,
      fullSha: row.sha as string,
      message: row.message as string,
      author: row.author_name as string,
      authorEmail: (row.author_email as string) || undefined,
      committedAt: row.committed_at as string,
      branch: (row.branch as string) || undefined,
      relativeTime: '',
      filesChanged: (row.files_changed as number) ?? 0,
      files,
    })
  }

  return commits
}

export async function upsertTaskCommits(
  db: DB,
  taskId: string,
  commitIds: string[],
): Promise<void> {
  if (commitIds.length === 0) return

  await db.execute('BEGIN TRANSACTION')
  try {
    for (const commitId of commitIds) {
      await db.execute(
        'INSERT OR IGNORE INTO task_commits (task_id, commit_id) VALUES (?, ?)',
        [taskId, commitId],
      )
    }
    await db.execute('COMMIT')
  } catch (e) {
    await db.execute('ROLLBACK')
    throw e
  }
}

// ─── Sync state ───────────────────────────────────────

export async function getSyncState(db: DB, key: string): Promise<string | null> {
  const result = await db.execute(
    'SELECT value FROM sync_state WHERE key = ?',
    [key],
  )
  if (!result.rows || result.rows.length === 0) return null
  return (result.rows[0] as { value: string }).value
}

export async function setSyncState(db: DB, key: string, value: string): Promise<void> {
  await db.execute(
    `INSERT OR REPLACE INTO sync_state (key, value, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [key, value],
  )
}

// ─── Cleanup ──────────────────────────────────────────

export async function pruneOldCommits(
  db: DB,
  projectId: string,
  keepCount = 200,
): Promise<void> {
  await db.execute(
    `DELETE FROM git_commits
     WHERE project_id = ?
     AND id NOT IN (
       SELECT id FROM git_commits
       WHERE project_id = ?
       ORDER BY committed_at DESC
       LIMIT ?
     )`,
    [projectId, projectId, keepCount],
  )
}
