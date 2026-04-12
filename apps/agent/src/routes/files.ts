import { Elysia, t } from 'elysia'
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { join, resolve, relative } from 'node:path'
import type { FileSearchResult, TreeEntry } from '@pocketdev/shared/types'
import { authenticateRequest } from '../services/auth/auth.ts'
import { getActiveProjectPath } from '../services/system/projects.ts'

/** Resolve and validate a path is within BASE_DIR */
function safePath(baseDir: string, requestedPath: string): string | null {
  const resolved = resolve(baseDir, requestedPath)
  if (!resolved.startsWith(resolve(baseDir))) return null
  return resolved
}

export const fileRoutes = new Elysia({ prefix: '/files' })
  .get('/list', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const baseDir = await getActiveProjectPath()
    const targetPath = safePath(baseDir, query.path ?? '.')
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      const entries = await listDirectory(baseDir, targetPath)
      return {
        base: baseDir,
        path: relative(baseDir, targetPath) || '.',
        entries,
      }
    } catch {
      set.status = 404
      return { error: 'Directory not found' }
    }
  }, {
    query: t.Object({
      path: t.Optional(t.String()),
    }),
  })
  // Directory listing
  .get('/tree', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const baseDir = await getActiveProjectPath()
    const targetPath = safePath(baseDir, query.path ?? '.')
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      const depth = Math.min(Number(query.depth ?? 2), 5)
      console.log(`[files] GET /files/tree path=${query.path ?? '.'} depth=${depth}`)
      const tree = await buildTree(baseDir, targetPath, depth)
      return { base: baseDir, tree }
    } catch (err) {
      set.status = 404
      return { error: 'Directory not found' }
    }
  }, {
    query: t.Object({
      path: t.Optional(t.String()),
      depth: t.Optional(t.String()),
    }),
  })

  // Read file content
  .get('/read', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const baseDir = await getActiveProjectPath()
    const targetPath = safePath(baseDir, query.path)
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      const info = await stat(targetPath)
      if (info.size > 1_048_576) {
        set.status = 413
        return { error: 'File too large (>1MB)' }
      }
      const content = await readFile(targetPath, 'utf-8')
      return { path: relative(baseDir, targetPath), content, size: info.size }
    } catch {
      set.status = 404
      return { error: 'File not found' }
    }
  }, {
    query: t.Object({
      path: t.String(),
    }),
  })

  // Write file content
  .put('/write', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const baseDir = await getActiveProjectPath()
    const targetPath = safePath(baseDir, body.path)
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      await writeFile(targetPath, body.content, 'utf-8')
      return { path: relative(baseDir, targetPath), written: true }
    } catch (err) {
      set.status = 500
      return { error: 'Failed to write file' }
    }
  }, {
    body: t.Object({
      path: t.String(),
      content: t.String(),
    }),
  })

  // Create directory
  .post('/mkdir', async ({ request, body, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const baseDir = await getActiveProjectPath()
    const targetPath = safePath(baseDir, body.path)
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      await mkdir(targetPath, { recursive: true })
      return { path: relative(baseDir, targetPath), created: true }
    } catch {
      set.status = 500
      return { error: 'Failed to create directory' }
    }
  }, {
    body: t.Object({
      path: t.String(),
    }),
  })

  // Delete file or directory
  .delete('/delete', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const baseDir = await getActiveProjectPath()
    const targetPath = safePath(baseDir, query.path)
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    // Prevent deleting base dir itself
    if (resolve(targetPath) === resolve(baseDir)) {
      set.status = 403
      return { error: 'Cannot delete base directory' }
    }

    try {
      await rm(targetPath, { recursive: true })
      return { path: relative(baseDir, targetPath), deleted: true }
    } catch {
      set.status = 404
      return { error: 'Path not found' }
    }
  }, {
    query: t.Object({
      path: t.String(),
    }),
  })

  // Search files using ripgrep (falls back to grep)
  .get('/search', async ({ request, query, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const baseDir = await getActiveProjectPath()
    const searchPath = safePath(baseDir, query.path ?? '.')
    if (!searchPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      const proc = Bun.spawn(
        ['rg', '--json', '--max-count', '50', query.q, searchPath],
        { stdout: 'pipe', stderr: 'pipe' },
      )

      const output = await new Response(proc.stdout).text()
      const exitCode = await proc.exited

      if (exitCode > 1) {
        // rg returns 1 for no matches, >1 for errors — fall back to grep
        const fallback = Bun.spawn(
          ['grep', '-rn', '--max-count=50', query.q, searchPath],
          { stdout: 'pipe', stderr: 'pipe' },
        )
        const grepOutput = await new Response(fallback.stdout).text()
        const results: FileSearchResult[] = grepOutput
          .split('\n')
          .filter(Boolean)
          .slice(0, 50)
          .map((line) => ({ path: query.path ?? '.', line_number: 0, text: line }))
        return {
          base: baseDir,
          query: query.q,
          path: query.path ?? '.',
          results,
        }
      }

      // Parse ripgrep JSON output
      const results = output
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try { return JSON.parse(line) } catch { return null }
        })
        .filter((r): r is { type: string; data: Record<string, unknown> } =>
          r?.type === 'match',
        )
        .map((r) => ({
          path: relative(baseDir, (r.data.path as { text: string }).text),
          line_number: (r.data.line_number as number),
          text: (r.data.lines as { text: string }).text.trim(),
        }))

      return {
        base: baseDir,
        query: query.q,
        path: query.path ?? '.',
        results,
      }
    } catch {
      set.status = 500
      return { error: 'Search failed' }
    }
  }, {
    query: t.Object({
      q: t.String(),
      path: t.Optional(t.String()),
    }),
  })

/** Recursively build a directory tree */
async function buildTree(
  baseDir: string,
  dirPath: string,
  maxDepth: number,
  currentDepth = 0,
): Promise<TreeEntry[]> {
  if (currentDepth >= maxDepth) return []

  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const result: TreeEntry[] = []

    for (const entry of entries) {
      // Skip hidden files and common noise
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

      const fullPath = join(dirPath, entry.name)
      const relativePath = relative(baseDir, fullPath)

      if (entry.isDirectory()) {
        const children = await buildTree(baseDir, fullPath, maxDepth, currentDepth + 1)
        result.push({ name: entry.name, path: relativePath, type: 'dir', children })
      } else {
        result.push({ name: entry.name, path: relativePath, type: 'file' })
      }
    }

    return result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}

async function listDirectory(baseDir: string, dirPath: string): Promise<TreeEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const result: TreeEntry[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

    const fullPath = join(dirPath, entry.name)
    const relativePath = relative(baseDir, fullPath)

    result.push({
      name: entry.name,
      path: relativePath,
      type: entry.isDirectory() ? 'dir' : 'file',
    })
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
