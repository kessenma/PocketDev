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
  GitSshStatus,
  GitSshKeyResult,
  GitConfigureResult,
  GitTestConnectionResult,
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
  BrowserSessionCreateResult,
  PythonSetupStatus,
  PkgManagerStatus,
  PkgInstallTool,
  PkgInstallResult,
} from '@pocketdev/shared/types'

function apiUrl(ip: string, port: number, path: string): string {
  return `http://${ip}:${port}/PocketDev/api${path}`
}

export async function pairWithServer(
  ip: string,
  port: number,
  code: string,
): Promise<PairResponse> {
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
  saveServer(ip, port, data.deviceId)
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

export function buildWsUrl(ip: string, port: number): string {
  return `ws://${ip}:${port}/PocketDev/ws`
}

export function buildTerminalWsUrl(ip: string, port: number): string {
  return `ws://${ip}:${port}/PocketDev/ws/terminal`
}

export function browserSessionUrl(ip: string, port: number, proxiedPath: string): string {
  return `http://${ip}:${port}${proxiedPath}`
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

export async function fetchGitSshStatus(ip: string, port: number): Promise<GitSshStatus> {
  const response = await fetch(apiUrl(ip, port, '/git-setup/ssh-status'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to fetch git SSH status (${response.status})`)
  return response.json() as Promise<GitSshStatus>
}

export async function postGenerateSshKey(ip: string, port: number, overwrite = false): Promise<GitSshKeyResult> {
  const response = await fetch(apiUrl(ip, port, '/git-setup/generate-key'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
    body: JSON.stringify({ overwrite }),
  })
  if (!response.ok) throw new Error(`Failed to generate SSH key (${response.status})`)
  return response.json() as Promise<GitSshKeyResult>
}

export async function fetchGitPublicKey(ip: string, port: number): Promise<string | null> {
  const response = await fetch(apiUrl(ip, port, '/git-setup/public-key'), {
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Failed to fetch public key (${response.status})`)
  const data = (await response.json()) as { public_key: string }
  return data.public_key
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

export async function postTestGitConnection(ip: string, port: number): Promise<GitTestConnectionResult> {
  const response = await fetch(apiUrl(ip, port, '/git-setup/test-connection'), {
    method: 'POST',
    headers: { Authorization: await buildPocketDevAuthorizationHeader() },
  })
  if (!response.ok) throw new Error(`Failed to test git connection (${response.status})`)
  return response.json() as Promise<GitTestConnectionResult>
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
