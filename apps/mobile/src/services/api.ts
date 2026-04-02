import { generateDeviceKeypair } from './crypto'
import { buildPocketDevAuthorizationHeader, normalizePairResponse, type PairResponse } from './auth'
import { saveServer } from './storage'
import { Platform } from 'react-native'
import type {
  ContainerLogsRequest,
  ContainerLogsSnapshot,
  ContainerSummary,
  FileTreeResponse,
  FileReadResponse,
  ServerCapabilities,
  GitSummary,
  GitFileChange,
  GitDiffResponse,
  GitCommitEntry,
  GitBranchEntry,
  GitMutationResult,
  GitErrorResponse,
  ServerActionsSummary,
  ServerPortEntry,
  ServerNetworkEntry,
  ServerErrorEntry,
  ServerActionDefinition,
  ServerActionResult,
  PlanEntry,
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

export function buildWsUrl(ip: string, port: number): string {
  return `ws://${ip}:${port}/PocketDev/ws`
}

export function buildTerminalWsUrl(ip: string, port: number): string {
  return `ws://${ip}:${port}/PocketDev/ws/terminal`
}

export async function fetchPrerequisites(ip: string, port: number) {
  const response = await fetch(apiUrl(ip, port, '/prerequisites'), {
    headers: {
      Authorization: await buildPocketDevAuthorizationHeader(),
    },
  })
  if (!response.ok) throw new Error(`Failed to fetch prerequisites (${response.status})`)
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
