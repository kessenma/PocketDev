import { Elysia, t } from 'elysia'
import { authenticateRequest } from '../services/auth.ts'
import {
  GitServiceError,
  getGitSummary,
  getGitChanges,
  getGitDiff,
  getGitHistory,
  getGitBranches,
  checkoutBranch,
  commitStaged,
  pushCurrent,
  pullCurrent,
} from '../services/git.ts'
import {
  syncGitHistory,
  detectNewCommits,
  getDetailedCommits,
  getFileCommitHistory,
  getTaskCommitHistory,
  type DetailedCommit,
} from '../services/git-history-sync.ts'
import { getActiveProjectId } from '../services/projects.ts'
import type { GitDetailedCommitEntry, GitCommitFileEntry } from '@pocketdev/shared/types'

function handleError(error: unknown, set: { status?: number | string }) {
  const message = error instanceof Error ? error.message : 'Git operation failed'
  if (error instanceof GitServiceError) {
    set.status = error.statusCode
    return { error: message, code: error.code }
  }
  set.status = 500
  return { error: message, code: 'command_failed' }
}

export const gitRoutes = new Elysia({ prefix: '/git' })
  .get('/summary', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      console.log('[git] GET /git/summary')
      return await getGitSummary()
    } catch (error) {
      return handleError(error, set)
    }
  })

  .get('/changes', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return { changes: await getGitChanges() }
    } catch (error) {
      return handleError(error, set)
    }
  })

  .get('/diff', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const staged = query.staged === '1'
      return await getGitDiff(query.path, staged)
    } catch (error) {
      return handleError(error, set)
    }
  }, {
    query: t.Object({
      path: t.String(),
      staged: t.Optional(t.String()),
    }),
  })

  .get('/history', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const limit = query.limit ? parseInt(query.limit, 10) : undefined
      return { commits: await getGitHistory(limit) }
    } catch (error) {
      return handleError(error, set)
    }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
    }),
  })

  .get('/branches', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      return { branches: await getGitBranches() }
    } catch (error) {
      return handleError(error, set)
    }
  })

  .post('/checkout', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const summary = await checkoutBranch(body.branchName)
      return { ok: true, summary }
    } catch (error) {
      return handleError(error, set)
    }
  }, {
    body: t.Object({
      branchName: t.String(),
    }),
  })

  .post('/commit', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const summary = await commitStaged(body.message)
      // Sync the new commit into history with 'app' origin
      const projectId = getActiveProjectId()
      if (projectId) {
        syncGitHistory(projectId, 10, 'app').catch((e) =>
          console.warn('[git] Post-commit history sync failed:', e),
        )
      }
      return { ok: true, summary }
    } catch (error) {
      return handleError(error, set)
    }
  }, {
    body: t.Object({
      message: t.String(),
    }),
  })

  .post('/push', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const summary = await pushCurrent()
      return { ok: true, summary }
    } catch (error) {
      return handleError(error, set)
    }
  })

  .post('/pull', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      console.log('[git] POST /git/pull')
      const summary = await pullCurrent()
      return { ok: true, summary }
    } catch (error) {
      return handleError(error, set)
    }
  })

  // ─── Repo History endpoints ────────────────────────────

  .get('/history/detailed', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const projectId = getActiveProjectId()
      if (!projectId) { set.status = 400; return { error: 'No active project' } }

      const limit = query.limit ? parseInt(query.limit, 10) : 50
      const offset = query.offset ? parseInt(query.offset, 10) : 0
      const result = getDetailedCommits(projectId, limit, offset)
      return {
        commits: result.commits.map(toDetailedCommitEntry),
        hasMore: result.hasMore,
      }
    } catch (error) {
      return handleError(error, set)
    }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
  })

  .get('/history/file', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const projectId = getActiveProjectId()
      if (!projectId) { set.status = 400; return { error: 'No active project' } }

      const limit = query.limit ? parseInt(query.limit, 10) : 20
      const commits = getFileCommitHistory(projectId, query.path, limit)
      return { commits: commits.map(toDetailedCommitEntry) }
    } catch (error) {
      return handleError(error, set)
    }
  }, {
    query: t.Object({
      path: t.String(),
      limit: t.Optional(t.String()),
    }),
  })

  .post('/history/sync', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const projectId = getActiveProjectId()
      if (!projectId) { set.status = 400; return { error: 'No active project' } }

      const result = await syncGitHistory(projectId)
      return result
    } catch (error) {
      return handleError(error, set)
    }
  })

  .get('/history/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const projectId = getActiveProjectId()
      if (!projectId) { set.status = 400; return { error: 'No active project' } }

      return await detectNewCommits(projectId)
    } catch (error) {
      return handleError(error, set)
    }
  })

  .get('/history/task/:taskId', async ({ request, params, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }

    try {
      const commits = getTaskCommitHistory(params.taskId)
      return { commits: commits.map(toDetailedCommitEntry) }
    } catch (error) {
      return handleError(error, set)
    }
  })

function toDetailedCommitEntry(c: DetailedCommit): GitDetailedCommitEntry {
  return {
    sha: c.shortSha,
    fullSha: c.sha,
    message: c.message,
    author: c.authorName,
    authorEmail: c.authorEmail ?? undefined,
    relativeTime: '', // Client can compute from committedAt
    committedAt: c.committedAt,
    branch: c.branch ?? undefined,
    filesChanged: c.filesChanged ?? 0,
    origin: (c.origin as GitDetailedCommitEntry['origin']) ?? 'external',
    files: c.files.map((f): GitCommitFileEntry => ({
      path: f.path,
      oldPath: f.oldPath ?? undefined,
      kind: (f.kind as GitCommitFileEntry['kind']) ?? 'modified',
      additions: f.additions ?? 0,
      deletions: f.deletions ?? 0,
    })),
  }
}
