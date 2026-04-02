import { Elysia, t } from 'elysia'
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { join, resolve, relative } from 'node:path'
import type { TreeEntry } from '@pocketdev/shared/types'

/** Base directory for file operations — prevents traversal attacks */
const BASE_DIR = process.env.POCKETDEV_PROJECT_DIR ?? process.env.HOME ?? '/'

/** Resolve and validate a path is within BASE_DIR */
function safePath(requestedPath: string): string | null {
  const resolved = resolve(BASE_DIR, requestedPath)
  if (!resolved.startsWith(resolve(BASE_DIR))) return null
  return resolved
}

export const fileRoutes = new Elysia({ prefix: '/files' })
  // Directory listing
  .get('/tree', async ({ query, set }) => {
    const targetPath = safePath(query.path ?? '.')
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      const depth = Math.min(Number(query.depth ?? 2), 5)
      console.log(`[files] GET /files/tree path=${query.path ?? '.'} depth=${depth}`)
      const tree = await buildTree(targetPath, depth)
      return { base: BASE_DIR, tree }
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
  .get('/read', async ({ query, set }) => {
    const targetPath = safePath(query.path)
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
      return { path: relative(BASE_DIR, targetPath), content, size: info.size }
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
  .put('/write', async ({ body, set }) => {
    const targetPath = safePath(body.path)
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      await writeFile(targetPath, body.content, 'utf-8')
      return { path: relative(BASE_DIR, targetPath), written: true }
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
  .post('/mkdir', async ({ body, set }) => {
    const targetPath = safePath(body.path)
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      await mkdir(targetPath, { recursive: true })
      return { path: relative(BASE_DIR, targetPath), created: true }
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
  .delete('/delete', async ({ query, set }) => {
    const targetPath = safePath(query.path)
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    // Prevent deleting base dir itself
    if (resolve(targetPath) === resolve(BASE_DIR)) {
      set.status = 403
      return { error: 'Cannot delete base directory' }
    }

    try {
      await rm(targetPath, { recursive: true })
      return { path: relative(BASE_DIR, targetPath), deleted: true }
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
  .get('/search', async ({ query, set }) => {
    const searchPath = safePath(query.path ?? '.')
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
        return {
          results: grepOutput
            .split('\n')
            .filter(Boolean)
            .slice(0, 50)
            .map((line) => ({ raw: line })),
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
          path: relative(BASE_DIR, (r.data.path as { text: string }).text),
          line_number: (r.data.line_number as number),
          text: (r.data.lines as { text: string }).text.trim(),
        }))

      return { results }
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
      const relativePath = relative(BASE_DIR, fullPath)

      if (entry.isDirectory()) {
        const children = await buildTree(fullPath, maxDepth, currentDepth + 1)
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

