// Canned data for the backend-less console demo. Every value is typed against the
// real interfaces exported from `#/lib/api`, so the demo renders the exact same UI
// the agent serves — just against static data instead of a live server.
import type {
  ConsoleStatus,
  ConsoleUser,
  PrerequisitesReport,
  ToolCheck,
  UserManagementResponse,
  RepoSummary,
  RepoListResponse,
  RepoEntry,
  RepoFileRead,
  RepoSearchResponse,
  TasksDebugInfo,
  SetupDebugInfo,
  AuthDebugInfo,
  NetworkDebugInfo,
  ProjectsDebugInfo,
  ConsoleProject,
  EnvVar,
  DomainSettings,
  LockStatus,
  SwapDebugInfo,
  UpdateInfo,
} from '#/lib/api'

const now = Date.now()
const iso = (msAgo: number) => new Date(now - msAgo).toISOString()

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export const DEMO_VERSION = '0.2.0'
export const DEMO_LATEST_VERSION = '0.3.0'
export const DEMO_PROJECT_PATH = '/home/dev/acme-web'

// ─── Self-update banner ───────────────────────────────────────────────────────
// A pending update so the demo showcases the agent's self-update / rollback flow.
export const updateInfo: UpdateInfo = {
  current: DEMO_VERSION,
  latest: DEMO_LATEST_VERSION,
  updateAvailable: true,
  changelogUrl: 'https://pocketdev.run/changelog',
  versions: [DEMO_LATEST_VERSION, DEMO_VERSION, '0.1.0'],
  stableVersions: [
    { version: DEMO_LATEST_VERSION, publishedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { version: DEMO_VERSION, publishedAt: new Date(now - 16 * 24 * 60 * 60 * 1000).toISOString() },
    { version: '0.1.0', publishedAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString() },
  ],
  betas: [
    { version: '0.3.1-beta.1', publishedAt: new Date(now - 12 * 60 * 60 * 1000).toISOString() },
  ],
}

// ─── Auth / identity ────────────────────────────────────────────────────────

const owner: ConsoleUser = {
  id: 1,
  email: 'you@pocketdev.run',
  role: 'owner',
  status: 'active',
  createdAt: iso(30 * DAY),
  reviewedByUserId: null,
  reviewedAt: null,
  lastLoginAt: iso(5 * MIN),
}

const teammate: ConsoleUser = {
  id: 2,
  email: 'sam@pocketdev.run',
  role: 'member',
  status: 'pending',
  createdAt: iso(2 * HOUR),
  reviewedByUserId: null,
  reviewedAt: null,
  lastLoginAt: null,
}

export const health = {
  hasAdmin: true,
  signupEnabled: false,
  paired: true,
  uptime: 4 * HOUR,
  hasPasskeys: false,
  version: DEMO_VERSION,
  update: updateInfo,
}

export const status: ConsoleStatus = {
  currentUser: owner,
  permissions: { canManageUsers: true, canManageRoles: true, canToggleSignup: true },
  signupEnabled: false,
  paired: true,
  devices: [
    { id: 'dev-iphone', name: "Kyle's iPhone", platform: 'ios', lastSeenAt: iso(3 * MIN) },
    { id: 'dev-pixel', name: 'Pixel 9 Pro', platform: 'android', lastSeenAt: iso(6 * HOUR) },
  ],
  passcode: '428 913',
  serverIp: '203.0.113.42',
  port: 4387,
  secure: true,
  lastUpgradeAt: iso(2 * DAY),
}

export const users: UserManagementResponse = {
  currentUser: owner,
  permissions: { canManageUsers: true, canManageRoles: true, canToggleSignup: true },
  signupEnabled: false,
  users: [owner, teammate],
}

// ─── Prerequisites / tool readiness ───────────────────────────────────────────

const tool = (
  id: string,
  name: string,
  opts: Partial<ToolCheck> = {},
): ToolCheck => ({
  id,
  name,
  status: 'installed',
  auth_status: 'not_applicable',
  version: null,
  path: `/usr/local/bin/${id}`,
  required: false,
  details: {},
  ...opts,
})

export const prerequisites: PrerequisitesReport = {
  os: 'Ubuntu 24.04 LTS',
  arch: 'arm64',
  ready: true,
  tools: [
    tool('git', 'Git', { version: '2.43.0', required: true }),
    tool('node', 'Node.js', { version: '22.11.0', required: true }),
    tool('pnpm', 'pnpm', { version: '9.12.0' }),
    tool('bun', 'Bun', { version: '1.1.38' }),
    tool('claude', 'Claude Code', { version: '1.0.0', auth_status: 'authenticated' }),
    tool('codex', 'Codex CLI', { version: '0.4.0', auth_status: 'authenticated' }),
    tool('python', 'Python', { version: '3.12.3' }),
  ],
}

// ─── Repository inspector ─────────────────────────────────────────────────────

export const repoSummary: RepoSummary = {
  repoName: 'acme-web',
  repoPath: DEMO_PROJECT_PATH,
  branchName: 'main',
}

// A tiny in-memory tree keyed by directory path.
const repoTree: Record<string, RepoEntry[]> = {
  '.': [
    { name: 'src', path: 'src', type: 'dir' },
    { name: 'public', path: 'public', type: 'dir' },
    { name: 'package.json', path: 'package.json', type: 'file' },
    { name: 'README.md', path: 'README.md', type: 'file' },
    { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file' },
  ],
  src: [
    { name: 'index.ts', path: 'src/index.ts', type: 'file' },
    { name: 'server.ts', path: 'src/server.ts', type: 'file' },
    { name: 'routes', path: 'src/routes', type: 'dir' },
  ],
  'src/routes': [
    { name: 'tasks.ts', path: 'src/routes/tasks.ts', type: 'file' },
    { name: 'health.ts', path: 'src/routes/health.ts', type: 'file' },
  ],
  public: [{ name: 'favicon.ico', path: 'public/favicon.ico', type: 'file' }],
}

export function repoList(path: string): RepoListResponse {
  const key = path === '' || path === '/' ? '.' : path
  return { base: DEMO_PROJECT_PATH, path: key, entries: repoTree[key] ?? [] }
}

const repoFiles: Record<string, string> = {
  'package.json': `{
  "name": "acme-web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node dist/index.js"
  }
}
`,
  'README.md': `# acme-web

A demo project running on a PocketDev agent. Control this server from your phone:
pair a device, kick off Claude/Codex tasks, browse files, and preview the dev
server — all from the PocketDev mobile app.
`,
  'src/index.ts': `import { server } from './server'

const port = Number(process.env.PORT ?? 5173)
server.listen(port, () => {
  console.log(\`acme-web listening on http://localhost:\${port}\`)
})
`,
  'src/server.ts': `import express from 'express'
import { tasksRouter } from './routes/tasks'
import { healthRouter } from './routes/health'

export const server = express()
server.use('/api/tasks', tasksRouter)
server.use('/health', healthRouter)
`,
  'src/routes/tasks.ts': `import { Router } from 'express'

export const tasksRouter = Router()

tasksRouter.get('/', (_req, res) => {
  res.json({ tasks: [] })
})
`,
}

export function repoFile(path: string): RepoFileRead {
  const content = repoFiles[path] ?? `// ${path}\n// (demo file — contents elided)\n`
  return { path, content, size: content.length }
}

export function repoSearch(query: string, path: string): RepoSearchResponse {
  const q = query.toLowerCase()
  const results = Object.entries(repoFiles).flatMap(([filePath, content]) =>
    content
      .split('\n')
      .map((text, i) => ({ path: filePath, line_number: i + 1, text }))
      .filter((m) => m.text.toLowerCase().includes(q)),
  )
  return { base: DEMO_PROJECT_PATH, query, path, results: results.slice(0, 20) }
}

// ─── Projects + env vars ──────────────────────────────────────────────────────

export const projects: ConsoleProject[] = [
  {
    id: 'proj-acme',
    name: 'acme-web',
    absolutePath: DEMO_PROJECT_PATH,
    remoteUrl: 'https://github.com/acme/acme-web',
    isActive: true,
  },
  {
    id: 'proj-api',
    name: 'acme-api',
    absolutePath: '/home/dev/acme-api',
    remoteUrl: 'https://github.com/acme/acme-api',
    isActive: false,
  },
]

const envVar = (key: string, value: string | null, extra: Partial<EnvVar> = {}): EnvVar => ({
  id: `env-${key.toLowerCase()}`,
  projectPath: DEMO_PROJECT_PATH,
  key,
  value,
  comment: null,
  isSecret: false,
  isMultiline: false,
  order: 0,
  createdAt: iso(3 * DAY),
  updatedAt: iso(1 * DAY),
  ...extra,
})

export const envVars: EnvVar[] = [
  envVar('NODE_ENV', 'production', { order: 0 }),
  envVar('PORT', '5173', { order: 1 }),
  envVar('DATABASE_URL', 'postgres://••••••••', { order: 2, isSecret: true }),
  envVar('OPENAI_API_KEY', 'sk-••••••••', { order: 3, isSecret: true }),
]

// ─── Settings ─────────────────────────────────────────────────────────────────

export const domainSettings: DomainSettings = {
  domain: 'agent.acme.dev',
  httpsEnabled: true,
  serverIp: '203.0.113.42',
}

export const lockStatus: LockStatus = {
  locked: false,
  firewallEnabled: true,
  firewallAvailable: true,
  autoLockMinutes: 30,
  wakePort: 4388,
  activeClients: 1,
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasksDebug: TasksDebugInfo = {
  totalCount: 3,
  tasks: [
    {
      id: 'task-001',
      prompt: 'Add a dark mode toggle to the settings page',
      agentType: 'claude',
      mode: 'default',
      model: 'claude-opus-4-8',
      status: 'running',
      workingDirectory: DEMO_PROJECT_PATH,
      projectId: 'proj-acme',
      projectName: 'acme-web',
      sessionId: 'sess-abc123',
      turnCount: 4,
      createdAt: iso(8 * MIN),
      startedAt: iso(8 * MIN),
      completedAt: null,
      exitCode: null,
    },
    {
      id: 'task-002',
      prompt: 'Write unit tests for the auth middleware',
      agentType: 'codex',
      mode: 'default',
      model: null,
      status: 'completed',
      workingDirectory: DEMO_PROJECT_PATH,
      projectId: 'proj-acme',
      projectName: 'acme-web',
      sessionId: 'sess-def456',
      turnCount: 11,
      createdAt: iso(2 * HOUR),
      startedAt: iso(2 * HOUR),
      completedAt: iso(2 * HOUR - 6 * MIN),
      exitCode: 0,
    },
    {
      id: 'task-003',
      prompt: 'Migrate the build from webpack to Vite',
      agentType: 'claude',
      mode: 'plan',
      model: 'claude-sonnet-4-6',
      status: 'failed',
      workingDirectory: DEMO_PROJECT_PATH,
      projectId: 'proj-acme',
      projectName: 'acme-web',
      sessionId: 'sess-ghi789',
      turnCount: 2,
      createdAt: iso(1 * DAY),
      startedAt: iso(1 * DAY),
      completedAt: iso(1 * DAY - 3 * MIN),
      exitCode: 1,
    },
  ],
  activeProcesses: [
    { taskId: 'task-001', hasProcess: true, status: 'running', pendingQuestions: [] },
  ],
  taskLogs: {
    'task-001': [
      { stream: 'stdout', line: '› Reading src/settings/SettingsPage.tsx', timestamp: iso(7 * MIN) },
      { stream: 'stdout', line: '› Adding useTheme() hook and toggle control', timestamp: iso(6 * MIN) },
      { stream: 'stdout', line: '✎ Edited src/settings/SettingsPage.tsx (+24 −2)', timestamp: iso(5 * MIN) },
      { stream: 'stdout', line: '› Running type-check…', timestamp: iso(1 * MIN) },
    ],
    'task-002': [
      { stream: 'stdout', line: '✓ 14 tests passed', timestamp: iso(2 * HOUR - 6 * MIN) },
    ],
    'task-003': [
      { stream: 'stderr', line: 'error: could not resolve entry module', timestamp: iso(1 * DAY - 3 * MIN) },
    ],
  },
  taskCommands: {
    'task-001': 'claude -p "Add a dark mode toggle to the settings page"',
    'task-002': 'codex exec "Write unit tests for the auth middleware"',
    'task-003': 'claude --plan "Migrate the build from webpack to Vite"',
  },
  taskFiles: {
    'task-001': [{ filePath: 'src/settings/SettingsPage.tsx', action: 'edit', turnNumber: 3 }],
    'task-002': [{ filePath: 'src/middleware/auth.test.ts', action: 'create', turnNumber: 2 }],
  },
  taskAttachments: {
    'task-001': [
      { serverPath: '/home/user/.pocketdev/data/attachments/design-mockup.png', originalName: 'design-mockup.png' },
    ],
  },
}

// ─── Debug surfaces (valid minimal shapes so every panel renders cleanly) ──────

export const authDebug: AuthDebugInfo = {
  serverTime: now,
  serverTimeISO: new Date(now).toISOString(),
  deviceCount: 2,
  devices: [
    { id: 'dev-iphone', name: "Kyle's iPhone", platform: 'ios', publicKeyPrefix: 'ed25519:9f3a…', lastSeenAt: iso(3 * MIN) },
    { id: 'dev-pixel', name: 'Pixel 9 Pro', platform: 'android', publicKeyPrefix: 'ed25519:2c7b…', lastSeenAt: iso(6 * HOUR) },
  ],
}

export const networkDebug: NetworkDebugInfo = {
  websocket: {
    connectedClients: [
      { deviceId: 'dev-iphone', connectedAt: now - 12 * MIN, connectedDuration: 12 * MIN, messageCount: 87 },
    ],
    recentEvents: [
      { type: 'connect', deviceId: 'dev-iphone', timestamp: now - 12 * MIN },
      { type: 'message_in', deviceId: 'dev-iphone', timestamp: now - 2 * MIN, detail: 'task.start' },
    ],
    serverUptime: 4 * HOUR,
  },
  server: { port: 4387, uptime: 4 * HOUR },
}

export const projectsDebug: ProjectsDebugInfo = {
  activeProjectId: 'proj-acme',
  sshGithubUsername: 'acme-bot',
  ghCliUsername: 'acme-bot',
  ghCliAuthenticated: true,
  privateRepoAccess: true,
  fetchSource: 'gh',
  fetchError: null,
  fetchedGithubUsername: 'acme-bot',
  fetchedRepoCount: 12,
  fetchedPrivateCount: 4,
  fetchedPublicCount: 8,
  fetchedPrivateSample: ['acme/acme-web', 'acme/acme-api'],
  fetchedPublicSample: ['acme/docs', 'acme/marketing'],
  localProjectCount: 2,
  listedProjectCount: 2,
  listedPrivateCount: 2,
  listedPublicCount: 0,
  listedUnknownCount: 0,
  listedPrivateSample: ['acme/acme-web', 'acme/acme-api'],
  recentOperations: [
    { ts: iso(20 * MIN), kind: 'select', message: 'Selected acme-web' },
    { ts: iso(1 * DAY), kind: 'clone', message: 'Cloned acme/acme-api' },
  ],
}

const swap: SwapDebugInfo = {
  supported: true,
  canManage: true,
  totalBytes: 2 * 1024 ** 3,
  usedBytes: 312 * 1024 ** 2,
  freeBytes: 2 * 1024 ** 3 - 312 * 1024 ** 2,
  swappiness: 60,
  entries: [
    { path: '/swapfile', type: 'file', sizeBytes: 2 * 1024 ** 3, usedBytes: 312 * 1024 ** 2, priority: -2 },
  ],
  managed: {
    tracked: true,
    active: true,
    filePath: '/swapfile',
    sizeBytes: 2 * 1024 ** 3,
    swappiness: 60,
    previousSwappiness: 60,
    createdAt: iso(2 * DAY),
  },
  actions: { canEnable: false, canDisable: true, enableBlockedReason: null, disableBlockedReason: null },
}

export const setupDebug: SetupDebugInfo = {
  prerequisites,
  providers: {
    claude: { installed: true, authenticated: true, version: '1.0.0', path: '/usr/local/bin/claude', verified: true, verifyOutput: 'ok' },
    codex: { installed: true, authenticated: true, version: '0.4.0', path: '/usr/local/bin/codex', verified: true, verifyOutput: 'ok' },
    opencode: { installed: false, authenticated: false, version: null, path: null },
  },
  swap,
}

// Minimal-valid shapes for the remaining polled debug endpoints.
const emptyAuthSession = { activeSessionCount: 0, sessions: [], persistedState: null }

export const debugDefaults: Record<string, unknown> = {
  '/debug/terminal': { entries: [] },
  '/debug/claude-auth': emptyAuthSession,
  '/debug/codex-auth': { ...emptyAuthSession, lastReplayDebug: null },
  '/debug/github-auth': emptyAuthSession,
  '/debug/copilot-auth': {
    ...emptyAuthSession,
    trustMarkers: [],
    events: [],
    liveStatusTarget: '/home/dev/acme-web',
    liveStatus: { trustConfigured: true },
  },
  '/debug/git-history': { projectId: 'proj-acme', commits: [], hasMore: false, syncStatus: null, syncError: null },
  '/debug/python': { installed: true, version: '3.12.3', path: '/usr/bin/python3', binary: 'python3', pip_installed: true, pip_version: '24.0', pip_path: '/usr/bin/pip3', venv_available: true, ppa_added: false },
  '/debug/rust': { installed: false, version: null, path: null, cargo_installed: false, cargo_version: null, cargo_path: null, rustup_installed: false, rustup_version: null },
  '/debug/go': { installed: false, version: null, path: null, gopath: null, goroot: null },
  '/debug/typescript': { installed: true, version: '5.8.3', path: '/usr/local/bin/tsc', ts_node_installed: false, ts_node_version: null },
  '/debug/push': { relayToken: 'pdr_8f3a…', registeredDevices: 2, log: [] },
  '/debug/minimax-setup': { status: { opencode_installed: false, opencode_version: null, api_key_configured: false, api_key_masked: null, verified: false, verify_output: null } },
  '/swap/metrics': {
    generatedAt: new Date(now).toISOString(),
    storage: { path: '/', totalBytes: 80 * 1024 ** 3, usedBytes: 32 * 1024 ** 3, availableBytes: 48 * 1024 ** 3 },
    app: { path: DEMO_PROJECT_PATH, footprintBytes: 180 * 1024 ** 2 },
    recommendations: { suggestedGb: [2, 4, 8], recommendedGb: 4, maxRecommendedGb: 8, maxCustomGb: 16, customWarning: null },
  },
  '/swap/enable': swap,
  '/swap/disable': swap,
  '/offline-snapshots': { snapshots: [] },
  '/passkey/credentials': { credentials: [] },
}
