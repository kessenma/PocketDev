import { Elysia, t } from 'elysia'
import { existsSync } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, extname, relative, resolve } from 'node:path'
import {
  createAdmin,
  createSignupRequest,
  authenticateConsoleUser,
  createSession,
  getSessionUser,
  clearSession,
  setCustomPasscode,
  getActivePasscode,
  regeneratePasscode,
  sessionCookieHeader,
  getConsolePermissions,
  isConsoleSignupEnabled,
  setConsoleSignupEnabled,
  canManageTargetUser,
} from '../services/auth/console-auth.ts'
import { hasDevices } from '../services/auth/setup.ts'
import {
  hasAdminAccount,
  getDevices,
  deleteDevice,
  updateDeviceName,
  getToolRecord,
  getTaskLogs,
  getTaskFileTouches,
  hasPasskeyCredentials,
  getAdminAccounts,
  getAdminAccountById,
  updateAdminAccountStatus,
  updateAdminAccountRole,
  getProjects,
  getConfig,
  getPushLog,
  getDeviceOfflineSnapshots,
  getLastUpgradeAt,
  setLastUpgradeAt,
  type AdminAccountRow,
} from '../db/index.ts'
import { checkAllPrerequisites } from '../services/cli-setup/prerequisites.ts'
import { getTerminalDebugLog } from '../services/terminal/terminal-ws.ts'
import { getCodexAuthDebug } from '../services/cli-setup/codex-setup.ts'
import { getClaudeAuthDebug } from '../services/cli-setup/claude-setup.ts'
import { getCopilotAuthDebug } from '../services/cli-setup/copilot-setup.ts'
import { getGitHubAuthDebug } from '../services/git/git-setup.ts'
import { getActiveProjectId, getActiveProjectPath, getProjectsDebug } from '../services/system/projects.ts'
import { checkPythonStatus } from '../services/cli-setup/python-setup.ts'
import { checkRustStatus } from '../services/cli-setup/rust-setup.ts'
import { checkGoStatus } from '../services/cli-setup/go-setup.ts'
import { checkTypeScriptStatus } from '../services/cli-setup/typescript-setup.ts'
import { checkMinimaxStatus } from '../services/cli-setup/minimax-setup.ts'
import { getTaskList, getProcess, buildCommand, killTask } from '../services/tasks/task-manager.ts'
import { updateTaskStatus } from '../db/index.ts'
import { getGitSummary } from '../services/git/git.ts'
import { getDetailedCommits, detectNewCommits, syncGitHistory } from '../services/git/git-history-sync.ts'
import { getWsDebugInfo, getConnectedClientCount, closeAllClients, broadcast, makeMessage } from '../services/terminal/ws.ts'
import { lockPort, unlockPort, isLocked, isFirewallEnabled, isFirewallAvailable, setFirewallEnabled } from '../services/system/firewall.ts'
import { createBrowserSession } from '../services/preview/proxy.ts'
import { getAgentVersion, checkForUpdate, clearVersionCache } from '../services/system/version.ts'
import { disableManagedSwap, enableManagedSwap, getSwapMetrics, getSwapStatus } from '../services/system/swap.ts'
import {
  listEnvVars,
  createEnvVar,
  updateEnvVarById,
  deleteEnvVarById,
  bulkUpsertEnvVars,
} from '../services/system/env-vars.ts'
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
  const user = getSessionUser(request.headers.get('cookie'))
  if (!user) {
    set.status = 401
    return null
  }
  return user
}

function serializeConsoleUser(user: AdminAccountRow) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    reviewedByUserId: user.reviewedByUserId,
    reviewedAt: user.reviewedAt,
    lastLoginAt: user.lastLoginAt,
  }
}

function getUserManagementPayload(currentUser: AdminAccountRow) {
  return {
    currentUser: serializeConsoleUser(currentUser),
    permissions: getConsolePermissions(currentUser),
    signupEnabled: isConsoleSignupEnabled(),
    users: getAdminAccounts().map(serializeConsoleUser),
  }
}

function requireUserManagementAccess(request: Request, set: { status?: unknown }) {
  const user = requireConsoleSession(request, set)
  if (!user) return null

  if (!getConsolePermissions(user).canManageUsers) {
    set.status = 403
    return null
  }

  return user
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
    signupEnabled: isConsoleSignupEnabled(),
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
      const account = getAdminAccounts().find((user) => user.role === 'owner')
      if (!account) {
        throw new Error('Owner account was not created')
      }
      const token = createSession(account.id)
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

  // ─── Signup request (no auth) ────────────────────────
  .post('/signup', async ({ body, set }) => {
    try {
      await createSignupRequest(body.email, body.password)
      return { ok: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      set.status = message === 'Sign-ups are currently closed' || message === 'Use setup to create the first owner account'
        ? 403
        : 400
      return { error: message }
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })

  // ─── Login (no auth) ─────────────────────────────────
  .post('/login', async ({ body, set }) => {
    const result = await authenticateConsoleUser(body.email, body.password)
    if (!result.ok) {
      set.status = 401
      return { error: result.error }
    }

    const token = createSession(result.user.id)
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
    const currentUser = requireConsoleSession(request, set)
    if (!currentUser) {
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
      currentUser: serializeConsoleUser(currentUser),
      permissions: getConsolePermissions(currentUser),
      signupEnabled: isConsoleSignupEnabled(),
      paired: hasDevices(),
      devices,
      passcode: getActivePasscode(),
      serverIp: serverHost,
      port: externalPort,
      secure,
      lastUpgradeAt: getLastUpgradeAt(),
    }
  })

  // ─── User management (requires elevated session) ─────
  .get('/users', ({ request, set }) => {
    const user = requireUserManagementAccess(request, set)
    if (!user) {
      return { error: set.status === 403 ? 'Forbidden' : 'Unauthorized' }
    }

    return getUserManagementPayload(user)
  })

  .post('/users/:id/status', ({ request, params, body, set }) => {
    const actor = requireUserManagementAccess(request, set)
    if (!actor) {
      return { error: set.status === 403 ? 'Forbidden' : 'Unauthorized' }
    }

    const target = getAdminAccountById(Number(params.id))
    if (!target) {
      set.status = 404
      return { error: 'User not found' }
    }

    if (!canManageTargetUser(actor, target)) {
      set.status = 403
      return { error: 'You cannot manage this user' }
    }

    updateAdminAccountStatus(target.id, body.status, actor.id)
    return getUserManagementPayload(actor)
  }, {
    body: t.Object({
      status: t.Union([
        t.Literal('active'),
        t.Literal('denied'),
        t.Literal('revoked'),
      ]),
    }),
  })

  .post('/users/:id/role', ({ request, params, body, set }) => {
    const actor = requireConsoleSession(request, set)
    if (!actor) {
      return { error: 'Unauthorized' }
    }

    const permissions = getConsolePermissions(actor)
    if (!permissions.canManageRoles) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const target = getAdminAccountById(Number(params.id))
    if (!target) {
      set.status = 404
      return { error: 'User not found' }
    }
    if (target.role === 'owner') {
      set.status = 403
      return { error: 'The owner account cannot be changed' }
    }
    if (target.status !== 'active') {
      set.status = 400
      return { error: 'Only active users can change roles' }
    }

    updateAdminAccountRole(target.id, body.role)
    return getUserManagementPayload(actor)
  }, {
    body: t.Object({
      role: t.Union([
        t.Literal('admin'),
        t.Literal('member'),
      ]),
    }),
  })

  .post('/settings/signup', ({ request, body, set }) => {
    const actor = requireConsoleSession(request, set)
    if (!actor) {
      return { error: 'Unauthorized' }
    }

    const permissions = getConsolePermissions(actor)
    if (!permissions.canToggleSignup) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    setConsoleSignupEnabled(body.enabled)
    return getUserManagementPayload(actor)
  }, {
    body: t.Object({
      enabled: t.Boolean(),
    }),
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

    const { authenticateRequest } = await import('../services/auth/auth.ts')
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

  // ─── Port security / firewall controls (requires session) ───
  .get('/lock/status', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    return {
      locked: isLocked(),
      firewallEnabled: isFirewallEnabled(),
      firewallAvailable: isFirewallAvailable(),
      autoLockMinutes: Number(process.env.POCKETDEV_AUTO_LOCK_MINUTES ?? 0),
      wakePort: Number(process.env.POCKETDEV_WAKE_PORT ?? 4388),
      activeClients: getConnectedClientCount(),
    }
  })

  .post('/lock/enable', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const enabled = typeof body?.enabled === 'boolean' ? body.enabled : true
    await setFirewallEnabled(enabled)
    return { firewallEnabled: isFirewallEnabled() }
  })

  .post('/lock/lock', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    broadcast(makeMessage('server.locked', {}))
    setTimeout(async () => {
      closeAllClients()
      await lockPort()
    }, 200)
    return { locked: true }
  })

  .post('/lock/unlock', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    await unlockPort()
    broadcast(makeMessage('server.unlocked', {}))
    return { locked: false }
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
      let syncError: string | null = null

      // Auto-sync if no commits exist yet
      let historyResult = getDetailedCommits(projectId, 30, 0)
      if (historyResult.commits.length === 0) {
        try {
          console.log('[git-history] Console auto-sync for:', projectId)
          await syncGitHistory(projectId)
        } catch (e) {
          syncError = e instanceof Error ? e.message : String(e)
          console.error('[git-history] Console auto-sync failed:', syncError)
        }
        historyResult = getDetailedCommits(projectId, 30, 0)
      }

      const syncStatus = await detectNewCommits(projectId).catch((e) => {
        console.error('[git-history] detectNewCommits failed:', e instanceof Error ? e.message : e)
        return null
      })

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
        syncError,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[git-history] Console git-history endpoint error:', msg)
      return { commits: [], syncStatus: null, projectId, syncError: msg }
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
        const pendingQuestions = proc && 'getPendingQuestions' in proc ? proc.getPendingQuestions() : []
        return { taskId: task.id, hasProcess: !!proc, status: proc?.status ?? null, pendingQuestions }
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
    if (!killed) {
      // Process not in active map — task may be orphaned (e.g. after server restart).
      // Force the DB status to 'killed' so the UI stops showing it as running.
      updateTaskStatus(params.taskId, 'killed', -1)
    }
    return { success: true, taskId: params.taskId }
  })

  // ─── Answer a pending task question from console (requires session) ──────────
  .post('/debug/tasks/:taskId/answer', async ({ request, params, set, body }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }

    const { questionId, answer } = body as { questionId: string; answer: string }
    const proc = getProcess(params.taskId)
    if (!proc || !('answerQuestion' in proc)) {
      set.status = 404
      return { error: 'No active process for this task' }
    }

    await proc.answerQuestion(questionId, answer)
    return { success: true, taskId: params.taskId, questionId }
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

  // ─── Minimax debug ────────────────────────────────────
  .get('/debug/minimax-setup', async ({ request, set }) => {
    if (!requireConsoleSession(request, set)) {
      return { error: 'Unauthorized' }
    }
    try {
      const status = await checkMinimaxStatus()
      return { status }
    } catch (error) {
      set.status = 500
      return { error: error instanceof Error ? error.message : 'Failed to check Minimax status' }
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
        const extractExitCode = await extractProc.exited

        // Clean up temp file
        Bun.spawn(['rm', '-f', tmpFile])

        if (extractExitCode !== 0) {
          console.error('[console:update] Failed to extract update bundle')
          return
        }

        setLastUpgradeAt(new Date().toISOString())

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
  // ─── Projects ──────────────────────────────────────────
  .get('/projects', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    return {
      projects: getProjects().map((p) => ({
        id: p.id,
        name: p.name,
        absolutePath: p.absolutePath,
        remoteUrl: p.remoteUrl,
      })),
    }
  })
  // ─── Env vars ──────────────────────────────────────────
  .get('/envs', ({ request, query, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    return { envVars: listEnvVars(query.projectPath) }
  }, {
    query: t.Object({ projectPath: t.String() }),
  })
  .post('/envs', ({ request, body, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    try {
      return createEnvVar(body)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create env var'
      if (message.includes('UNIQUE')) {
        set.status = 409
        return { error: 'A variable with this key already exists for this project' }
      }
      set.status = 500
      return { error: message }
    }
  }, {
    body: t.Object({
      projectPath: t.String(),
      key: t.String(),
      value: t.Optional(t.Nullable(t.String())),
      comment: t.Optional(t.Nullable(t.String())),
      isSecret: t.Optional(t.Boolean()),
      isMultiline: t.Optional(t.Boolean()),
    }),
  })
  // /envs/bulk MUST be before /envs/:id
  .patch('/envs/bulk', ({ request, body, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    return { envVars: bulkUpsertEnvVars(body.projectPath, body.data) }
  }, {
    body: t.Object({
      projectPath: t.String(),
      data: t.Array(t.Object({
        key: t.String(),
        value: t.Optional(t.Nullable(t.String())),
        comment: t.Optional(t.Nullable(t.String())),
        isSecret: t.Optional(t.Boolean()),
        isMultiline: t.Optional(t.Boolean()),
      })),
    }),
  })
  .patch('/envs/:id', ({ request, params, body, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    const result = updateEnvVarById(params.id, body)
    if (!result) { set.status = 404; return { error: 'Env var not found' } }
    return result
  }, {
    body: t.Object({
      key: t.Optional(t.String()),
      value: t.Optional(t.Nullable(t.String())),
      comment: t.Optional(t.Nullable(t.String())),
      isSecret: t.Optional(t.Boolean()),
      isMultiline: t.Optional(t.Boolean()),
      order: t.Optional(t.Number()),
    }),
  })
  .delete('/envs/:id', ({ request, params, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    deleteEnvVarById(params.id)
    set.status = 204
    return null
  })
  .get('/offline-snapshots', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }
    return { snapshots: getDeviceOfflineSnapshots() }
  })
  .get('/debug/push', ({ request, set }) => {
    if (!requireConsoleSession(request, set)) return { error: 'Unauthorized' }

    try {
      const rawToken = getConfig('push_relay_token')
      const relayToken = rawToken ? `${rawToken.slice(0, 8)}...` : null

      const devices = getDevices()
      const registeredDevices = devices.filter((d) => d.apnsToken).length

      const log = getPushLog(100)

      return { relayToken, registeredDevices, log }
    } catch (err) {
      // push_log table may not exist on older agent installs — return empty state
      return { relayToken: null, registeredDevices: 0, log: [] }
    }
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
