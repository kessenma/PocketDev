import { generateDeviceKeypair } from './crypto'
import { buildPocketDevAuthorizationHeader, normalizePairResponse, type PairResponse } from './auth'
import { saveServer } from './storage'
import { Platform } from 'react-native'
import type {
  ContainerLogsRequest,
  ContainerLogsSnapshot,
  ContainerSummary,
  DirectoryEntriesResponse,
  FileTreeResponse,
  FileReadResponse,
  FileSearchResponse,
  ServerCapabilities,
  GitSummary,
  GitFileChange,
  GitDiffResponse,
  GitCommitEntry,
  GitBranchEntry,
  GitMutationResult,
  GitErrorResponse,
  GitDetailedCommitEntry,
  GitDetailedHistoryResponse,
  GitHistorySyncStatus,
  GitHistorySyncResult,
  GitStashEntry,
  GitMergeState,
  ListProjectsResponse,
  ProjectMutationResult,
  ProjectSummary,
  ServerActionsSummary,
  ServerPortEntry,
  ServerNetworkEntry,
  ServerErrorEntry,
  ServerActionDefinition,
  ServerActionResult,
  PlanEntry,
  GitSetupStatus,
  GitConfigureResult,
  GitHubCliAuthResult,
  GitHubCliAuthStartResult,
  GitHubCliAuthSessionStatus,
  ClaudeSetupStatus,
  ClaudeAuthSessionStatus,
  CodexSetupStatus,
  CodexInstallResult,
  CodexAuthStartResult,
  CodexAuthSessionStatus,
  CodexAuthSubmitResult,
  CodexAuthCallbackReplayResult,
  CodexAuthMode,
  CopilotSetupStatus,
  CopilotInstallResult,
  CopilotTrustStartResult,
  CopilotTrustSessionStatus,
  OpenCodeSetupStatus,
  OpenCodeInstallResult,
  OpenCodeProviderAuthStatus,
  OpenAIOpenCodeAuthMethod,
  OpenAIOpenCodeAuthStartResult,
  OpenAIOpenCodeAuthSessionStatus,
  CopilotOpenCodeAuthStartResult,
  CopilotOpenCodeAuthSessionStatus,
  MinimaxSetupStatus,
  MinimaxConfigureRequest,
  MinimaxConfigureResult,
  BrowserSessionCreateResult,
  PythonSetupStatus,
  RustSetupStatus,
  GoSetupStatus,
  TypeScriptSetupStatus,
  PkgManagerStatus,
  PkgInstallTool,
  PkgInstallResult,
  DockerSetupStatus,
  ScriptsResponse,
  ListEnvVarsResponse,
  CreateEnvVarRequest,
  UpdateEnvVarRequest,
  BulkUpsertEnvVarsRequest,
  BulkUpsertEnvVarsResponse,
} from '@pocketdev/shared/types'

// Module-level HTTPS flag — set once when connection is established
let _useSecure = false
export function setSecureMode(secure: boolean) { _useSecure = secure }

function apiUrl(ip: string, port: number, path: string): string {
  const protocol = _useSecure ? 'https' : 'http'
  return `${protocol}://${ip}:${port}/PocketDev/api${path}`
}

export async function pairWithServer(
  ip: string,
  port: number,
  code: string,
  secure = false,
): Promise<PairResponse> {
  // Set secure mode before making the pairing request
  setSecureMode(secure)

  // Generate a fresh keypair for this device
  const keypair = generateDeviceKeypair()
  const publicKeyHex = Buffer.from(keypair.publicKey).toString('hex')

  const response = await fetch(apiUrl(ip, port, '/pair'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      publicKey: publicKeyHex,
      deviceName: `${Platform.OS} device`,
      platform: Platform.OS,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Pairing failed (${response.status})`)
  }

  const data = normalizePairResponse(await response.json())
  saveServer(ip, port, data.deviceId, secure)
  return data
}

export async function unpairFromServer(ip: string, port: number): Promise<void> {
  try {
    await fetch(apiUrl(ip, port, '/unpair'), {
      method: 'DELETE',
      headers: { Authorization: await buildPocketDevAuthorizationHeader() },
    })
  } catch {
    // Best-effort — server may be unreachable
  }
}

export async function registerPushToken(
  ip: string,
  port: number,
  deviceId: string,
  pushToken: string,
  environment: 'development' | 'production',
): Promise<void> {
  const res = await fetch(apiUrl(ip, port, `/devices/${deviceId}/push-token`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ pushToken, environment }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => res.status.toString())
    throw new Error(`Push token registration failed: ${body}`)
  }
}

export async function deregisterPushToken(
  ip: string,
  port: number,
  deviceId: string,
): Promise<void> {
  try {
    await fetch(apiUrl(ip, port, `/devices/${deviceId}/push-token`), {
      method: 'DELETE',
      headers: { Authorization: await buildPocketDevAuthorizationHeader() },
    })
  } catch {
    // Best-effort
  }
}

export function buildWsUrl(ip: string, port: number): string {
  const protocol = _useSecure ? 'wss' : 'ws'
  return `${protocol}://${ip}:${port}/PocketDev/ws`
}

export function buildTerminalWsUrl(ip: string, port: number): string {
  const protocol = _useSecure ? 'wss' : 'ws'
  return `${protocol}://${ip}:${port}/PocketDev/ws/terminal`
}

export function browserSessionUrl(ip: string, port: number, proxiedPath: string): string {
  const protocol = _useSecure ? 'https' : 'http'
  return `${protocol}://${ip}:${port}${proxiedPath}`
}

export async function fetchPrerequisites(ip: string, port: number) {
  const authHeader = await buildPocketDevAuthorizationHeader()
  console.log('[api] fetchPrerequisites:', { ip, port, authHeaderPrefix: authHeader.slice(0, 30) })

  const response = await fetch(apiUrl(ip, port, '/prerequisites'), {
    headers: {
      Authorization: authHeader,
    },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.warn('[api] fetchPrerequisites failed:', { status: response.status, body })
    throw new Error(`Failed to fetch prerequisites (${response.status})`)
  }
  return response.json()
}

export async function fetchTaskList(ip: string, port: number) {
  const response = await fetch(apiUrl(ip, port, '/tasks'), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to fetch tasks (${response.status})`)
  return response.json()
}

export async function fetchTaskTurns(
  ip: string,
  port: number,
  taskId: string,
): Promise<{ taskId: string; turns: Array<{ id: string; task_id: string; turn_number: number; role: string; content: string; created_at: string }> }> {
  const response = await fetch(apiUrl(ip, port, `/tasks/${taskId}/turns`), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to fetch task turns (${response.status})`)
  return response.json()
}

export async function fetchTaskLogs(
  ip: string,
  port: number,
  taskId: string,
  limit = 500,
): Promise<{ taskId: string; logs: Array<{ stream: string; line: string; timestamp: string }>; total: number }> {
  const response = await fetch(apiUrl(ip, port, `/tasks/${taskId}/logs?limit=${limit}`), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to fetch task logs (${response.status})`)
  return response.json()
}

export async function fetchProjects(ip: string, port: number): Promise<ListProjectsResponse> {
  const response = await fetch(apiUrl(ip, port, '/projects'), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to fetch projects (${response.status})`)
  return response.json() as Promise<ListProjectsResponse>
}

export async function postSelectProject(
  ip: string,
  port: number,
  projectId: string,
  pullLatest = false,
): Promise<ProjectMutationResult> {
  const response = await fetch(apiUrl(ip, port, '/projects/select'), {
    method: 'POST',
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectId, pullLatest }),
  })
  if (!response.ok) throw new Error(`Failed to select project (${response.status})`)
  return response.json() as Promise<ProjectMutationResult>
}

export async function postCloneProject(
  ip: string,
  port: number,
  projectId: string,
  branchMode: 'default' | 'new',
  newBranchName?: string,
): Promise<ProjectMutationResult> {
  const response = await fetch(apiUrl(ip, port, '/projects/clone'), {
    method: 'POST',
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectId, branchMode, newBranchName }),
  })
  if (!response.ok) throw new Error(`Failed to clone project (${response.status})`)
  return response.json() as Promise<ProjectMutationResult>
}

export async function postCreateProjectBranch(
  ip: string,
  port: number,
  projectId: string,
  branchName: string,
): Promise<ProjectMutationResult> {
  const response = await fetch(apiUrl(ip, port, '/projects/branch'), {
    method: 'POST',
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectId, branchName }),
  })
  if (!response.ok) throw new Error(`Failed to create project branch (${response.status})`)
  return response.json() as Promise<ProjectMutationResult>
}

export async function fetchContainers(ip: string, port: number): Promise<ContainerSummary[]> {
  const response = await fetch(apiUrl(ip, port, '/containers'), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch containers (${response.status})`)
  }

  const data = (await response.json()) as { containers: ContainerSummary[] }
  return data.containers
}

export async function fetchContainerLogs(
  ip: string,
  port: number,
  request: ContainerLogsRequest,
): Promise<ContainerLogsSnapshot> {
  const query = new URLSearchParams({
    line_count: String(request.line_count),
    direction: request.direction,
    filter: request.filter,
  })

  const response = await fetch(
    apiUrl(ip, port, `/containers/${encodeURIComponent(request.container_id)}/logs?${query.toString()}`),
    {
      headers: {
        Authorization: await buildPocketDevAuthorizationHeader(),
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch container logs (${response.status})`)
  }

  return response.json() as Promise<ContainerLogsSnapshot>
}

export async function fetchFileTree(
  ip: string,
  port: number,
  path = '.',
  depth = 3,
): Promise<FileTreeResponse> {
  const query = new URLSearchParams({ path, depth: String(depth) })
  const response = await fetch(apiUrl(ip, port, `/files/tree?${query.toString()}`), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to fetch file tree (${response.status})`)
  return response.json() as Promise<FileTreeResponse>
}

export async function listDirectory(
  ip: string,
  port: number,
  path = '.',
): Promise<DirectoryEntriesResponse> {
  const query = new URLSearchParams({ path })
  const response = await fetch(apiUrl(ip, port, `/files/list?${query.toString()}`), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to list directory (${response.status})`)
  return response.json() as Promise<DirectoryEntriesResponse>
}

export async function fetchFileContent(
  ip: string,
  port: number,
  path: string,
): Promise<FileReadResponse> {
  const query = new URLSearchParams({ path })
  const response = await fetch(apiUrl(ip, port, `/files/read?${query.toString()}`), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to read file (${response.status})`)
  return response.json() as Promise<FileReadResponse>
}

export async function fetchFilePreviews(
  ip: string,
  port: number,
  paths: string[],
  chunkSize = 20,
): Promise<Map<string, string>> {
  const previews = new Map<string, string>()
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize)
    const results = await Promise.allSettled(
      chunk.map(async (path) => {
        const res = await fetchFileContent(ip, port, path)
        const snippet = res.content
          .substring(0, 250)
          .replace(/[^\x20-\x7E\n\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        return { path, snippet }
      }),
    )
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.snippet) {
        previews.set(result.value.path, result.value.snippet)
      }
    }
  }
  return previews
}

export async function searchFiles(
  ip: string,
  port: number,
  query: string,
  path = '.',
): Promise<FileSearchResponse> {
  const params = new URLSearchParams({ q: query, path })
  const response = await fetch(apiUrl(ip, port, `/files/search?${params.toString()}`), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to search files (${response.status})`)
  return response.json() as Promise<FileSearchResponse>
}

export async function fetchCapabilities(
  ip: string,
  port: number,
): Promise<ServerCapabilities> {
  const response = await fetch(apiUrl(ip, port, '/capabilities'), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to fetch capabilities (${response.status})`)
  return response.json() as Promise<ServerCapabilities>
}

// ─── Git ─────────────────────────────────────────────────

export async function fetchGitSummary(ip: string, port: number): Promise<GitSummary> {
  const response = await fetch(apiUrl(ip, port, '/git/summary'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch git summary (${response.status})`)
  return response.json() as Promise<GitSummary>
}

export async function fetchGitChanges(ip: string, port: number): Promise<GitFileChange[]> {
  const response = await fetch(apiUrl(ip, port, '/git/changes'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch git changes (${response.status})`)
  const data = (await response.json()) as { changes: GitFileChange[] }
  return data.changes
}

export async function fetchGitDiff(
  ip: string,
  port: number,
  path: string,
  staged: boolean,
): Promise<GitDiffResponse> {
  const query = new URLSearchParams({ path, staged: staged ? '1' : '0' })
  const response = await fetch(apiUrl(ip, port, `/git/diff?${query.toString()}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch diff (${response.status})`)
  return response.json() as Promise<GitDiffResponse>
}

export async function fetchGitHistory(ip: string, port: number, limit = 20): Promise<GitCommitEntry[]> {
  const query = new URLSearchParams({ limit: String(limit) })
  const response = await fetch(apiUrl(ip, port, `/git/history?${query.toString()}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch git history (${response.status})`)
  const data = (await response.json()) as { commits: GitCommitEntry[] }
  return data.commits
}

export async function fetchGitBranches(ip: string, port: number): Promise<GitBranchEntry[]> {
  const response = await fetch(apiUrl(ip, port, '/git/branches'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch branches (${response.status})`)
  const data = (await response.json()) as { branches: GitBranchEntry[] }
  return data.branches
}

async function postGitMutation(
  ip: string,
  port: number,
  path: string,
  body?: Record<string, string>,
): Promise<GitMutationResult | GitErrorResponse> {
  const response = await fetch(apiUrl(ip, port, `/git/${path}`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return response.json() as Promise<GitMutationResult | GitErrorResponse>
}

export async function postGitCheckout(ip: string, port: number, branchName: string) {
  return postGitMutation(ip, port, 'checkout', { branchName })
}

export async function postGitCommit(ip: string, port: number, message: string) {
  return postGitMutation(ip, port, 'commit', { message })
}

export async function postGitPush(ip: string, port: number) {
  return postGitMutation(ip, port, 'push')
}

export async function postGitPull(ip: string, port: number) {
  return postGitMutation(ip, port, 'pull')
}

// ─── Stash ─────────────────────────────────────────────

export async function fetchGitStashList(ip: string, port: number): Promise<GitStashEntry[]> {
  const response = await fetch(apiUrl(ip, port, '/git/stash'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch stash list (${response.status})`)
  const data = (await response.json()) as { stashes: GitStashEntry[] }
  return data.stashes
}

export async function postGitStash(
  ip: string,
  port: number,
  message?: string,
): Promise<{ ok: true } | GitErrorResponse> {
  const response = await fetch(apiUrl(ip, port, '/git/stash'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ message }),
  })
  return response.json() as Promise<{ ok: true } | GitErrorResponse>
}

export async function postGitStashPop(
  ip: string,
  port: number,
  index: number,
): Promise<GitMutationResult | GitErrorResponse> {
  return postGitMutation(ip, port, `stash/${index}/pop`)
}

export async function postGitStashApply(
  ip: string,
  port: number,
  index: number,
): Promise<GitMutationResult | GitErrorResponse> {
  return postGitMutation(ip, port, `stash/${index}/apply`)
}

export async function deleteGitStash(ip: string, port: number, index: number): Promise<void> {
  await fetch(apiUrl(ip, port, `/git/stash/${index}`), {
    method: 'DELETE',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
}

// ─── Merge state ───────────────────────────────────────

export async function fetchGitMergeState(ip: string, port: number): Promise<GitMergeState> {
  const response = await fetch(apiUrl(ip, port, '/git/merge/state'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch merge state (${response.status})`)
  return response.json() as Promise<GitMergeState>
}

export async function postGitMergeAbort(
  ip: string,
  port: number,
): Promise<GitMutationResult | GitErrorResponse> {
  return postGitMutation(ip, port, 'merge/abort')
}

// ─── Repo History ──────────────────────────────────────

export async function fetchDetailedHistory(
  ip: string,
  port: number,
  limit = 50,
  offset = 0,
): Promise<GitDetailedHistoryResponse> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const response = await fetch(apiUrl(ip, port, `/git/history/detailed?${query.toString()}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch detailed history (${response.status})`)
  return response.json() as Promise<GitDetailedHistoryResponse>
}

export async function fetchFileHistory(
  ip: string,
  port: number,
  path: string,
  limit = 20,
): Promise<GitDetailedCommitEntry[]> {
  const query = new URLSearchParams({ path, limit: String(limit) })
  const response = await fetch(apiUrl(ip, port, `/git/history/file?${query.toString()}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch file history (${response.status})`)
  const data = (await response.json()) as { commits: GitDetailedCommitEntry[] }
  return data.commits
}

export async function fetchTaskCommits(
  ip: string,
  port: number,
  taskId: string,
): Promise<GitDetailedCommitEntry[]> {
  const response = await fetch(apiUrl(ip, port, `/git/history/task/${taskId}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch task commits (${response.status})`)
  const data = (await response.json()) as { commits: GitDetailedCommitEntry[] }
  return data.commits
}

export async function triggerHistorySync(
  ip: string,
  port: number,
): Promise<GitHistorySyncResult> {
  const response = await fetch(apiUrl(ip, port, '/git/history/sync'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to trigger history sync (${response.status})`)
  return response.json() as Promise<GitHistorySyncResult>
}

export async function fetchHistorySyncStatus(
  ip: string,
  port: number,
): Promise<GitHistorySyncStatus> {
  const response = await fetch(apiUrl(ip, port, '/git/history/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch sync status (${response.status})`)
  return response.json() as Promise<GitHistorySyncStatus>
}

// ─── Server Actions ──────────────────────────────────────

export async function fetchServerSummary(ip: string, port: number): Promise<ServerActionsSummary> {
  const response = await fetch(apiUrl(ip, port, '/server-actions/summary'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch server summary (${response.status})`)
  return response.json() as Promise<ServerActionsSummary>
}

export async function fetchServerPorts(ip: string, port: number): Promise<ServerPortEntry[]> {
  const response = await fetch(apiUrl(ip, port, '/server-actions/ports'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch ports (${response.status})`)
  const data = (await response.json()) as { ports: ServerPortEntry[] }
  return data.ports
}

export async function fetchServerNetwork(ip: string, port: number): Promise<ServerNetworkEntry[]> {
  const response = await fetch(apiUrl(ip, port, '/server-actions/network'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch network stats (${response.status})`)
  const data = (await response.json()) as { entries: ServerNetworkEntry[] }
  return data.entries
}

export async function fetchServerErrors(ip: string, port: number): Promise<ServerErrorEntry[]> {
  const response = await fetch(apiUrl(ip, port, '/server-actions/errors'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch errors (${response.status})`)
  const data = (await response.json()) as { errors: ServerErrorEntry[] }
  return data.errors
}

export async function fetchServerActions(ip: string, port: number): Promise<ServerActionDefinition[]> {
  const response = await fetch(apiUrl(ip, port, '/server-actions/actions'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch actions (${response.status})`)
  const data = (await response.json()) as { actions: ServerActionDefinition[] }
  return data.actions
}

export async function runServerAction(ip: string, port: number, actionId: string): Promise<ServerActionResult> {
  const response = await fetch(apiUrl(ip, port, `/server-actions/actions/${encodeURIComponent(actionId)}/run`), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to run action (${response.status})`)
  return response.json() as Promise<ServerActionResult>
}

// ─── Scripts ────────────────────────────────────────────

export async function fetchScripts(ip: string, port: number): Promise<ScriptsResponse> {
  const response = await fetch(apiUrl(ip, port, '/scripts/'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch scripts (${response.status})`)
  return response.json() as Promise<ScriptsResponse>
}

// ─── Plans ───────────────────────────────────────────────

export async function fetchActivePlan(ip: string, port: number): Promise<PlanEntry | null> {
  const response = await fetch(apiUrl(ip, port, '/plans/active'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch active plan (${response.status})`)
  const data = (await response.json()) as { plan: PlanEntry | null }
  return data.plan
}

export async function fetchPlanHistory(ip: string, port: number, limit = 20): Promise<PlanEntry[]> {
  const query = new URLSearchParams({ limit: String(limit) })
  const response = await fetch(apiUrl(ip, port, `/plans/history?${query.toString()}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch plan history (${response.status})`)
  const data = (await response.json()) as { plans: PlanEntry[] }
  return data.plans
}

// ─── Git Setup ──────────────────────────────────────────

export async function fetchGitSetupStatus(ip: string, port: number): Promise<GitSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/git-setup/setup-status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch git setup status (${response.status})`)
  return response.json() as Promise<GitSetupStatus>
}

export async function postConfigureGitIdentity(
  ip: string,
  port: number,
  name: string,
  email: string,
): Promise<GitConfigureResult> {
  const response = await fetch(apiUrl(ip, port, '/git-setup/configure-identity'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ name, email }),
  })
  if (!response.ok) throw new Error(`Failed to configure git identity (${response.status})`)
  return response.json() as Promise<GitConfigureResult>
}

export async function postConfigureGitHubCliToken(
  ip: string,
  port: number,
  token: string,
): Promise<GitHubCliAuthResult> {
  const response = await fetch(apiUrl(ip, port, '/git-setup/github-cli/auth-token'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ token }),
  })
  if (!response.ok) throw new Error(`Failed to configure GitHub CLI (${response.status})`)
  return response.json() as Promise<GitHubCliAuthResult>
}

export async function postStartGitHubCliAuth(ip: string, port: number): Promise<GitHubCliAuthStartResult> {
  const response = await fetch(apiUrl(ip, port, '/git-setup/github-cli/auth/start'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to start GitHub CLI auth (${response.status})`)
  return response.json() as Promise<GitHubCliAuthStartResult>
}

export async function fetchGitHubCliAuthStatus(
  ip: string,
  port: number,
  sessionId: string,
): Promise<GitHubCliAuthSessionStatus> {
  const response = await fetch(apiUrl(ip, port, `/git-setup/github-cli/auth/status/${encodeURIComponent(sessionId)}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch GitHub CLI auth status (${response.status})`)
  return response.json() as Promise<GitHubCliAuthSessionStatus>
}

// ─── Claude CLI Setup ──────────────────────────────────────────────

export async function fetchClaudeSetupStatus(ip: string, port: number): Promise<ClaudeSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/claude-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Claude CLI status (${response.status})`)
  return response.json() as Promise<ClaudeSetupStatus>
}

export async function postVerifyClaudeAuth(ip: string, port: number): Promise<ClaudeSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/claude-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify Claude auth (${response.status})`)
  return response.json() as Promise<ClaudeSetupStatus>
}

export async function postStartClaudeAuth(ip: string, port: number): Promise<ClaudeAuthSessionStatus> {
  const response = await fetch(apiUrl(ip, port, '/claude-setup/auth/start'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to start Claude auth (${response.status})`)
  return response.json() as Promise<ClaudeAuthSessionStatus>
}

export async function fetchClaudeAuthStatus(ip: string, port: number, sessionId: string): Promise<ClaudeAuthSessionStatus> {
  const response = await fetch(apiUrl(ip, port, `/claude-setup/auth/status/${sessionId}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Claude auth status (${response.status})`)
  return response.json() as Promise<ClaudeAuthSessionStatus>
}

export async function postSubmitClaudeAuth(ip: string, port: number, sessionId: string, code: string): Promise<ClaudeAuthSessionStatus> {
  const response = await fetch(apiUrl(ip, port, `/claude-setup/auth/submit/${sessionId}`), {
    method: 'POST',
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) throw new Error(`Failed to submit Claude auth code (${response.status})`)
  return response.json() as Promise<ClaudeAuthSessionStatus>
}

// ─── Codex CLI Setup ──────────────────────────────────────────────

export async function fetchCodexSetupStatus(ip: string, port: number): Promise<CodexSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/codex-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Codex CLI status (${response.status})`)
  return response.json() as Promise<CodexSetupStatus>
}

export async function postInstallCodex(ip: string, port: number): Promise<CodexInstallResult> {
  const response = await fetch(apiUrl(ip, port, '/codex-setup/install'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to install Codex CLI (${response.status})`)
  return response.json() as Promise<CodexInstallResult>
}

export async function postStartCodexAuth(
  ip: string,
  port: number,
  mode: CodexAuthMode,
): Promise<CodexAuthStartResult> {
  const response = await fetch(apiUrl(ip, port, '/codex-setup/auth/start'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ mode }),
  })
  if (!response.ok) throw new Error(`Failed to start Codex auth (${response.status})`)
  return response.json() as Promise<CodexAuthStartResult>
}

export async function fetchCodexAuthStatus(
  ip: string,
  port: number,
  sessionId: string,
): Promise<CodexAuthSessionStatus> {
  const response = await fetch(apiUrl(ip, port, `/codex-setup/auth/status/${encodeURIComponent(sessionId)}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Codex auth status (${response.status})`)
  return response.json() as Promise<CodexAuthSessionStatus>
}

export async function postSubmitCodexAuth(
  ip: string,
  port: number,
  sessionId: string,
  code: string,
): Promise<CodexAuthSubmitResult> {
  const response = await fetch(apiUrl(ip, port, `/codex-setup/auth/submit/${encodeURIComponent(sessionId)}`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) throw new Error(`Failed to submit Codex auth code (${response.status})`)
  return response.json() as Promise<CodexAuthSubmitResult>
}

export async function postReplayCodexAuthCallback(
  ip: string,
  port: number,
  sessionId: string,
  callbackUrl: string,
): Promise<CodexAuthCallbackReplayResult> {
  const response = await fetch(apiUrl(ip, port, `/codex-setup/auth/callback/${encodeURIComponent(sessionId)}`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ callback_url: callbackUrl }),
  })
  const payload = await response.json() as CodexAuthCallbackReplayResult | { error?: string; attempts?: string[]; session_output_excerpt?: string | null; session_prompt?: string | null }
  if (!response.ok) {
    const message = [
      typeof payload.error === 'string' ? payload.error : `Failed to replay Codex auth callback (${response.status})`,
      Array.isArray(payload.attempts) && payload.attempts.length > 0 ? `Attempts: ${payload.attempts.join(' | ')}` : null,
      payload.session_prompt ? `Prompt: ${payload.session_prompt}` : null,
      payload.session_output_excerpt ? `Output: ${payload.session_output_excerpt}` : null,
    ].filter(Boolean).join('\n')
    throw new Error(message)
  }
  return payload as CodexAuthCallbackReplayResult
}

export async function postCreateBrowserSession(
  ip: string,
  port: number,
  targetUrl: string,
): Promise<BrowserSessionCreateResult> {
  const response = await fetch(apiUrl(ip, port, '/browser/sessions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ target_url: targetUrl }),
  })
  if (!response.ok) throw new Error(`Failed to create browser session (${response.status})`)
  return response.json() as Promise<BrowserSessionCreateResult>
}

export async function postVerifyCodexAuth(ip: string, port: number): Promise<CodexSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/codex-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify Codex auth (${response.status})`)
  return response.json() as Promise<CodexSetupStatus>
}

// ─── OpenCode CLI Setup ────────────────────────────────────────────

export async function fetchOpenCodeSetupStatus(ip: string, port: number): Promise<OpenCodeSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/opencode-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch OpenCode status (${response.status})`)
  return response.json() as Promise<OpenCodeSetupStatus>
}

export async function postInstallOpenCode(ip: string, port: number): Promise<OpenCodeInstallResult> {
  const response = await fetch(apiUrl(ip, port, '/opencode-setup/install'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to install OpenCode CLI (${response.status})`)
  return response.json() as Promise<OpenCodeInstallResult>
}

export async function fetchOpenCodeInstallCommand(ip: string, port: number): Promise<string> {
  const response = await fetch(apiUrl(ip, port, '/opencode-setup/install-command'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch OpenCode install command (${response.status})`)
  const data = await response.json() as { command: string }
  return data.command
}

export async function postVerifyOpenCode(ip: string, port: number): Promise<OpenCodeSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/opencode-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify OpenCode CLI (${response.status})`)
  return response.json() as Promise<OpenCodeSetupStatus>
}

// ─── OpenCode Provider Auth ────────────────────────────────────────

export async function fetchOpenCodeProviderAuthStatus(
  ip: string,
  port: number,
  provider: 'openai' | 'github-copilot',
): Promise<OpenCodeProviderAuthStatus> {
  const response = await fetch(apiUrl(ip, port, `/opencode-setup/provider-auth-status?provider=${encodeURIComponent(provider)}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch provider auth status (${response.status})`)
  return response.json() as Promise<OpenCodeProviderAuthStatus>
}

export async function postStartOpenAIOpenCodeAuth(
  ip: string,
  port: number,
  method: OpenAIOpenCodeAuthMethod,
  apiKey?: string,
): Promise<OpenAIOpenCodeAuthStartResult> {
  const response = await fetch(apiUrl(ip, port, '/opencode-setup/openai-auth/start'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, ...(apiKey ? { api_key: apiKey } : {}) }),
  })
  if (!response.ok) throw new Error(`Failed to start OpenAI auth (${response.status})`)
  return response.json() as Promise<OpenAIOpenCodeAuthStartResult>
}

export async function fetchOpenAIOpenCodeAuthStatus(
  ip: string,
  port: number,
  sessionId: string,
): Promise<OpenAIOpenCodeAuthSessionStatus> {
  const response = await fetch(apiUrl(ip, port, `/opencode-setup/openai-auth/status/${encodeURIComponent(sessionId)}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch OpenAI auth status (${response.status})`)
  return response.json() as Promise<OpenAIOpenCodeAuthSessionStatus>
}

export async function postOpenAIOpenCodeAuthCallback(
  ip: string,
  port: number,
  sessionId: string,
  callbackUrl: string,
): Promise<OpenAIOpenCodeAuthSessionStatus> {
  const response = await fetch(apiUrl(ip, port, `/opencode-setup/openai-auth/callback/${encodeURIComponent(sessionId)}`), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_url: callbackUrl }),
  })
  if (!response.ok) throw new Error(`Failed to submit OpenAI auth callback (${response.status})`)
  return response.json() as Promise<OpenAIOpenCodeAuthSessionStatus>
}

export async function postStartCopilotOpenCodeAuth(
  ip: string,
  port: number,
): Promise<CopilotOpenCodeAuthStartResult> {
  const response = await fetch(apiUrl(ip, port, '/opencode-setup/copilot-auth/start'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to start Copilot auth (${response.status})`)
  return response.json() as Promise<CopilotOpenCodeAuthStartResult>
}

export async function fetchCopilotOpenCodeAuthStatus(
  ip: string,
  port: number,
  sessionId: string,
): Promise<CopilotOpenCodeAuthSessionStatus> {
  const response = await fetch(apiUrl(ip, port, `/opencode-setup/copilot-auth/status/${encodeURIComponent(sessionId)}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Copilot auth status (${response.status})`)
  return response.json() as Promise<CopilotOpenCodeAuthSessionStatus>
}

export async function postVerifyOpenCodeProvider(
  ip: string,
  port: number,
  provider: 'openai' | 'github-copilot',
): Promise<OpenCodeProviderAuthStatus> {
  const response = await fetch(apiUrl(ip, port, '/opencode-setup/verify-provider'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  })
  if (!response.ok) throw new Error(`Failed to verify provider auth (${response.status})`)
  return response.json() as Promise<OpenCodeProviderAuthStatus>
}

// ─── Minimax Provider Setup ────────────────────────────────────────

export async function fetchMinimaxSetupStatus(ip: string, port: number): Promise<MinimaxSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/minimax-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Minimax status (${response.status})`)
  return response.json() as Promise<MinimaxSetupStatus>
}

export async function postConfigureMinimax(
  ip: string,
  port: number,
  apiKey: string,
): Promise<MinimaxConfigureResult> {
  const response = await fetch(apiUrl(ip, port, '/minimax-setup/configure'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey } satisfies MinimaxConfigureRequest),
  })
  if (!response.ok) throw new Error(`Failed to configure Minimax (${response.status})`)
  return response.json() as Promise<MinimaxConfigureResult>
}

export async function postVerifyMinimax(ip: string, port: number): Promise<MinimaxSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/minimax-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify Minimax (${response.status})`)
  return response.json() as Promise<MinimaxSetupStatus>
}

// ─── GitHub Copilot CLI Setup ──────────────────────────────────────

export async function fetchCopilotSetupStatus(ip: string, port: number): Promise<CopilotSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/copilot-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch GitHub Copilot status (${response.status})`)
  return response.json() as Promise<CopilotSetupStatus>
}

export async function postInstallCopilot(ip: string, port: number): Promise<CopilotInstallResult> {
  const response = await fetch(apiUrl(ip, port, '/copilot-setup/install'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to install GitHub Copilot (${response.status})`)
  return response.json() as Promise<CopilotInstallResult>
}

export async function postStartCopilotTrust(ip: string, port: number): Promise<CopilotTrustStartResult> {
  const response = await fetch(apiUrl(ip, port, '/copilot-setup/trust/start'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to start GitHub Copilot trust setup (${response.status})`)
  return response.json() as Promise<CopilotTrustStartResult>
}

export async function fetchCopilotTrustStatus(
  ip: string,
  port: number,
  sessionId: string,
): Promise<CopilotTrustSessionStatus> {
  const response = await fetch(apiUrl(ip, port, `/copilot-setup/trust/status/${encodeURIComponent(sessionId)}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch GitHub Copilot trust status (${response.status})`)
  return response.json() as Promise<CopilotTrustSessionStatus>
}

export async function postVerifyCopilotSetup(ip: string, port: number): Promise<CopilotSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/copilot-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify GitHub Copilot setup (${response.status})`)
  return response.json() as Promise<CopilotSetupStatus>
}

// ─── Python Setup ──────────────────────────────────────────────

export async function fetchPythonSetupStatus(ip: string, port: number): Promise<PythonSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/python-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Python status (${response.status})`)
  return response.json() as Promise<PythonSetupStatus>
}

export async function postVerifyPython(ip: string, port: number): Promise<PythonSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/python-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify Python (${response.status})`)
  return response.json() as Promise<PythonSetupStatus>
}

// ─── Rust Setup ────────────────────────────────────────────────────

export async function fetchRustSetupStatus(ip: string, port: number): Promise<RustSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/rust-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Rust status (${response.status})`)
  return response.json() as Promise<RustSetupStatus>
}

export async function postVerifyRust(ip: string, port: number): Promise<RustSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/rust-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify Rust (${response.status})`)
  return response.json() as Promise<RustSetupStatus>
}

// ─── Go Setup ──────────────────────────────────────────────────────

export async function fetchGoSetupStatus(ip: string, port: number): Promise<GoSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/go-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Go status (${response.status})`)
  return response.json() as Promise<GoSetupStatus>
}

export async function fetchGoInstallCommand(ip: string, port: number): Promise<string> {
  const response = await fetch(apiUrl(ip, port, '/go-setup/install-command'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Go install command (${response.status})`)
  const data = await response.json() as { command: string }
  return data.command
}

export async function postVerifyGo(ip: string, port: number): Promise<GoSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/go-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify Go (${response.status})`)
  return response.json() as Promise<GoSetupStatus>
}

// ─── TypeScript Setup ──────────────────────────────────────────────

export async function fetchTypeScriptSetupStatus(ip: string, port: number): Promise<TypeScriptSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/typescript-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch TypeScript status (${response.status})`)
  return response.json() as Promise<TypeScriptSetupStatus>
}

export async function postVerifyTypeScript(ip: string, port: number): Promise<TypeScriptSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/typescript-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify TypeScript (${response.status})`)
  return response.json() as Promise<TypeScriptSetupStatus>
}

// ─── Package Manager Setup ──────────────────────────────────────────

export async function fetchPkgSetupStatus(ip: string, port: number): Promise<PkgManagerStatus> {
  const response = await fetch(apiUrl(ip, port, '/pkg-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch package manager status (${response.status})`)
  return response.json() as Promise<PkgManagerStatus>
}

export async function postVerifyPkgSetup(ip: string, port: number): Promise<PkgManagerStatus> {
  const response = await fetch(apiUrl(ip, port, '/pkg-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify package managers (${response.status})`)
  return response.json() as Promise<PkgManagerStatus>
}

export async function postInstallPkgTool(
  ip: string,
  port: number,
  tool: PkgInstallTool,
): Promise<PkgInstallResult> {
  const response = await fetch(apiUrl(ip, port, '/pkg-setup/install'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ tool }),
  })
  if (!response.ok) throw new Error(`Failed to install ${tool} (${response.status})`)
  return response.json() as Promise<PkgInstallResult>
}

// ─── Docker Setup ──────────────────────────────────────────────────

export async function fetchDockerSetupStatus(ip: string, port: number): Promise<DockerSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/docker-setup/status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch Docker status (${response.status})`)
  return response.json() as Promise<DockerSetupStatus>
}

export async function postVerifyDocker(ip: string, port: number): Promise<DockerSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/docker-setup/verify'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to verify Docker (${response.status})`)
  return response.json() as Promise<DockerSetupStatus>
}

// ─── Env Vars ──────────────────────────────────────────────────────

export async function fetchEnvVars(
  ip: string,
  port: number,
  projectPath: string,
): Promise<ListEnvVarsResponse> {
  const query = new URLSearchParams({ projectPath })
  const response = await fetch(apiUrl(ip, port, `/envs?${query.toString()}`), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch env vars (${response.status})`)
  return response.json() as Promise<ListEnvVarsResponse>
}

export async function postCreateEnvVar(
  ip: string,
  port: number,
  input: CreateEnvVarRequest,
) {
  const response = await fetch(apiUrl(ip, port, '/envs'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(`Failed to create env var (${response.status})`)
  return response.json()
}

export async function patchEnvVar(
  ip: string,
  port: number,
  id: string,
  patch: UpdateEnvVarRequest,
) {
  const response = await fetch(apiUrl(ip, port, `/envs/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify(patch),
  })
  if (!response.ok) throw new Error(`Failed to update env var (${response.status})`)
  return response.json()
}

export async function deleteEnvVarById(
  ip: string,
  port: number,
  id: string,
): Promise<void> {
  const response = await fetch(apiUrl(ip, port, `/envs/${id}`), {
    method: 'DELETE',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to delete env var (${response.status})`)
}

export async function patchBulkEnvVars(
  ip: string,
  port: number,
  req: BulkUpsertEnvVarsRequest,
): Promise<BulkUpsertEnvVarsResponse> {
  const response = await fetch(apiUrl(ip, port, '/envs/bulk'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify(req),
  })
  if (!response.ok) throw new Error(`Failed to bulk upsert env vars (${response.status})`)
  return response.json() as Promise<BulkUpsertEnvVarsResponse>
}

// ─── Port security / wake ────────────────────────────────────────────────────

export interface LockStatus {
  locked: boolean
  firewallEnabled: boolean
  firewallAvailable: boolean
  autoLockMinutes: number
  wakePort: number
  activeClients: number
}

/** Fetch lock status — unauthenticated, works even when port is locked */
export async function fetchLockStatus(ip: string, port: number): Promise<LockStatus> {
  const protocol = _useSecure ? 'https' : 'http'
  const response = await fetch(`${protocol}://${ip}:${port}/PocketDev/api/lock/status`)
  if (!response.ok) throw new Error(`Failed to fetch lock status (${response.status})`)
  return response.json() as Promise<LockStatus>
}

/** Send a signed wake request to the secondary wake port to unblock the main port */
export async function wakeServer(ip: string, wakePort: number): Promise<boolean> {
  try {
    const response = await fetch(`http://${ip}:${wakePort}/wake`, {
      method: 'POST',
      headers: { Authorization: await buildPocketDevAuthorizationHeader() },
    })
    return response.ok
  } catch {
    return false
  }
}

/** Lock the main port (requires active WS connection / auth) */
export async function lockServer(ip: string, port: number): Promise<void> {
  const response = await fetch(apiUrl(ip, port, '/lock/lock'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to lock server (${response.status})`)
}

/** Unlock the main port (requires active WS connection / auth) */
export async function unlockServer(ip: string, port: number): Promise<void> {
  const response = await fetch(apiUrl(ip, port, '/lock/unlock'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to unlock server (${response.status})`)
}

/**
 * Tell the agent to uninstall itself. The server returns {ok:true} and then
 * tears itself down in a detached systemd transient unit — subsequent
 * requests will fail as the service goes away.
 */
export async function postUninstall(ip: string, port: number): Promise<void> {
  const response = await fetch(apiUrl(ip, port, '/uninstall'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to uninstall (${response.status})`)
}

