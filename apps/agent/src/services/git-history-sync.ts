// services/git-history-sync.ts
// Syncs git commit history into SQLite for persistent repo history.
// Uses incremental sync via lastSyncedSha watermark on projects table.

import { getDb, getProject, schema } from '../db/index.ts'
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm'
import { getActiveProjectPath } from './projects.ts'

const DEFAULT_INITIAL_LIMIT = 100

/** Simple in-memory lock per project to prevent concurrent syncs */
const syncing = new Set<string>()

async function exec(cmd: string, cwd?: string): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bash', '-lc', cmd], {
    cwd: cwd ?? await getActiveProjectPath(),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  await proc.exited
  return { stdout: stdout.trim(), exitCode: proc.exitCode ?? 1 }
}

interface SyncResult {
  newCommits: number
  latestSha: string | null
}

/**
 * Sync git history for a project into the database.
 * If lastSyncedSha is null, seeds initial history (up to `limit` commits).
 * Otherwise, fetches only commits since the last sync.
 */
export async function syncGitHistory(
  projectId: string,
  limit = DEFAULT_INITIAL_LIMIT,
  origin: 'app' | 'task' | 'external' = 'external',
): Promise<SyncResult> {
  if (syncing.has(projectId)) {
    console.log(`[git-history] Sync already in progress for ${projectId}`)
    return { newCommits: 0, latestSha: null }
  }

  syncing.add(projectId)
  try {
    const project = getProject(projectId)
    if (!project) throw new Error(`Project not found: ${projectId}`)

    const cwd = project.absolutePath

    // Verify it's a git repo
    const { exitCode } = await exec('git rev-parse --show-toplevel', cwd)
    if (exitCode !== 0) throw new Error('Not a git repository')

    let lastSha = project.lastSyncedSha

    // Validate watermark — if it's not a valid hex SHA, treat as unsynced
    if (lastSha && !/^[0-9a-f]{7,40}$/i.test(lastSha)) {
      console.warn(`[git-history] Invalid lastSyncedSha "${lastSha}" for project ${projectId} — resetting`)
      lastSha = null
      getDb().update(schema.projects)
        .set({ lastSyncedSha: null })
        .where(eq(schema.projects.id, projectId))
        .run()
    }

    // Build git log command — oldest first (--reverse) so we insert in chronological order
    const format = '%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%aI'
    let logCmd: string
    if (lastSha) {
      logCmd = `git log ${lastSha}..HEAD --format='${format}' --reverse`
    } else {
      logCmd = `git log -n ${limit} --format='${format}' --reverse`
    }

    const { stdout: logOut } = await exec(logCmd, cwd)
    if (!logOut) {
      return { newCommits: 0, latestSha: lastSha }
    }

    const lines = logOut.split('\n').filter(Boolean)
    if (lines.length === 0) {
      return { newCommits: 0, latestSha: lastSha }
    }

    // Get current branch name
    const { stdout: branchName } = await exec('git branch --show-current', cwd)

    const db = getDb()
    let latestSha: string | null = null
    let insertedCount = 0

    // Process each commit
    for (const line of lines) {
      const parts = line.split('\x1f')
      if (parts.length < 6) continue

      const [sha, shortSha, message, authorName, authorEmail, committedAt] = parts
      const commitId = `${projectId}:${sha}`
      latestSha = sha

      // Get per-file stats: numstat gives additions/deletions
      const { stdout: numstatOut } = await exec(
        `git diff-tree --no-commit-id -r --numstat ${sha}`,
        cwd,
      )
      // Get per-file kinds: name-status gives A/M/D/R
      const { stdout: nameStatusOut } = await exec(
        `git diff-tree --no-commit-id -r --name-status ${sha}`,
        cwd,
      )

      // Parse numstat: "additions\tdeletions\tpath"
      const numstatMap = new Map<string, { additions: number; deletions: number }>()
      for (const ns of numstatOut.split('\n').filter(Boolean)) {
        const [add, del, ...pathParts] = ns.split('\t')
        const path = pathParts.join('\t')
        numstatMap.set(path, {
          additions: add === '-' ? 0 : parseInt(add, 10) || 0,
          deletions: del === '-' ? 0 : parseInt(del, 10) || 0,
        })
      }

      // Parse name-status: "M\tpath" or "R100\told\tnew"
      const files: Array<{
        path: string
        oldPath?: string
        kind: string
        additions: number
        deletions: number
      }> = []

      let totalAdd = 0
      let totalDel = 0

      for (const ns of nameStatusOut.split('\n').filter(Boolean)) {
        const cols = ns.split('\t')
        const statusChar = cols[0]?.[0] ?? 'M'
        let kind: string
        let path: string
        let oldPath: string | undefined

        if (statusChar === 'R') {
          kind = 'renamed'
          oldPath = cols[1]
          path = cols[2] ?? cols[1]
        } else {
          path = cols[1] ?? ''
          kind = statusChar === 'A' ? 'added'
            : statusChar === 'D' ? 'deleted'
            : 'modified'
        }

        const stats = numstatMap.get(path) ?? { additions: 0, deletions: 0 }
        totalAdd += stats.additions
        totalDel += stats.deletions

        files.push({ path, oldPath, kind, ...stats })
      }

      // Insert commit + files in a transaction
      db.transaction((tx) => {
        tx.insert(schema.gitCommits)
          .values({
            id: commitId,
            projectId,
            sha,
            shortSha,
            message,
            authorName,
            authorEmail,
            committedAt,
            branch: branchName || null,
            additions: totalAdd,
            deletions: totalDel,
            filesChanged: files.length,
            origin,
          })
          .onConflictDoNothing()
          .run()

        for (const f of files) {
          tx.insert(schema.gitCommitFiles)
            .values({
              commitId,
              path: f.path,
              oldPath: f.oldPath ?? null,
              kind: f.kind,
              additions: f.additions,
              deletions: f.deletions,
            })
            .run()
        }
      })

      insertedCount++
    }

    // Update watermark
    if (latestSha) {
      db.update(schema.projects)
        .set({ lastSyncedSha: latestSha })
        .where(eq(schema.projects.id, projectId))
        .run()
    }

    console.log(`[git-history] Synced ${insertedCount} commits for project ${projectId}`)
    return { newCommits: insertedCount, latestSha }
  } finally {
    syncing.delete(projectId)
  }
}

/**
 * After a task completes, link any commits made during its execution window
 * to the task via the task_commits junction table.
 */
export function linkTaskCommits(taskId: string, projectId: string): number {
  const db = getDb()
  const task = db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId)).get()
  if (!task?.startedAt || !task?.completedAt) return 0

  // Add a 5-second buffer after completion to catch commits that land just after process exits
  const completedDate = new Date(task.completedAt)
  completedDate.setSeconds(completedDate.getSeconds() + 5)
  const bufferedCompletedAt = completedDate.toISOString()

  const commits = db.select({ id: schema.gitCommits.id })
    .from(schema.gitCommits)
    .where(
      and(
        eq(schema.gitCommits.projectId, projectId),
        gte(schema.gitCommits.committedAt, task.startedAt),
        lte(schema.gitCommits.committedAt, bufferedCompletedAt),
      ),
    )
    .all()

  if (commits.length === 0) return 0

  db.transaction((tx) => {
    for (const commit of commits) {
      tx.insert(schema.taskCommits)
        .values({ taskId, commitId: commit.id })
        .onConflictDoNothing()
        .run()
      // Mark these commits as task-originated
      tx.update(schema.gitCommits)
        .set({ origin: 'task' })
        .where(eq(schema.gitCommits.id, commit.id))
        .run()
    }
  })

  console.log(`[git-history] Linked ${commits.length} commits to task ${taskId}`)
  return commits.length
}

/**
 * Check how many commits exist since the last sync.
 */
export async function detectNewCommits(projectId: string): Promise<{
  lastSyncedSha: string | null
  headSha: string
  pendingCommits: number
}> {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)

  const cwd = project.absolutePath
  const { stdout: headSha } = await exec('git rev-parse HEAD', cwd)

  if (!headSha) {
    return { lastSyncedSha: project.lastSyncedSha ?? null, headSha: '', pendingCommits: 0 }
  }

  if (project.lastSyncedSha === headSha) {
    return { lastSyncedSha: project.lastSyncedSha, headSha, pendingCommits: 0 }
  }

  if (!project.lastSyncedSha) {
    const { stdout: countOut } = await exec('git rev-list --count HEAD', cwd)
    return {
      lastSyncedSha: null,
      headSha,
      pendingCommits: parseInt(countOut, 10) || 0,
    }
  }

  const { stdout: countOut } = await exec(
    `git rev-list --count ${project.lastSyncedSha}..HEAD`,
    cwd,
  )

  return {
    lastSyncedSha: project.lastSyncedSha,
    headSha,
    pendingCommits: parseInt(countOut, 10) || 0,
  }
}

// ─── Query helpers ─────────────────────────────────────

export type GitCommitRow = typeof schema.gitCommits.$inferSelect
export type GitCommitFileRow = typeof schema.gitCommitFiles.$inferSelect

export interface DetailedCommit extends GitCommitRow {
  files: GitCommitFileRow[]
}

export function getDetailedCommits(
  projectId: string,
  limit = 50,
  offset = 0,
): { commits: DetailedCommit[]; hasMore: boolean } {
  const db = getDb()

  const commitRows = db.select()
    .from(schema.gitCommits)
    .where(eq(schema.gitCommits.projectId, projectId))
    .orderBy(desc(schema.gitCommits.committedAt))
    .limit(limit + 1)
    .offset(offset)
    .all()

  const hasMore = commitRows.length > limit
  const commits = commitRows.slice(0, limit)

  const detailed: DetailedCommit[] = commits.map((c) => {
    const files = db.select()
      .from(schema.gitCommitFiles)
      .where(eq(schema.gitCommitFiles.commitId, c.id))
      .all()
    return { ...c, files }
  })

  return { commits: detailed, hasMore }
}

export function getFileCommitHistory(
  projectId: string,
  filePath: string,
  limit = 20,
): DetailedCommit[] {
  const db = getDb()

  // Find commits that touched this file
  const commitIds = db.selectDistinct({ commitId: schema.gitCommitFiles.commitId })
    .from(schema.gitCommitFiles)
    .where(eq(schema.gitCommitFiles.path, filePath))
    .all()
    .map((r) => r.commitId)

  if (commitIds.length === 0) return []

  // Filter to this project and sort
  const commits = db.select()
    .from(schema.gitCommits)
    .where(
      and(
        eq(schema.gitCommits.projectId, projectId),
        sql`${schema.gitCommits.id} IN (${sql.join(commitIds.map((id) => sql`${id}`), sql`, `)})`,
      ),
    )
    .orderBy(desc(schema.gitCommits.committedAt))
    .limit(limit)
    .all()

  return commits.map((c) => {
    const files = db.select()
      .from(schema.gitCommitFiles)
      .where(eq(schema.gitCommitFiles.commitId, c.id))
      .all()
    return { ...c, files }
  })
}

export function getTaskCommitHistory(taskId: string): DetailedCommit[] {
  const db = getDb()

  const links = db.select({ commitId: schema.taskCommits.commitId })
    .from(schema.taskCommits)
    .where(eq(schema.taskCommits.taskId, taskId))
    .all()

  if (links.length === 0) return []

  const commitIds = links.map((l) => l.commitId)

  const commits = db.select()
    .from(schema.gitCommits)
    .where(sql`${schema.gitCommits.id} IN (${sql.join(commitIds.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(desc(schema.gitCommits.committedAt))
    .all()

  return commits.map((c) => {
    const files = db.select()
      .from(schema.gitCommitFiles)
      .where(eq(schema.gitCommitFiles.commitId, c.id))
      .all()
    return { ...c, files }
  })
}
