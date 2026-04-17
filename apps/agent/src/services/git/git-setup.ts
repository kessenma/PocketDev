import { getToolRecord } from '../../db/index.ts'

import type {
  GitSetupStatus,
  GitConfigureResult,
  GitHubCliAuthResult,
  GitHubCliAuthSessionStatus,
  GitHubCliAuthStartResult,
  GitHubCliAuthSessionState,
} from '@pocketdev/shared/types'
import { createTerminalSession, type TerminalSession } from '../terminal/terminal.ts'

const GH_AUTH_URL_PATTERN = /https:\/\/[^\s]+/g
const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[@-_]/g
const CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g
const GH_PRESS_ENTER_PATTERN = /press enter to open/i
const GH_AUTH_CODE_PATTERNS = [
  /[Oo]ne-?time code[:\s]+([A-Z0-9-]{4,})/i,
  /[Cc]ode[:\s]+([A-Z0-9-]{4,})/i,
  /enter this code[:\s]+([A-Z0-9-]{4,})/i,
  /code[:\s]+([A-Z0-9-]{4,})/i,
  /enter code[:\s]+([A-Z0-9-]{4,})/i,
  /\b([A-Z0-9]{4}(?:-[A-Z0-9]{4})+)\b/,
]
const GH_OUTPUT_EXCERPT_LENGTH = 1500

interface InternalGhAuthSession {
  id: string
  terminal: TerminalSession
  output: string
  state: GitHubCliAuthSessionState
  authUrl: string | null
  verificationCode: string | null
  githubUsername: string | null
  privateRepoAccess: boolean
  authenticated: boolean
  completed: boolean
  error: string | null
  startedAt: number
  updatedAt: number
  browserLaunchHandled: boolean
}

const ghAuthSessions = new Map<string, InternalGhAuthSession>()

function normalizeGhOutput(text: string): string {
  return text
    .replace(ANSI_RE, '')
    .replace(/\r/g, '\n')
    .replace(CONTROL_RE, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** Run a command in a login shell with HOME explicitly set */
async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const proc = Bun.spawn(['bash', '-lc', cmd], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, HOME: home },
  })

  const timer = setTimeout(() => proc.kill(), timeoutMs)
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited
  clearTimeout(timer)

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1 }
}

async function getGhStatus(): Promise<{
  installed: boolean
  version: string | null
  authenticated: boolean
  username: string | null
  privateRepoAccess: boolean
  output: string | null
}> {
  const which = await exec('which gh')
  if (which.exitCode !== 0 || !which.stdout) {
    return {
      installed: false,
      version: null,
      authenticated: false,
      username: null,
      privateRepoAccess: false,
      output: null,
    }
  }

  const versionResult = await exec('gh --version')
  const versionMatch = versionResult.stdout.match(/gh version ([^\s]+)/)
  const authResult = await exec('gh auth status 2>&1')
  const authenticated = authResult.exitCode === 0

  let username: string | null = null
  let privateRepoAccess = false

  if (authenticated) {
    const userResult = await exec('gh api user --jq .login')
    if (userResult.exitCode === 0 && userResult.stdout) {
      username = userResult.stdout.trim()
    }

    const repoProbe = await exec("gh api 'user/repos?per_page=1&visibility=private&affiliation=owner'")
    privateRepoAccess = repoProbe.exitCode === 0
  }

  return {
    installed: true,
    version: versionMatch?.[1] ?? null,
    authenticated,
    username,
    privateRepoAccess,
    output: authResult.stdout || authResult.stderr || null,
  }
}

function parseGhVerificationCode(output: string): string | null {
  const normalized = normalizeGhOutput(output)
  for (const pattern of GH_AUTH_CODE_PATTERNS) {
    const match = normalized.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function getGhOutputExcerpt(output: string): string | null {
  const trimmed = normalizeGhOutput(output)
  if (!trimmed) return null
  return trimmed.slice(-GH_OUTPUT_EXCERPT_LENGTH)
}

function refreshGhSessionState(session: InternalGhAuthSession) {
  const normalized = normalizeGhOutput(session.output)
  const urls = normalized.match(GH_AUTH_URL_PATTERN)
  session.authUrl = urls?.find((url) => url.includes('github.com')) ?? session.authUrl
  session.verificationCode = parseGhVerificationCode(session.output) ?? session.verificationCode
  session.updatedAt = Date.now()

  if (!session.browserLaunchHandled && GH_PRESS_ENTER_PATTERN.test(normalized)) {
    session.browserLaunchHandled = true
    session.terminal.send('\r')
  }

  if (session.authenticated) {
    session.state = 'authenticated'
    session.error = null
    return
  }

  const lower = normalized.toLowerCase()
  if (session.completed && !session.authenticated) {
    session.state = 'failed'
    session.error = session.error ?? (lower.includes('error') ? 'GitHub CLI authentication failed.' : 'GitHub CLI authentication could not be verified.')
    return
  }

  if (session.authUrl) {
    session.state = 'awaiting_browser'
    return
  }

  session.state = 'pending'
}

function toGhAuthStatus(session: InternalGhAuthSession): GitHubCliAuthSessionStatus {
  return {
    session_id: session.id,
    state: session.state,
    auth_url: session.authUrl,
    verification_code: session.verificationCode,
    output_excerpt: getGhOutputExcerpt(session.output),
    github_username: session.githubUsername,
    private_repo_access: session.privateRepoAccess,
    authenticated: session.authenticated,
    completed: session.completed,
    error: session.error,
  }
}

async function finalizeGhSession(sessionId: string) {
  const session = ghAuthSessions.get(sessionId)
  if (!session) return

  const finalStatus = await getGhStatus()
  session.authenticated = finalStatus.authenticated
  session.githubUsername = finalStatus.username
  session.privateRepoAccess = finalStatus.privateRepoAccess
  session.completed = true
  session.error = finalStatus.authenticated ? null : (finalStatus.output ?? 'GitHub CLI authentication failed.')

  if (finalStatus.authenticated) {
    await exec('gh config set git_protocol https')
    await exec('gh auth setup-git')
  }

  refreshGhSessionState(session)
}

function getGhSessionOrThrow(sessionId: string): InternalGhAuthSession {
  const session = ghAuthSessions.get(sessionId)
  if (!session) {
    throw new Error('GitHub CLI auth session not found')
  }
  return session
}

// ─── Public API ──────────────────────────────────────────────────────

export async function checkSetupStatus(): Promise<GitSetupStatus> {
  const { exitCode: gitExit } = await exec('which git')
  const gitInstalled = gitExit === 0

  let gitUserName: string | null = null
  let gitUserEmail: string | null = null
  if (gitInstalled) {
    const { stdout: name } = await exec('git config --global user.name')
    const { stdout: email } = await exec('git config --global user.email')
    gitUserName = name || null
    gitUserEmail = email || null
  }

  const ghStatus = await getGhStatus()

  return {
    git_installed: gitInstalled,
    github_username: ghStatus.username,
    gh_cli_installed: ghStatus.installed,
    gh_cli_version: ghStatus.version,
    gh_cli_authenticated: ghStatus.authenticated,
    gh_cli_username: ghStatus.username,
    private_repo_access: ghStatus.privateRepoAccess,
    git_user_name: gitUserName,
    git_user_email: gitUserEmail,
  }
}

export async function configureGitHubCliToken(token: string): Promise<GitHubCliAuthResult> {
  if (!token.trim()) {
    return {
      success: false,
      github_username: null,
      private_repo_access: false,
      output: null,
      error: 'GitHub token is required',
    }
  }

  const ghStatus = await getGhStatus()
  if (!ghStatus.installed) {
    return {
      success: false,
      github_username: null,
      private_repo_access: false,
      output: null,
      error: 'GitHub CLI is not installed',
    }
  }

  const escapedToken = token.replace(/'/g, `'\\''`)
  const login = await exec(`printf '%s' '${escapedToken}' | gh auth login --hostname github.com --with-token`)
  if (login.exitCode !== 0) {
    return {
      success: false,
      github_username: null,
      private_repo_access: false,
      output: login.stdout || login.stderr || null,
      error: login.stderr || 'GitHub CLI authentication failed',
    }
  }

  await exec('gh config set git_protocol https')
  await exec('gh auth setup-git')
  const finalStatus = await getGhStatus()

  return {
    success: finalStatus.authenticated,
    github_username: finalStatus.username,
    private_repo_access: finalStatus.privateRepoAccess,
    output: finalStatus.output,
    error: finalStatus.authenticated ? null : 'GitHub CLI is still not authenticated',
  }
}

export async function startGitHubCliAuth(): Promise<GitHubCliAuthStartResult> {
  const ghStatus = await getGhStatus()
  if (!ghStatus.installed) {
    throw new Error('GitHub CLI is not installed')
  }

  for (const session of ghAuthSessions.values()) {
    session.terminal.kill()
  }
  ghAuthSessions.clear()

  const sessionId = crypto.randomUUID()
  const command = 'gh auth login --hostname github.com --git-protocol https --web'
  const terminal = createTerminalSession(
    sessionId,
    (data) => {
      const session = ghAuthSessions.get(sessionId)
      if (!session) return
      session.output += data
      refreshGhSessionState(session)
    },
    () => {
      void finalizeGhSession(sessionId)
    },
    process.env.HOME ?? '/root',
  )

  const session: InternalGhAuthSession = {
    id: sessionId,
    terminal,
    output: '',
    state: 'starting',
    authUrl: null,
    verificationCode: null,
    githubUsername: null,
    privateRepoAccess: false,
    authenticated: false,
    completed: false,
    error: null,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    browserLaunchHandled: false,
  }
  ghAuthSessions.set(sessionId, session)
  terminal.send(`${command}\n`)

  await Bun.sleep(1000)
  refreshGhSessionState(session)
  return toGhAuthStatus(session)
}

export async function getGitHubCliAuthStatus(sessionId: string): Promise<GitHubCliAuthSessionStatus> {
  const session = getGhSessionOrThrow(sessionId)

  if (!session.authenticated && !session.completed) {
    const liveStatus = await getGhStatus()
    session.authenticated = liveStatus.authenticated
    session.githubUsername = liveStatus.username
    session.privateRepoAccess = liveStatus.privateRepoAccess
    if (liveStatus.authenticated) {
      session.completed = true
      session.error = null
      session.terminal.kill()
    }
    refreshGhSessionState(session)
  }

  return toGhAuthStatus(session)
}

export function getGitHubAuthDebug() {
  const sessions = Array.from(ghAuthSessions.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((session) => ({
      sessionId: session.id,
      state: session.state,
      authenticated: session.authenticated,
      completed: session.completed,
      authUrl: session.authUrl,
      verificationCode: session.verificationCode,
      githubUsername: session.githubUsername,
      privateRepoAccess: session.privateRepoAccess,
      browserLaunchHandled: session.browserLaunchHandled,
      error: session.error,
      startedAt: new Date(session.startedAt).toISOString(),
      updatedAt: new Date(session.updatedAt).toISOString(),
      outputExcerpt: getGhOutputExcerpt(session.output),
    }))

  return {
    activeSessionCount: sessions.length,
    sessions,
    persistedState: getToolRecord('github_cli'),
  }
}

export async function configureIdentity(name: string, email: string): Promise<GitConfigureResult> {
  try {
    const { exitCode: nameExit, stderr: nameErr } = await exec(`git config --global user.name "${name.replace(/"/g, '\\"')}"`)
    if (nameExit !== 0) {
      return { success: false, user_name: '', user_email: '', error: nameErr || 'Failed to set user.name' }
    }

    const { exitCode: emailExit, stderr: emailErr } = await exec(`git config --global user.email "${email.replace(/"/g, '\\"')}"`)
    if (emailExit !== 0) {
      return { success: false, user_name: name, user_email: '', error: emailErr || 'Failed to set user.email' }
    }

    // Verify by reading back
    const { stdout: verifyName } = await exec('git config --global user.name')
    const { stdout: verifyEmail } = await exec('git config --global user.email')

    return {
      success: true,
      user_name: verifyName,
      user_email: verifyEmail,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      user_name: '',
      user_email: '',
      error: err instanceof Error ? err.message : 'Configuration failed',
    }
  }
}

