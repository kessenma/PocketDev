import { Elysia, t } from 'elysia'
import { existsSync } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, extname, relative, resolve } from 'node:path'
import {
  createAdmin,
  verifyAdmin,
  createSession,
  validateSession,
  clearSession,
  setCustomPasscode,
  getActivePasscode,
  regeneratePasscode,
  sessionCookieHeader,
} from '../services/console-auth.ts'
import { hasDevices } from '../services/setup.ts'
import { hasAdminAccount, getDevices, deleteDevice, updateDeviceName, getToolRecord, getTaskLogs, getTaskFileTouches, hasPasskeyCredentials } from '../db/index.ts'
import { checkAllPrerequisites } from '../services/prerequisites.ts'
import { getTerminalDebugLog } from '../services/terminal-ws.ts'
import { getCodexAuthDebug } from '../services/codex-setup.ts'
import { getClaudeAuthDebug } from '../services/claude-setup.ts'
import { getCopilotAuthDebug } from '../services/copilot-setup.ts'
import { getGitHubAuthDebug } from '../services/git-setup.ts'
import { getActiveProjectId, getActiveProjectPath, getProjectsDebug } from '../services/projects.ts'
import { checkPythonStatus } from '../services/python-setup.ts'
import { checkRustStatus } from '../services/rust-setup.ts'
import { checkGoStatus } from '../services/go-setup.ts'
import { checkTypeScriptStatus } from '../services/typescript-setup.ts'
import { getTaskList, getProcess, buildCommand, killTask } from '../services/task-manager.ts'
import { getGitSummary } from '../services/git.ts'
import { getDetailedCommits, detectNewCommits } from '../services/git-history-sync.ts'
import { getWsDebugInfo } from '../services/ws.ts'
import { createBrowserSession } from '../services/proxy.ts'
import { getAgentVersion, checkForUpdate, clearVersionCache } from '../services/version.ts'
import { disableManagedSwap, enableManagedSwap, getSwapMetrics, getSwapStatus } from '../services/swap.ts'
import type { FileSearchResult, TreeEntry } from '@pocketdev/shared/types'

const PORT = Number(process.env.POCKETDEV_PORT ?? 4387)

// Resolve console SPA dist directory
// In dev: apps/agent/console/dist
// In production (installed): /opt/pocketdev/console
const CONSOLE_DIST = existsSync(join(import.meta.dir, '../../console/dist'))
  ? join(import.meta.dir, '../../console/dist')
  : join(process.cwd(), 'console')

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function extractHostIp(request: Request): string {
  const host = request.headers.get('host') ?? ''
  // Strip port
  const ip = host.replace(/:\d+$/, '')
  return ip || '0.0.0.0'
}

function requireConsoleSession(request: Request, set: { status?: unknown }) {
  if (!validateSession(request.headers.get('cookie'))) {
    set.status = 401
    return false
  }
  return true
}

function safeRepoPath(baseDir: string, requestedPath: string) {
  const resolved = resolve(baseDir, requestedPath)
  if (!resolved.startsWith(resolve(baseDir))) return null
  return resolved
}

async function listRepoDirectory(baseDir: string, dirPath: string): Promise<TreeEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const result: TreeEntry[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

    const fullPath = join(dirPath, entry.name)
    result.push({
      name: entry.name,
      path: relative(baseDir, fullPath),
      type: entry.isDirectory() ? 'dir' : 'file',
    })
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export const consoleRoutes = new Elysia({ prefix: '/api/console' })
  // ─── Health (no auth) ─────────────────────────────────
  .get('/health', async () => ({
    hasAdmin: hasAdminAccount(),
    paired: hasDevices(),
    uptime: process.uptime(),
    hasPasskeys: hasPasskeyCredentials(),
    version: getAgentVersion(),
    update: await checkForUpdate(),
  }))

  // ─── Setup (create admin, no auth) ────────────────────
  .post('/setup', async ({ body, set }) => {
    if (hasAdminAccount()) {
      set.status = 403
      return { error: 'Admin account already exists' }
    }

    try {
      await createAdmin(body.email, body.password)
      const token = createSession(body.email)
      set.headers['set-cookie'] = sessionCookieHeader(token)
      return { ok: true }
    } catch (err) {
      set.status = 400
      return { error: err instanceof Error ? err.message : 'Setup failed' }
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })

  // ─── Login (no auth) ─────────────────────────────────
  .post('/login', async ({ body, set }) => {
    const valid = await verifyAdmin(body.email, body.password)
    if (!valid) {
      set.status = 401
      return { error: 'Invalid email or password' }
    }

    const token = createSession(body.email)
    set.headers['set-cookie'] = sessionCookieHeader(token)
    return { ok: true }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })

  // ─── Logout ───────────────────────────────────────────
  .post('/logout', ({ request, set }) => {
    clearSession(request.headers.get('cookie'))
    set.headers['set-cookie'] = 'pocketdev_session=; HttpOnly; Path=/PocketDev; Max-Age=0'
    return { ok: true }
  })

  // ─── Status (requires session) ────────────────────────
  .get('/status', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const devices = getDevices().map((d) => ({
      id: d.id,
      name: d.name,
      platform: d.platform,
      lastSeenAt: d.lastSeenAt,
    }))

    // Detect if Caddy is running (HTTPS reverse proxy in front of agent)
    let secure = false
    let externalPort = PORT
    try {
      const proc = Bun.spawn(['systemctl', 'is-active', 'caddy'], { stdout: 'pipe', stderr: 'pipe' })
      const output = await new Response(proc.stdout).text()
      if (output.trim() === 'active') {
        secure = true
        externalPort = 443
      }
    } catch {
      // systemctl not available — assume no Caddy
    }

    // Use domain from domain.txt if available
    const dataDir = process.env.POCKETDEV_DATA_DIR ?? './data'
    let serverHost = extractHostIp(request)
    try {
      const domain = (await readFile(join(dataDir, 'domain.txt'), 'utf-8')).trim()
      if (domain) serverHost = domain
    } catch {
      // No domain file
    }

    return {
      paired: hasDevices(),
      devices,
      passcode: getActivePasscode(),
      serverIp: serverHost,
      port: externalPort,
      secure,
    }
  })

  // ─── Set custom passcode (requires session) ──────────
  .post('/passcode', ({ request, body, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    setCustomPasscode(body.code)
    return { ok: true, code: body.code }
  }, {
    body: t.Object({
      code: t.String(),
    }),
  })

  // ─── Refresh passcode (requires session) ──────────────
  .post('/passcode/refresh', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const code = regeneratePasscode()
    return { ok: true, code }
  })

  // ─── Rename device (requires session) ─────────────────
  .patch('/devices/:id', ({ request, params, body, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    updateDeviceName(params.id, body.name)
    return { ok: true }
  }, {
    body: t.Object({
      name: t.String(),
    }),
  })

  // ─── Delete device (requires session) ─────────────────
  .delete('/devices/:id', ({ request, params, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    deleteDevice(params.id)
    return { ok: true }
  })

  // ─── Auth debug (requires session) ────────────────────
  .get('/debug/auth', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const devices = getDevices().map((d) => ({
      id: d.id,
      name: d.name,
      platform: d.platform,
      publicKeyPrefix: d.publicKey?.slice(0, 16) + '...',
      lastSeenAt: d.lastSeenAt,
    }))

    return {
      serverTime: Date.now(),
      serverTimeISO: new Date().toISOString(),
      deviceCount: devices.length,
      devices,
    }
  })

  // ─── Test auth header (requires session, simulates mobile auth check) ──
  .post('/debug/test-auth', async ({ request, body, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const { authenticateRequest } = await import('../services/auth.ts')
    const authHeader = body.authHeader as string
    const result = await authenticateRequest(authHeader)

    // Also decode to show what we got
    let decoded = null
    try {
      const token = authHeader.replace(/^PocketDev\s+/i, '')
      decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    } catch { /* ignore */ }

    return {
      authenticated: !!result,
      deviceId: result,
      decoded,
      serverTime: Date.now(),
      timeDiff: decoded?.timestamp ? Math.abs(Date.now() - decoded.timestamp) : null,
    }
  }, {
    body: t.Object({
      authHeader: t.String(),
    }),
  })

  // ─── Terminal debug log (requires session) ────────────
  .get('/debug/terminal', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return { entries: getTerminalDebugLog() }
  })

  // ─── Network / WebSocket debug (requires session) ─────
  .get('/debug/network', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const wsInfo = getWsDebugInfo()
    return {
      websocket: wsInfo,
      server: {
        port: Number(process.env.POCKETDEV_PORT ?? 4387),
        uptime: wsInfo.serverUptime,
      },
    }
  })

  .get('/debug/codex-auth', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return getCodexAuthDebug()
  })

  .get('/debug/claude-auth', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return getClaudeAuthDebug()
  })

  .get('/debug/github-auth', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return getGitHubAuthDebug()
  })

  .get('/debug/copilot-auth', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return getCopilotAuthDebug()
  })

  .get('/debug/projects', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return await getProjectsDebug()
  })

  // ─── Git history debug (requires session) ──────────────
  .get('/debug/git-history', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const projectId = getActiveProjectId()
    if (!projectId) {
      return { commits: [], syncStatus: null, projectId: null }
    }

    try {
      const [historyResult, syncStatus] = await Promise.all([
        Promise.resolve(getDetailedCommits(projectId, 30, 0)),
        detectNewCommits(projectId).catch(() => null),
      ])

      return {
        projectId,
        commits: historyResult.commits.map((c) => ({
          sha: c.shortSha,
          fullSha: c.sha,
          message: c.message,
          authorName: c.authorName,
          authorEmail: c.authorEmail,
          committedAt: c.committedAt,
          branch: c.branch,
          additions: c.additions ?? 0,
          deletions: c.deletions ?? 0,
          filesChanged: c.filesChanged ?? 0,
          origin: c.origin ?? 'external',
          files: c.files.map((f) => ({
            path: f.path,
            oldPath: f.oldPath,
            kind: f.kind,
            additions: f.additions ?? 0,
            deletions: f.deletions ?? 0,
          })),
        })),
        hasMore: historyResult.hasMore,
        syncStatus,
      }
    } catch {
      return { commits: [], syncStatus: null, projectId }
    }
  })

  // ─── Tasks debug (requires session) ────────────────────
  .get('/debug/tasks', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const tasks = getTaskList()
    const activeProcesses = tasks
      .filter((task) => task.status === 'running')
      .map((task) => {
        const proc = getProcess(task.id)
        return { taskId: task.id, hasProcess: !!proc, status: proc?.status ?? null }
      })

    // Include logs for recent failed/running tasks (last 50 lines each)
    const taskLogs: Record<string, Array<{ stream: string; line: string; timestamp: string | null }>> = {}
    for (const task of tasks.slice(0, 10)) {
      const logs = getTaskLogs(task.id, 50)
      if (logs.length > 0) {
        taskLogs[task.id] = logs.map((l) => ({ stream: l.stream, line: l.line, timestamp: l.timestamp }))
      }
    }

    // Reconstruct commands for debug visibility
    const taskCommands: Record<string, string> = {}
    for (const task of tasks.slice(0, 10)) {
      try {
        const cmd = buildCommand(task.agentType ?? 'claude', task.prompt, task.model ?? null, (task.mode ?? 'default') as 'default' | 'plan', task.sessionId ?? undefined)
        taskCommands[task.id] = cmd.map((c: string) => c.includes(' ') ? `"${c}"` : c).join(' ')
      } catch { /* ignore */ }
    }

    // Include file touches for recent tasks
    const taskFiles: Record<string, Array<{ filePath: string; action: string; turnNumber: number | null }>> = {}
    for (const task of tasks.slice(0, 10)) {
      const touches = getTaskFileTouches(task.id)
      if (touches.length > 0) {
        taskFiles[task.id] = touches.map((t) => ({ filePath: t.filePath, action: t.action, turnNumber: t.turnNumber }))
      }
    }

    return { tasks, activeProcesses, totalCount: tasks.length, taskLogs, taskCommands, taskFiles }
  })

  // ─── Kill task (requires session) ──────────────────────
  .post('/debug/tasks/:taskId/kill', ({ request, params, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const killed = killTask(params.taskId)
    return { success: killed, taskId: params.taskId }
  })

  // ─── Setup debug (requires session) ───────────────────
  .get('/debug/setup', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const prerequisites = await checkAllPrerequisites()
    const claudeRecord = getToolRecord('claude_cli')
    const codexRecord = getToolRecord('codex_cli')
    const opencodeTool = prerequisites.tools.find((tool) => tool.id === 'opencode_cli')
    const opencodeInstalled = !!opencodeTool && opencodeTool.status !== 'missing'
    const opencodeVerified = opencodeTool?.details.verified === 'true'
    const swap = getSwapStatus()

    return {
      prerequisites,
      providers: {
        claude: {
          installed: !!claudeRecord?.path,
          authenticated: !!claudeRecord?.authenticated,
          version: claudeRecord?.version ?? null,
          path: claudeRecord?.path ?? null,
        },
        codex: {
          installed: !!codexRecord?.path,
          authenticated: !!codexRecord?.authenticated,
          version: codexRecord?.version ?? null,
          path: codexRecord?.path ?? null,
        },
        opencode: {
          installed: opencodeInstalled,
          authenticated: opencodeVerified,
          verified: opencodeVerified,
          version: opencodeTool?.version ?? null,
          path: opencodeTool?.path ?? null,
          verifyOutput: opencodeTool?.details.verify_output ?? null,
        },
      },
      swap,
    }
  })

  .post('/swap/enable', async ({ request, set, body }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    try {
      return await enableManagedSwap(body.sizeGb)
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to enable swap' }
    }
  }, {
    body: t.Object({
      sizeGb: t.Number(),
    }),
  })

  .post('/swap/disable', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    try {
      return await disableManagedSwap()
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to disable swap' }
    }
  })

  .get('/swap/metrics', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    try {
      return await getSwapMetrics()
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to inspect swap metrics' }
    }
  })

  // ─── Python debug (requires session) ──────────────────
  .get('/debug/python', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return checkPythonStatus()
  })

  // ─── Rust debug (requires session) ─────────────────────
  .get('/debug/rust', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return checkRustStatus()
  })

  // ─── Go debug (requires session) ──────────────────────
  .get('/debug/go', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return checkGoStatus()
  })

  // ─── TypeScript debug (requires session) ───────────────
  .get('/debug/typescript', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return checkTypeScriptStatus()
  })

  // ─── Prerequisites (requires session) ─────────────────
  .get('/prerequisites', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    return checkAllPrerequisites()
  })

  .get('/repo/summary', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }

    try {
      const summary = await getGitSummary()
      return {
        repoName: summary.repoName,
        repoPath: summary.repoPath,
        branchName: summary.currentBranch.name,
      }
    } catch (error) {
      const repoPath = await getActiveProjectPath()
      return {
        repoName: repoPath.split('/').filter(Boolean).pop() ?? 'Workspace',
        repoPath,
        branchName: 'No branch',
        error: error instanceof Error ? error.message : 'Failed to inspect git summary',
      }
    }
  })

  .get('/repo/list', async ({ request, query, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }

    const baseDir = await getActiveProjectPath()
    const targetPath = safeRepoPath(baseDir, query.path ?? '.')
    if (!targetPath) {
      set.status = 403
      return { error: 'Path outside allowed directory' }
    }

    try {
      const entries = await listRepoDirectory(baseDir, targetPath)
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

  .get('/repo/read', async ({ request, query, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }

    const baseDir = await getActiveProjectPath()
    const targetPath = safeRepoPath(baseDir, query.path)
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
      return {
        path: relative(baseDir, targetPath),
        content,
        size: info.size,
      }
    } catch {
      set.status = 404
      return { error: 'File not found' }
    }
  }, {
    query: t.Object({
      path: t.String(),
    }),
  })

  .get('/repo/search', async ({ request, query, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }

    const baseDir = await getActiveProjectPath()
    const searchPath = safeRepoPath(baseDir, query.path ?? '.')
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
        set.status = 500
        return { error: 'Search failed' }
      }

      const results = output
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try { return JSON.parse(line) } catch { return null }
        })
        .filter((entry): entry is { type: string; data: Record<string, unknown> } => entry?.type === 'match')
        .map((entry) => ({
          path: relative(baseDir, (entry.data.path as { text: string }).text),
          line_number: entry.data.line_number as number,
          text: (entry.data.lines as { text: string }).text.trim(),
        })) as FileSearchResult[]

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

  .post('/repo/preview-session', ({ request, body, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }

    try {
      return createBrowserSession(body.target_url)
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Invalid browser target' }
    }
  }, {
    body: t.Object({
      target_url: t.String(),
    }),
  })

  // ─── Domain / HTTPS settings (requires session) ──────────
  .get('/settings/domain', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const dataDir = process.env.POCKETDEV_DATA_DIR ?? './data'
    const domainFile = join(dataDir, 'domain.txt')
    let domain: string | null = null

    try {
      const content = await readFile(domainFile, 'utf-8')
      domain = content.trim() || null
    } catch {
      // No domain file = not configured yet
    }

    // Check if Caddy is running
    let httpsEnabled = false
    try {
      const proc = Bun.spawn(['systemctl', 'is-active', 'caddy'], { stdout: 'pipe', stderr: 'pipe' })
      const output = await new Response(proc.stdout).text()
      httpsEnabled = output.trim() === 'active'
    } catch {
      // systemctl not available or caddy not installed
    }

    return {
      domain,
      httpsEnabled,
      serverIp: extractHostIp(request),
    }
  })

  .post('/settings/domain', async ({ request, body, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const domain = body.domain.trim()

    // Basic domain validation (if provided)
    if (domain && !/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(domain)) {
      set.status = 400
      return { error: 'Invalid domain format' }
    }

    const dataDir = process.env.POCKETDEV_DATA_DIR ?? './data'
    const port = Number(process.env.POCKETDEV_PORT ?? 4387)

    // Write Caddyfile
    let caddyConfig: string
    if (domain) {
      caddyConfig = `${domain} {\n  reverse_proxy localhost:${port}\n}\n`
    } else {
      caddyConfig = `:443 {\n  tls internal\n  reverse_proxy localhost:${port}\n}\n`
    }

    try {
      // Write Caddyfile via sudo tee (install script sets up sudoers for this)
      const teeProc = Bun.spawn(['sudo', 'tee', '/etc/caddy/Caddyfile'], {
        stdin: new TextEncoder().encode(caddyConfig),
        stdout: 'pipe',
        stderr: 'pipe',
      })
      await teeProc.exited

      // Save domain to data dir
      await writeFile(join(dataDir, 'domain.txt'), domain)

      // Reload Caddy to pick up the new config
      const reloadProc = Bun.spawn(['sudo', 'systemctl', 'reload', 'caddy'], { stdout: 'pipe', stderr: 'pipe' })
      const reloadExit = await reloadProc.exited

      if (reloadExit !== 0) {
        const stderr = await new Response(reloadProc.stderr).text()
        return { ok: false, error: `Caddy reload failed: ${stderr.trim()}` }
      }

      const host = domain || extractHostIp(request)
      return { ok: true, url: `https://${host}/PocketDev/console` }
    } catch (err) {
      set.status = 500
      return { error: err instanceof Error ? err.message : 'Failed to update domain config' }
    }
  }, {
    body: t.Object({
      domain: t.String(),
    }),
  })

  // ─── Agent update (requires session) ──────────────────
  .post('/update', async ({ request, body, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const targetVersion = body?.version
    const bundleUrl = targetVersion
      ? `https://pocketdev.run/agent/bundle/${targetVersion}`
      : 'https://pocketdev.run/agent/bundle'

    try {
      // Download bundle to temp file
      const res = await fetch(bundleUrl)
      if (!res.ok) {
        set.status = 502
        return { error: `Failed to download bundle: ${res.status} ${res.statusText}` }
      }

      const tmpFile = `/tmp/pocketdev-update-${Date.now()}.tar.gz`
      await Bun.write(tmpFile, res)

      // Validate it's a real tarball
      const validateProc = Bun.spawn(['tar', '-tzf', tmpFile], { stdout: 'pipe', stderr: 'pipe' })
      if ((await validateProc.exited) !== 0) {
        set.status = 502
        return { error: 'Downloaded file is not a valid tarball' }
      }

      // Schedule the actual update to happen after we respond
      // This gives the client time to receive the response before we restart
      setTimeout(async () => {
        const installDir = process.cwd()
        const serviceName = 'pocketdev-agent'

        // Extract new files over the current install
        const extractProc = Bun.spawn(
          ['tar', '-xzf', tmpFile, '-C', installDir, '--strip-components=1'],
          { stdout: 'pipe', stderr: 'pipe' },
        )
        await extractProc.exited

        // Clean up temp file
        Bun.spawn(['rm', '-f', tmpFile])

        // Clear cached version so the new version.json is read
        clearVersionCache()

        // Restart the service (this will kill us in production)
        Bun.spawn(['systemctl', 'restart', serviceName], { stdout: 'pipe', stderr: 'pipe' })
      }, 500)

      return { ok: true, message: 'Update started. The agent will restart shortly.' }
    } catch (err) {
      set.status = 500
      return { error: err instanceof Error ? err.message : 'Update failed' }
    }
  }, {
    body: t.Optional(t.Object({
      version: t.Optional(t.String()),
    })),
  })

// ─── Static file serving for console SPA ────────────────
export const consoleStaticRoutes = new Elysia()
  // Serve static assets (JS, CSS, images)
  .get('/assets/*', ({ params, set }) => {
    const filePath = join(CONSOLE_DIST, 'assets', params['*'])
    const file = Bun.file(filePath)

    if (!file.size) {
      set.status = 404
      return 'Not found'
    }

    const ext = extname(filePath)
    set.headers['content-type'] = MIME_TYPES[ext] ?? 'application/octet-stream'
    set.headers['cache-control'] = 'public, max-age=31536000, immutable'
    return file
  })

  // SPA fallback: serve index.html for all non-API, non-asset routes
  .get('/*', ({ params, set }) => {
    const path = params['*']

    // Don't intercept API routes, WebSocket, or preview paths
    if (path.startsWith('api/') || path.startsWith('ws') || path.startsWith('preview/')) {
      set.status = 404
      return 'Not found'
    }

    const indexPath = join(CONSOLE_DIST, 'index.html')
    const file = Bun.file(indexPath)

    if (!file.size) {
      set.status = 404
      return 'Console UI not found. Run the console build first.'
    }

    set.headers['content-type'] = 'text/html'
    return file
  })
