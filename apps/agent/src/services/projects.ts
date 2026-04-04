import { basename, join, resolve } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import type { ProjectMutationResult, ProjectSummary, ProjectVisibility } from '@pocketdev/shared/types'
import {
  getConfig,
  getProject,
  getProjectByPath,
  getProjects,
  markProjectUsed,
  setConfig,
  upsertProject,
} from '../db/index.ts'
import { checkSshStatus } from './git-setup.ts'
import { GitServiceError } from './git.ts'

const INITIAL_PROJECT_DIR = resolve(process.env.POCKETDEV_PROJECT_DIR ?? process.env.HOME ?? '/')
const CLONE_ROOT = resolve(process.env.POCKETDEV_REPOS_DIR ?? join(process.env.HOME ?? '/', 'PocketDev', 'repos'))
const MAX_PROJECT_DEBUG_ENTRIES = 40

type ProjectDebugEntry = {
  ts: string
  kind: 'fetch' | 'clone' | 'select' | 'branch'
  message: string
}

const projectDebugLog: ProjectDebugEntry[] = []

function logProjectDebug(kind: ProjectDebugEntry['kind'], message: string) {
  projectDebugLog.unshift({ ts: new Date().toISOString(), kind, message })
  if (projectDebugLog.length > MAX_PROJECT_DEBUG_ENTRIES) {
    projectDebugLog.length = MAX_PROJECT_DEBUG_ENTRIES
  }
}

async function exec(cmd: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const proc = Bun.spawn(['bash', '-lc', cmd], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      HOME: home,
      PATH: process.env.PATH
        ? `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH}`
        : '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    },
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1 }
}

async function hasGhAuth(): Promise<boolean> {
  const whichGh = await exec('which gh')
  if (whichGh.exitCode !== 0 || !whichGh.stdout) return false

  const auth = await exec('gh auth status')
  return auth.exitCode === 0
}

function projectToSummary(
  project: {
    id: string
    name: string
    owner: string | null
    absolutePath?: string
    localPath?: string | null
    remoteUrl: string | null
    defaultBranch: string | null
    updatedAt?: string | null
    lastUpdatedAt?: string | null
    visibility?: ProjectVisibility | null
    source: string
  },
  activeProjectId: string | null,
): ProjectSummary {
  const localPath = project.localPath ?? project.absolutePath ?? null
  return {
    id: project.id,
    name: project.name,
    owner: project.owner,
    remoteUrl: project.remoteUrl,
    localPath,
    isLocal: !!localPath,
    isActive: project.id === activeProjectId,
    needsClone: !localPath,
    defaultBranch: project.defaultBranch,
    lastUpdatedAt: project.lastUpdatedAt ?? project.updatedAt ?? null,
    visibility: project.visibility ?? 'unknown',
    source: project.source as ProjectSummary['source'],
  }
}

function normalizeProjectName(repoName: string): string {
  return repoName.replace(/\.git$/, '')
}

function buildProfileProjectId(owner: string, repo: string): string {
  return `github:${owner}/${repo}`
}

async function getGitMetadata(projectPath: string) {
  const repoName = basename(projectPath)
  const [branch, remote] = await Promise.all([
    exec('git symbolic-ref refs/remotes/origin/HEAD --short 2>/dev/null | sed \'s#^origin/##\'', projectPath),
    exec('git remote get-url origin 2>/dev/null', projectPath),
  ])

  return {
    name: normalizeProjectName(repoName),
    remoteUrl: remote.stdout || null,
    defaultBranch: branch.stdout || null,
  }
}

function parseGitHubOwner(remoteUrl: string | null): string | null {
  if (!remoteUrl) return null
  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/[^/]+(?:\.git)?$/)
  if (httpsMatch) return httpsMatch[1]
  const sshMatch = remoteUrl.match(/github\.com:([^/]+)\/[^/]+(?:\.git)?$/)
  return sshMatch?.[1] ?? null
}

type GithubRepoWire = {
  name: string
  owner: { login: string }
  clone_url: string
  ssh_url: string
  updated_at: string
  default_branch: string
  private: boolean
}

type GithubRepoFetchResult = {
  githubUsername: string | null
  repos: GithubRepoWire[]
  source: 'gh' | 'public_api' | 'none'
  error: string | null
}

async function fetchGithubRepos(githubUsername: string | null): Promise<GithubRepoFetchResult> {
  if (await hasGhAuth()) {
    const userResult = await exec('gh api user --jq .login')
    const authedUsername = userResult.exitCode === 0 && userResult.stdout ? userResult.stdout.trim() : githubUsername
    const reposResult = await exec("gh api 'user/repos?per_page=100&visibility=all&affiliation=owner&sort=updated'")

    if (reposResult.exitCode === 0 && reposResult.stdout) {
      const rawRepos = JSON.parse(reposResult.stdout) as Array<{
        name: string
        owner: { login: string }
        clone_url: string
        ssh_url: string
        updated_at: string
        default_branch: string
        private: boolean
      }>

      return {
        githubUsername: authedUsername,
        repos: rawRepos,
        source: 'gh',
        error: null,
      }
    }

    logProjectDebug('fetch', `gh api user/repos failed: ${reposResult.stderr || reposResult.stdout || 'unknown error'}`)
    return {
      githubUsername: authedUsername,
      repos: [],
      source: 'gh',
      error: reposResult.stderr || reposResult.stdout || 'gh api user/repos failed',
    }
  }

  if (!githubUsername) {
    return { githubUsername, repos: [], source: 'none', error: null }
  }

  const response = await fetch(`https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`)
  if (!response.ok) {
    logProjectDebug('fetch', `public GitHub API returned ${response.status} for ${githubUsername}`)
    return {
      githubUsername,
      repos: [],
      source: 'public_api',
      error: `GitHub API returned ${response.status}`,
    }
  }

  const repos = await response.json() as GithubRepoWire[]
  return { githubUsername, repos, source: 'public_api', error: null }
}

export async function ensureSeedProject() {
  if (!existsSync(INITIAL_PROJECT_DIR)) return

  const existing = getProjectByPath(INITIAL_PROJECT_DIR)
  if (existing) {
    if (!getActiveProjectId()) {
      setActiveProjectId(existing.id)
    }
    return
  }

  const metadata = await getGitMetadata(INITIAL_PROJECT_DIR)
  const owner = parseGitHubOwner(metadata.remoteUrl)
  const id = `local:${metadata.name}`
  upsertProject({
    id,
    name: metadata.name,
    absolutePath: INITIAL_PROJECT_DIR,
    remoteUrl: metadata.remoteUrl,
    owner,
    source: 'seeded',
    defaultBranch: metadata.defaultBranch,
  })

  if (!getActiveProjectId()) {
    setActiveProjectId(id)
  }
}

export function getActiveProjectId(): string | null {
  return getConfig('active_project_id')
}

export function setActiveProjectId(projectId: string) {
  setConfig('active_project_id', projectId)
  markProjectUsed(projectId)
}

export async function getActiveProjectPath(): Promise<string> {
  await ensureSeedProject()
  const activeProjectId = getActiveProjectId()
  const activeProject = activeProjectId ? getProject(activeProjectId) : null
  return resolve(activeProject?.absolutePath ?? INITIAL_PROJECT_DIR)
}

export async function listProjects(): Promise<{ projects: ProjectSummary[]; githubUsername: string | null }> {
  await ensureSeedProject()

  const activeProjectId = getActiveProjectId()
  const localProjects = getProjects().map((project) => projectToSummary(project, activeProjectId))
  const sshStatus = await checkSshStatus()
  let githubUsername = sshStatus.github_username
  const merged = new Map(localProjects.map((project) => [project.id, project]))

  try {
    const githubData = await fetchGithubRepos(githubUsername)
    githubUsername = githubData.githubUsername
    logProjectDebug(
      'fetch',
      `repo discovery via ${githubData.source}: fetched=${githubData.repos.length} private=${githubData.repos.filter((repo) => repo.private).length} public=${githubData.repos.filter((repo) => !repo.private).length}`,
    )

    for (const repo of githubData.repos) {
      const matchingLocal = localProjects.find((project) =>
        project.remoteUrl === repo.ssh_url || project.remoteUrl === repo.clone_url,
      )
      if (matchingLocal) {
        merged.set(matchingLocal.id, {
          ...matchingLocal,
          defaultBranch: matchingLocal.defaultBranch ?? repo.default_branch,
          lastUpdatedAt: repo.updated_at,
          visibility: repo.private ? 'private' : 'public',
        })
        continue
      }

      const id = buildProfileProjectId(repo.owner.login, repo.name)
      merged.set(id, {
        id,
        name: repo.name,
        owner: repo.owner.login,
        remoteUrl: repo.ssh_url || repo.clone_url,
        localPath: null,
        isLocal: false,
        isActive: false,
        needsClone: true,
        defaultBranch: repo.default_branch,
        lastUpdatedAt: repo.updated_at,
        visibility: repo.private ? 'private' : 'public',
        source: 'github_profile',
      })
    }
  } catch {
    // Degrade to local-only results when GitHub is unreachable.
  }

  return {
    projects: Array.from(merged.values()).sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1
      return a.name.localeCompare(b.name)
    }),
    githubUsername,
  }
}

export async function getProjectsDebug() {
  await ensureSeedProject()

  const activeProjectId = getActiveProjectId()
  const localProjects = getProjects().map((project) => projectToSummary(project, activeProjectId))
  const sshStatus = await checkSshStatus()
  const githubData = await fetchGithubRepos(sshStatus.github_username)
  const listed = await listProjects()

  const privateRepos = githubData.repos.filter((repo) => repo.private)
  const publicRepos = githubData.repos.filter((repo) => !repo.private)
  const listedPrivate = listed.projects.filter((project) => project.visibility === 'private')
  const listedPublic = listed.projects.filter((project) => project.visibility === 'public')

  return {
    activeProjectId,
    sshGithubUsername: sshStatus.github_username,
    ghCliUsername: sshStatus.gh_cli_username,
    ghCliAuthenticated: sshStatus.gh_cli_authenticated,
    privateRepoAccess: sshStatus.private_repo_access,
    fetchSource: githubData.source,
    fetchError: githubData.error,
    fetchedGithubUsername: githubData.githubUsername,
    fetchedRepoCount: githubData.repos.length,
    fetchedPrivateCount: privateRepos.length,
    fetchedPublicCount: publicRepos.length,
    fetchedPrivateSample: privateRepos.slice(0, 8).map((repo) => `${repo.owner.login}/${repo.name}`),
    fetchedPublicSample: publicRepos.slice(0, 8).map((repo) => `${repo.owner.login}/${repo.name}`),
    localProjectCount: localProjects.length,
    listedProjectCount: listed.projects.length,
    listedPrivateCount: listedPrivate.length,
    listedPublicCount: listedPublic.length,
    listedUnknownCount: listed.projects.filter((project) => project.visibility === 'unknown').length,
    listedPrivateSample: listedPrivate.slice(0, 8).map((project) => `${project.owner ?? 'unknown'}/${project.name}`),
    recentOperations: [...projectDebugLog],
  }
}

export async function selectProject(projectId: string, pullLatest = false): Promise<ProjectMutationResult> {
  await ensureSeedProject()
  const project = getProject(projectId)
  if (!project) {
    logProjectDebug('select', `select failed: missing project ${projectId}`)
    throw new GitServiceError('Project not found', 'command_failed', 404)
  }
  if (!existsSync(project.absolutePath)) {
    logProjectDebug('select', `select failed: missing path ${project.absolutePath}`)
    throw new GitServiceError('Local repository is no longer available', 'command_failed', 400)
  }

  if (pullLatest) {
    logProjectDebug('select', `pull + open started for ${project.name}`)
    const pull = await exec('git pull --ff-only', project.absolutePath)
    if (pull.exitCode !== 0) {
      logProjectDebug('select', `pull failed for ${project.name}: ${pull.stderr || pull.stdout || 'unknown error'}`)
      throw new GitServiceError(pull.stderr || 'Pull failed', 'command_failed', 400)
    }
  }

  const metadata = await getGitMetadata(project.absolutePath)
  upsertProject({
    id: project.id,
    name: project.name,
    absolutePath: project.absolutePath,
    remoteUrl: metadata.remoteUrl ?? project.remoteUrl,
    owner: project.owner,
    source: project.source,
    defaultBranch: metadata.defaultBranch ?? project.defaultBranch,
  })
  setActiveProjectId(project.id)
  logProjectDebug('select', `activated ${project.name}${pullLatest ? ' after pull' : ''}`)

  return {
    ok: true,
    project: projectToSummary({
      ...project,
      remoteUrl: metadata.remoteUrl ?? project.remoteUrl,
      defaultBranch: metadata.defaultBranch ?? project.defaultBranch,
    }, project.id),
  }
}

export async function cloneProject(
  projectId: string,
  branchMode: 'default' | 'new' = 'default',
  newBranchName?: string,
): Promise<ProjectMutationResult> {
  logProjectDebug('clone', `clone requested for ${projectId} (${branchMode}${newBranchName ? `:${newBranchName}` : ''})`)
  const listed = await listProjects()
  const project = listed.projects.find((entry) => entry.id === projectId)
  if (!project || !project.remoteUrl) {
    logProjectDebug('clone', `clone failed: missing project or remote for ${projectId}`)
    throw new GitServiceError('Project not found', 'command_failed', 404)
  }
  if (project.isLocal && project.localPath) {
    logProjectDebug('clone', `clone skipped: ${project.name} already local, activating instead`)
    return selectProject(project.id, false)
  }

  mkdirSync(CLONE_ROOT, { recursive: true })
  const targetDir = resolve(CLONE_ROOT, normalizeProjectName(project.name))
  if (!existsSync(targetDir)) {
    logProjectDebug('clone', `git clone starting for ${project.remoteUrl} -> ${targetDir}`)
    const clone = await exec(`git clone ${escapeShellArg(project.remoteUrl)} ${escapeShellArg(targetDir)}`)
    if (clone.exitCode !== 0) {
      logProjectDebug('clone', `git clone failed for ${project.name}: ${clone.stderr || clone.stdout || 'unknown error'}`)
      throw new GitServiceError(clone.stderr || 'Clone failed', 'command_failed', 400)
    }
    logProjectDebug('clone', `git clone finished for ${project.name}`)
  } else {
    logProjectDebug('clone', `target already exists for ${project.name}: ${targetDir}`)
  }

  const metadata = await getGitMetadata(targetDir)
  const owner = project.owner ?? parseGitHubOwner(project.remoteUrl)
  const persistedId = `local:${owner ?? 'repo'}/${project.name}`
  upsertProject({
    id: persistedId,
    name: project.name,
    absolutePath: targetDir,
    remoteUrl: metadata.remoteUrl ?? project.remoteUrl,
    owner,
    source: 'github_clone',
    defaultBranch: metadata.defaultBranch ?? project.defaultBranch,
  })

  if (branchMode === 'new' && newBranchName) {
    logProjectDebug('clone', `creating branch ${newBranchName} in ${project.name}`)
    await createBranchForProject(persistedId, newBranchName)
  }

  setActiveProjectId(persistedId)
  const persisted = getProject(persistedId)
  if (!persisted) {
    logProjectDebug('clone', `clone activation failed for ${project.name}: persisted project missing`)
    throw new GitServiceError('Failed to activate cloned repository', 'command_failed', 500)
  }
  logProjectDebug('clone', `clone completed and activated ${project.name}`)

  return {
    ok: true,
    project: projectToSummary(persisted, persistedId),
  }
}

export async function createBranchForProject(projectId: string, branchName: string): Promise<ProjectMutationResult> {
  const project = getProject(projectId)
  if (!project) {
    logProjectDebug('branch', `branch creation failed: missing project ${projectId}`)
    throw new GitServiceError('Project not found', 'command_failed', 404)
  }

  logProjectDebug('branch', `creating branch ${branchName} in ${project.name}`)
  const checkout = await exec(`git checkout -b ${escapeShellArg(branchName)}`, project.absolutePath)
  if (checkout.exitCode !== 0) {
    logProjectDebug('branch', `branch creation failed in ${project.name}: ${checkout.stderr || checkout.stdout || 'unknown error'}`)
    throw new GitServiceError(checkout.stderr || 'Branch creation failed', 'command_failed', 400)
  }

  const metadata = await getGitMetadata(project.absolutePath)
  upsertProject({
    id: project.id,
    name: project.name,
    absolutePath: project.absolutePath,
    remoteUrl: metadata.remoteUrl ?? project.remoteUrl,
    owner: project.owner,
    source: project.source,
    defaultBranch: metadata.defaultBranch ?? project.defaultBranch,
  })
  setActiveProjectId(project.id)
  logProjectDebug('branch', `branch ${branchName} created in ${project.name}`)

  return {
    ok: true,
    project: projectToSummary({
      ...project,
      remoteUrl: metadata.remoteUrl ?? project.remoteUrl,
      defaultBranch: metadata.defaultBranch ?? project.defaultBranch,
    }, project.id),
  }
}

function escapeShellArg(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}
