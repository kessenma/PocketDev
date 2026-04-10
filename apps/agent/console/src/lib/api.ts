const BASE = '/PocketDev/api/console'

async function post(path: string, body?: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })
  return response
}

async function get(path: string) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
  })
  return response
}

async function del(path: string) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  })
  return response
}

async function patch(path: string, body?: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })
  return response
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({ error: fallback }))
  return data.error || fallback
}

export interface UpdateInfo {
  current: string
  latest: string
  updateAvailable: boolean
  changelogUrl: string
  versions: string[]
}

export async function checkHealth(): Promise<{
  hasAdmin: boolean
  signupEnabled: boolean
  paired: boolean
  uptime: number
  hasPasskeys: boolean
  version: string
  update: UpdateInfo | null
}> {
  const res = await get('/health')
  return res.json()
}

export async function createAdmin(email: string, password: string) {
  const res = await post('/setup', { email, password })
  if (!res.ok) {
    throw new Error(await readError(res, 'Setup failed'))
  }
  return res.json()
}

export async function signup(email: string, password: string) {
  const res = await post('/signup', { email, password })
  if (!res.ok) {
    throw new Error(await readError(res, 'Signup failed'))
  }
  return res.json()
}

export async function login(email: string, password: string) {
  const res = await post('/login', { email, password })
  if (!res.ok) {
    throw new Error(await readError(res, 'Login failed'))
  }
  return res.json()
}

export async function logout() {
  await post('/logout')
}

export interface ConsoleUser {
  id: number
  email: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'pending' | 'denied' | 'revoked'
  createdAt: string | null
  reviewedByUserId: number | null
  reviewedAt: string | null
  lastLoginAt: string | null
}

export interface ConsolePermissions {
  canManageUsers: boolean
  canManageRoles: boolean
  canToggleSignup: boolean
}

export interface ConsoleStatus {
  currentUser: ConsoleUser
  permissions: ConsolePermissions
  signupEnabled: boolean
  paired: boolean
  devices: Array<{
    id: string
    name: string | null
    platform: string | null
    lastSeenAt: string | null
  }>
  passcode: string | null
  serverIp: string
  port: number
  secure: boolean
}

export async function fetchStatus(): Promise<ConsoleStatus> {
  const res = await get('/status')
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export async function setPasscode(code: string) {
  const res = await post('/passcode', { code })
  if (!res.ok) throw new Error('Failed to set passcode')
  return res.json()
}

export async function refreshPasscode() {
  const res = await post('/passcode/refresh')
  if (!res.ok) throw new Error('Failed to refresh passcode')
  return res.json()
}

export interface ToolCheck {
  id: string
  name: string
  status: 'installed' | 'missing' | 'misconfigured'
  auth_status: 'authenticated' | 'unauthenticated' | 'unknown' | 'not_applicable'
  version: string | null
  path: string | null
  required: boolean
  details: Record<string, string | null>
}

export interface PrerequisitesReport {
  os: string
  arch: string
  tools: ToolCheck[]
  ready: boolean
}

export async function fetchPrerequisites(): Promise<PrerequisitesReport> {
  const res = await get('/prerequisites')
  if (!res.ok) throw new Error('Failed to fetch prerequisites')
  return res.json()
}

export async function renameDevice(id: string, name: string) {
  const res = await fetch(`${BASE}/devices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
    credentials: 'same-origin',
  })
  if (!res.ok) throw new Error('Failed to rename device')
  return res.json()
}

export async function removeDevice(id: string) {
  const res = await del(`/devices/${id}`)
  if (!res.ok) throw new Error('Failed to remove device')
  return res.json()
}

export interface UserManagementResponse {
  currentUser: ConsoleUser
  permissions: ConsolePermissions
  signupEnabled: boolean
  users: ConsoleUser[]
}

export async function fetchUsers(): Promise<UserManagementResponse> {
  const res = await get('/users')
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch users'))
  }
  return res.json()
}

export async function updateUserStatus(id: number, status: 'active' | 'denied' | 'revoked') {
  const res = await post(`/users/${id}/status`, { status })
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to update user'))
  }
  return res.json() as Promise<UserManagementResponse>
}

export async function updateUserRole(id: number, role: 'admin' | 'member') {
  const res = await post(`/users/${id}/role`, { role })
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to update role'))
  }
  return res.json() as Promise<UserManagementResponse>
}

export async function updateSignupSetting(enabled: boolean) {
  const res = await post('/settings/signup', { enabled })
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to update signup setting'))
  }
  return res.json() as Promise<UserManagementResponse>
}

// ─── Debug ──────────────────────────────────────────────

export interface AuthDebugInfo {
  serverTime: number
  serverTimeISO: string
  deviceCount: number
  devices: Array<{
    id: string
    name: string | null
    platform: string | null
    publicKeyPrefix: string
    lastSeenAt: string | null
  }>
}

export async function fetchAuthDebug(): Promise<AuthDebugInfo> {
  const res = await get('/debug/auth')
  if (!res.ok) throw new Error('Failed to fetch auth debug')
  return res.json()
}

export interface TerminalDebugEntry {
  ts: string
  msg: string
}

export async function fetchTerminalDebug(): Promise<TerminalDebugEntry[]> {
  const res = await get('/debug/terminal')
  if (!res.ok) throw new Error('Failed to fetch terminal debug')
  const data = await res.json() as { entries: TerminalDebugEntry[] }
  return data.entries
}

export interface CodexAuthDebugSession {
  sessionId: string
  state: string
  authenticated: boolean
  completed: boolean
  authUrl: string | null
  verificationCode: string | null
  prompt: string | null
  error: string | null
  startedAt: string
  updatedAt: string
  outputExcerpt: string | null
}

export interface CodexReplayDebugInfo {
  sessionId: string | null
  inputCallbackUrl: string | null
  attempts: string[]
  success: boolean
  statusCode: number | null
  error: string | null
  sessionOutputExcerpt: string | null
  sessionPrompt: string | null
  recordedAt: string
}

export interface CodexAuthDebugInfo {
  activeSessionCount: number
  sessions: CodexAuthDebugSession[]
  lastReplayDebug: CodexReplayDebugInfo | null
  persistedState: {
    toolId: string
    path: string | null
    version: string | null
    authenticated: boolean
    updatedAt: string | null
  } | null
}

export async function fetchCodexAuthDebug(): Promise<CodexAuthDebugInfo> {
  const res = await get('/debug/codex-auth')
  if (!res.ok) throw new Error('Failed to fetch Codex auth debug')
  return res.json()
}

export interface ClaudeAuthDebugSession {
  sessionId: string
  state: string
  authenticated: boolean
  completed: boolean
  authUrl: string | null
  prompt: string | null
  error: string | null
  themeHandled: boolean
  methodHandled: boolean
  startedAt: string
  updatedAt: string
  outputExcerpt: string | null
}

export interface ClaudeAuthDebugInfo {
  activeSessionCount: number
  sessions: ClaudeAuthDebugSession[]
  persistedState: {
    toolId: string
    path: string | null
    version: string | null
    authenticated: boolean
    updatedAt: string | null
  } | null
}

export async function fetchClaudeAuthDebug(): Promise<ClaudeAuthDebugInfo> {
  const res = await get('/debug/claude-auth')
  if (!res.ok) throw new Error('Failed to fetch Claude auth debug')
  return res.json()
}

export interface GitHubAuthDebugSession {
  sessionId: string
  state: string
  authenticated: boolean
  completed: boolean
  authUrl: string | null
  verificationCode: string | null
  githubUsername: string | null
  privateRepoAccess: boolean
  browserLaunchHandled: boolean
  error: string | null
  startedAt: string
  updatedAt: string
  outputExcerpt: string | null
}

export interface GitHubAuthDebugInfo {
  activeSessionCount: number
  sessions: GitHubAuthDebugSession[]
  persistedState: {
    toolId: string
    path: string | null
    version: string | null
    authenticated: boolean
    updatedAt: string | null
  } | null
}

export async function fetchGitHubAuthDebug(): Promise<GitHubAuthDebugInfo> {
  const res = await get('/debug/github-auth')
  if (!res.ok) throw new Error('Failed to fetch GitHub auth debug')
  return res.json()
}

export interface CopilotAuthDebugSession {
  sessionId: string
  state: string
  trusted: boolean
  completed: boolean
  prompt: string | null
  trustTarget: string | null
  trustHandled: boolean
  fallbackTrustAttempted: boolean
  uiReady: boolean
  error: string | null
  startedAt: string
  updatedAt: string
  outputExcerpt: string | null
  rawOutputExcerpt: string | null
}

export interface CopilotAuthDebugInfo {
  activeSessionCount: number
  sessions: CopilotAuthDebugSession[]
  persistedState: {
    toolId: string
    path: string | null
    version: string | null
    authenticated: boolean
    updatedAt: string | null
  } | null
  trustMarkers: string[]
  events: Array<{
    ts: string
    sessionId: string | null
    message: string
  }>
  liveStatusTarget: string
  liveStatus: {
    trustConfigured: boolean
  }
}

export async function fetchCopilotAuthDebug(): Promise<CopilotAuthDebugInfo> {
  const res = await get('/debug/copilot-auth')
  if (!res.ok) throw new Error('Failed to fetch Copilot auth debug')
  return res.json()
}

export interface ProjectsDebugInfo {
  activeProjectId: string | null
  sshGithubUsername: string | null
  ghCliUsername: string | null
  ghCliAuthenticated: boolean
  privateRepoAccess: boolean
  fetchSource: 'gh' | 'public_api' | 'none'
  fetchError: string | null
  fetchedGithubUsername: string | null
  fetchedRepoCount: number
  fetchedPrivateCount: number
  fetchedPublicCount: number
  fetchedPrivateSample: string[]
  fetchedPublicSample: string[]
  localProjectCount: number
  listedProjectCount: number
  listedPrivateCount: number
  listedPublicCount: number
  listedUnknownCount: number
  listedPrivateSample: string[]
  recentOperations: Array<{
    ts: string
    kind: 'fetch' | 'clone' | 'select' | 'branch'
    message: string
  }>
}

export async function fetchProjectsDebug(): Promise<ProjectsDebugInfo> {
  const res = await get('/debug/projects')
  if (!res.ok) throw new Error('Failed to fetch projects debug')
  return res.json()
}

// ─── Git history debug ─────────────────────────────────────

export interface GitHistoryDebugCommitFile {
  path: string
  oldPath: string | null
  kind: string
  additions: number
  deletions: number
}

export interface GitHistoryDebugCommit {
  sha: string
  fullSha: string
  message: string
  authorName: string
  authorEmail: string | null
  committedAt: string
  branch: string | null
  additions: number
  deletions: number
  filesChanged: number
  origin: 'app' | 'task' | 'external'
  files: GitHistoryDebugCommitFile[]
}

export interface GitHistoryDebugInfo {
  projectId: string | null
  commits: GitHistoryDebugCommit[]
  hasMore: boolean
  syncStatus: {
    lastSyncedSha: string | null
    headSha: string
    pendingCommits: number
  } | null
  syncError: string | null
}

export async function fetchGitHistoryDebug(): Promise<GitHistoryDebugInfo> {
  const res = await get('/debug/git-history')
  if (!res.ok) throw new Error('Failed to fetch git history debug')
  return res.json()
}

// ─── Tasks debug ────────────────────────────────────────

export interface TaskDebugEntry {
  id: string
  prompt: string
  agentType: string
  mode: 'default' | 'plan'
  model: string | null
  status: string
  workingDirectory: string | null
  projectId: string | null
  projectName: string | null
  sessionId: string | null
  turnCount: number | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  exitCode: number | null
}

export interface TaskLogEntry {
  stream: string
  line: string
  timestamp: string | null
}

export interface TaskFileTouchEntry {
  filePath: string
  action: string
  turnNumber: number | null
}

export interface TasksDebugInfo {
  tasks: TaskDebugEntry[]
  activeProcesses: Array<{
    taskId: string
    hasProcess: boolean
    status: string | null
  }>
  totalCount: number
  taskLogs: Record<string, TaskLogEntry[]>
  taskCommands: Record<string, string>
  taskFiles: Record<string, TaskFileTouchEntry[]>
}

export async function fetchTasksDebug(): Promise<TasksDebugInfo> {
  const res = await get('/debug/tasks')
  if (!res.ok) throw new Error('Failed to fetch tasks debug')
  return res.json()
}

export async function killTaskFromConsole(taskId: string): Promise<{ success: boolean }> {
  const res = await post(`/debug/tasks/${taskId}/kill`)
  if (!res.ok) throw new Error('Failed to kill task')
  return res.json()
}

// ─── Setup debug ────────────────────────────────────────

export interface SetupProviderInfo {
  installed: boolean
  authenticated: boolean
  version: string | null
  path: string | null
  verified?: boolean
  verifyOutput?: string | null
}

export interface SwapEntry {
  path: string
  type: string
  sizeBytes: number
  usedBytes: number
  priority: number
}

export interface SwapDebugInfo {
  supported: boolean
  canManage: boolean
  totalBytes: number
  usedBytes: number
  freeBytes: number
  swappiness: number | null
  entries: SwapEntry[]
  managed: {
    tracked: boolean
    active: boolean
    filePath: string | null
    sizeBytes: number | null
    swappiness: number | null
    previousSwappiness: number | null
    createdAt: string | null
  }
  actions: {
    canEnable: boolean
    canDisable: boolean
    enableBlockedReason: string | null
    disableBlockedReason: string | null
  }
}

export interface SwapMetricsInfo {
  generatedAt: string
  storage: {
    path: string
    totalBytes: number
    usedBytes: number
    availableBytes: number
  } | null
  app: {
    path: string
    footprintBytes: number
  } | null
  recommendations: {
    suggestedGb: number[]
    recommendedGb: number | null
    maxRecommendedGb: number | null
    maxCustomGb: number | null
    customWarning: string | null
  }
}

export interface SetupDebugInfo {
  prerequisites: PrerequisitesReport
  providers: {
    claude: SetupProviderInfo
    codex: SetupProviderInfo
    opencode: SetupProviderInfo
  }
  swap: SwapDebugInfo
}

export async function fetchSetupDebug(): Promise<SetupDebugInfo> {
  const res = await get('/debug/setup')
  if (!res.ok) throw new Error('Failed to fetch setup debug')
  return res.json()
}

export async function enableManagedSwap(sizeGb: number): Promise<SwapDebugInfo> {
  const res = await post('/swap/enable', { sizeGb })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to enable swap' }))
    throw new Error(data.error || 'Failed to enable swap')
  }
  return res.json()
}

export async function disableManagedSwap(): Promise<SwapDebugInfo> {
  const res = await post('/swap/disable')
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to disable swap' }))
    throw new Error(data.error || 'Failed to disable swap')
  }
  return res.json()
}

export async function fetchSwapMetrics(): Promise<SwapMetricsInfo> {
  const res = await get('/swap/metrics')
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to fetch swap metrics' }))
    throw new Error(data.error || 'Failed to fetch swap metrics')
  }
  return res.json()
}

// ─── Python debug ──────────────────────────────────────

export interface PythonDebugInfo {
  installed: boolean
  version: string | null
  path: string | null
  binary: string | null
  pip_installed: boolean
  pip_version: string | null
  pip_path: string | null
  venv_available: boolean
  ppa_added: boolean
}

export async function fetchPythonDebug(): Promise<PythonDebugInfo> {
  const res = await get('/debug/python')
  if (!res.ok) throw new Error('Failed to fetch Python debug')
  return res.json()
}

// ─── Rust debug ────────────────────────────────────────

export interface RustDebugInfo {
  installed: boolean
  version: string | null
  path: string | null
  cargo_installed: boolean
  cargo_version: string | null
  cargo_path: string | null
  rustup_installed: boolean
  rustup_version: string | null
}

export async function fetchRustDebug(): Promise<RustDebugInfo> {
  const res = await get('/debug/rust')
  if (!res.ok) throw new Error('Failed to fetch Rust debug')
  return res.json()
}

// ─── Go debug ──────────────────────────────────────────

export interface GoDebugInfo {
  installed: boolean
  version: string | null
  path: string | null
  gopath: string | null
  goroot: string | null
}

export async function fetchGoDebug(): Promise<GoDebugInfo> {
  const res = await get('/debug/go')
  if (!res.ok) throw new Error('Failed to fetch Go debug')
  return res.json()
}

// ─── TypeScript debug ──────────────────────────────────

export interface TypeScriptDebugInfo {
  installed: boolean
  version: string | null
  path: string | null
  ts_node_installed: boolean
  ts_node_version: string | null
}

export async function fetchTypeScriptDebug(): Promise<TypeScriptDebugInfo> {
  const res = await get('/debug/typescript')
  if (!res.ok) throw new Error('Failed to fetch TypeScript debug')
  return res.json()
}

// ─── Network / WebSocket debug ──────────────────────────

export interface WsConnectionEvent {
  type: 'connect' | 'disconnect' | 'auth_rejected' | 'stale_closed' | 'message_in'
  deviceId: string
  timestamp: number
  detail?: string
}

export interface WsConnectedClient {
  deviceId: string
  connectedAt: number
  connectedDuration: number
  messageCount: number
}

export interface NetworkDebugInfo {
  websocket: {
    connectedClients: WsConnectedClient[]
    recentEvents: WsConnectionEvent[]
    serverUptime: number
  }
  server: {
    port: number
    uptime: number
  }
}

export async function fetchNetworkDebug(): Promise<NetworkDebugInfo> {
  const res = await get('/debug/network')
  if (!res.ok) throw new Error('Failed to fetch network debug')
  return res.json()
}

export interface RepoSummary {
  repoName: string
  repoPath: string
  branchName: string
}

export interface RepoEntry {
  name: string
  path: string
  type: 'file' | 'dir'
}

export interface RepoListResponse {
  base: string
  path: string
  entries: RepoEntry[]
}

export interface RepoSearchMatch {
  path: string
  line_number: number
  text: string
}

export interface RepoSearchResponse {
  base: string
  query: string
  path: string
  results: RepoSearchMatch[]
}

export interface RepoFileRead {
  path: string
  content: string
  size: number
}

export interface ConsoleBrowserSession {
  session_id: string
  target_url: string
  proxied_url: string
}

export async function fetchRepoSummary(): Promise<RepoSummary> {
  const res = await get('/repo/summary')
  if (!res.ok) throw new Error('Failed to fetch repo summary')
  return res.json()
}

export async function fetchRepoList(path = '.'): Promise<RepoListResponse> {
  const res = await get(`/repo/list?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error('Failed to list repo files')
  return res.json()
}

export async function fetchRepoSearch(query: string, path = '.'): Promise<RepoSearchResponse> {
  const res = await get(`/repo/search?q=${encodeURIComponent(query)}&path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error('Failed to search repo files')
  return res.json()
}

export async function fetchRepoFile(path: string): Promise<RepoFileRead> {
  const res = await get(`/repo/read?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error('Failed to read repo file')
  return res.json()
}

export async function createRepoPreviewSession(targetUrl: string): Promise<ConsoleBrowserSession> {
  const res = await post('/repo/preview-session', { target_url: targetUrl })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to create preview session' }))
    throw new Error(data.error || 'Failed to create preview session')
  }
  return res.json()
}

// ─── Domain / HTTPS settings ───────────────────────────

export interface DomainSettings {
  domain: string | null
  httpsEnabled: boolean
  serverIp: string
}

export async function fetchDomainSettings(): Promise<DomainSettings> {
  const res = await get('/settings/domain')
  if (!res.ok) throw new Error('Failed to fetch domain settings')
  return res.json()
}

export async function updateDomain(domain: string): Promise<{ ok: boolean; url: string }> {
  const res = await post('/settings/domain', { domain })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to update domain' }))
    throw new Error(data.error || 'Failed to update domain')
  }
  return res.json()
}

// ─── Agent update ─────────────────────────────────────

export async function triggerUpdate(version?: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${BASE}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(version ? { version } : {}),
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Update failed' }))
    throw new Error(data.error || 'Update failed')
  }
  return res.json()
}

// ─── Passkey ───────────────────────────────────────────

export async function getPasskeyRegistrationOptions(): Promise<{
  options: any
  challengeId: string
}> {
  const res = await post('/passkey/register/options')
  if (!res.ok) throw new Error('Failed to get registration options')
  return res.json()
}

export async function verifyPasskeyRegistration(
  challengeId: string,
  credential: any,
  deviceName?: string,
): Promise<{ verified: boolean; credentialId: string }> {
  const res = await fetch(`${BASE}/passkey/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, credential, deviceName }),
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Registration failed' }))
    throw new Error(data.error || 'Registration failed')
  }
  return res.json()
}

export async function getPasskeyAuthenticationOptions(): Promise<{
  options: any
  challengeId: string
}> {
  const res = await post('/passkey/authenticate/options')
  if (!res.ok) throw new Error('Failed to get authentication options')
  return res.json()
}

export async function verifyPasskeyAuthentication(
  challengeId: string,
  credential: any,
): Promise<{ verified: boolean }> {
  const res = await fetch(`${BASE}/passkey/authenticate/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, credential }),
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Authentication failed' }))
    throw new Error(data.error || 'Authentication failed')
  }
  return res.json()
}

export interface PasskeyCredential {
  id: string
  deviceName: string | null
  credentialDeviceType: string | null
  credentialBackedUp: boolean
  createdAt: string | null
  lastUsedAt: string | null
}

export async function listPasskeys(): Promise<PasskeyCredential[]> {
  const res = await get('/passkey/credentials')
  if (!res.ok) throw new Error('Failed to list passkeys')
  const data = await res.json() as { credentials: PasskeyCredential[] }
  return data.credentials
}

export async function removePasskey(id: string): Promise<void> {
  const res = await del(`/passkey/credentials/${id}`)
  if (!res.ok) throw new Error('Failed to remove passkey')
}

// ─── Env Vars ──────────────────────────────────────────────────────────────────

export interface EnvVar {
  id: string
  projectPath: string
  key: string
  value: string | null
  comment: string | null
  isSecret: boolean
  isMultiline: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export async function fetchConsoleEnvVars(projectPath: string): Promise<EnvVar[]> {
  const res = await get(`/envs?projectPath=${encodeURIComponent(projectPath)}`)
  if (!res.ok) throw new Error('Failed to fetch env vars')
  const data = await res.json() as { envVars: EnvVar[] }
  return data.envVars
}

export async function createConsoleEnvVar(input: {
  projectPath: string
  key: string
  value?: string | null
  comment?: string | null
  isSecret?: boolean
  isMultiline?: boolean
}): Promise<EnvVar> {
  const res = await post('/envs', input)
  if (!res.ok) throw new Error(await readError(res, 'Failed to create env var'))
  return res.json() as Promise<EnvVar>
}

export async function updateConsoleEnvVar(id: string, data: {
  key?: string
  value?: string | null
  comment?: string | null
  isSecret?: boolean
  isMultiline?: boolean
  order?: number
}): Promise<EnvVar> {
  const res = await patch(`/envs/${id}`, data)
  if (!res.ok) throw new Error(await readError(res, 'Failed to update env var'))
  return res.json() as Promise<EnvVar>
}

export async function deleteConsoleEnvVar(id: string): Promise<void> {
  const res = await del(`/envs/${id}`)
  if (!res.ok) throw new Error('Failed to delete env var')
}

export async function bulkUpsertConsoleEnvVars(projectPath: string, data: {
  key: string
  value?: string | null
  comment?: string | null
  isSecret?: boolean
  isMultiline?: boolean
}[]): Promise<EnvVar[]> {
  const res = await patch('/envs/bulk', { projectPath, data })
  if (!res.ok) throw new Error(await readError(res, 'Failed to import env vars'))
  const result = await res.json() as { envVars: EnvVar[] }
  return result.envVars
}
