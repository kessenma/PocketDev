import { createTerminalSession, type TerminalSession } from './terminal.ts'
import { upsertToolPath, deleteToolRecord, setToolAuthenticated } from '../db/index.ts'
import type {
  ClaudeAuthSessionState,
  ClaudeAuthSessionStatus,
  ClaudeAuthStartResult,
  ClaudeAuthSubmitResult,
  ClaudeSetupStatus,
} from '@pocketdev/shared/types'

// ─── Shell exec helper ──────────────────────────────────────────────

async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const wrappedCmd = `export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"; source ~/.bashrc 2>/dev/null; ${cmd}`
  const proc = Bun.spawn(['bash', '-lc', wrappedCmd], {
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

// ─── Constants & patterns ───────────────────────────────────────────

const AUTH_URL_PATTERN = /https:\/\/[^\s\])>"']+/g
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07/g
const THEME_PATTERN = /choose the text style/i
const LOGIN_METHOD_PATTERN = /select login method/i
const BROWSER_DIDNT_OPEN_PATTERN = /browser didn't open|use the url below/i
const CODE_PROMPT_PATTERN = /paste code here/i
const AUTH_SUCCESS_PATTERNS = [/successfully authenticated/i, /logged in as/i, /you are logged in/i]

const MAX_OUTPUT_LENGTH = 16_000
const OUTPUT_EXCERPT_LENGTH = 1_500

// ─── Auth session management ────────────────────────────────────────

interface InternalAuthSession {
  id: string
  terminal: TerminalSession
  output: string
  cleanOutput: string
  state: ClaudeAuthSessionState
  authUrl: string | null
  prompt: string | null
  authenticated: boolean
  completed: boolean
  error: string | null
  themeHandled: boolean
  methodHandled: boolean
  startedAt: number
  updatedAt: number
}

const authSessions = new Map<string, InternalAuthSession>()

// ─── Output parsing ─────────────────────────────────────────────────

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '')
}

function getOutputExcerpt(output: string): string | null {
  const trimmed = stripAnsi(output).trim()
  if (!trimmed) return null
  return trimmed.slice(-OUTPUT_EXCERPT_LENGTH)
}

function derivePrompt(output: string): string | null {
  const clean = stripAnsi(output)
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (line.startsWith('http') || line.startsWith('Script ') || /^__/.test(line)) continue
    return line
  }
  return null
}

function parseAuthState(session: InternalAuthSession): {
  state: ClaudeAuthSessionState
  authUrl: string | null
  prompt: string | null
  error: string | null
} {
  const clean = session.cleanOutput
  const prompt = derivePrompt(session.output)

  // Extract OAuth URL
  const urls = clean.match(AUTH_URL_PATTERN)
  const authUrl = urls?.find((u) =>
    u.includes('claude.com') || u.includes('anthropic.com') || u.includes('oauth'),
  ) ?? urls?.[urls.length - 1] ?? null

  // Check for success
  for (const p of AUTH_SUCCESS_PATTERNS) {
    if (p.test(clean)) {
      return { state: 'authenticated', authUrl, prompt, error: null }
    }
  }

  if (session.authenticated) {
    return { state: 'authenticated', authUrl, prompt, error: null }
  }

  // Check for failures
  const hasFailure = /error|failed|denied|timed out/i.test(clean) && !/command not found/i.test(clean)
  if (session.completed && hasFailure) {
    return { state: 'failed', authUrl, prompt, error: prompt ?? 'Claude authentication failed.' }
  }

  // Interactive prompts
  if (THEME_PATTERN.test(clean) && !session.themeHandled) {
    return { state: 'awaiting_theme', authUrl, prompt, error: null }
  }

  if (LOGIN_METHOD_PATTERN.test(clean) && !session.methodHandled) {
    return { state: 'awaiting_method', authUrl, prompt, error: null }
  }

  // Code prompt (paste code here)
  if (CODE_PROMPT_PATTERN.test(clean) && authUrl) {
    return { state: 'awaiting_code', authUrl, prompt, error: null }
  }

  // Browser URL available
  if (authUrl && BROWSER_DIDNT_OPEN_PATTERN.test(clean)) {
    return { state: 'awaiting_browser', authUrl, prompt, error: null }
  }

  if (authUrl) {
    return { state: 'awaiting_browser', authUrl, prompt, error: null }
  }

  if (session.completed) {
    return { state: 'failed', authUrl, prompt, error: prompt ?? 'Claude authentication failed.' }
  }

  return { state: 'starting', authUrl, prompt, error: null }
}

function toAuthStatus(session: InternalAuthSession): ClaudeAuthSessionStatus {
  return {
    session_id: session.id,
    state: session.state,
    auth_url: session.authUrl,
    prompt: session.prompt,
    output_excerpt: getOutputExcerpt(session.output),
    can_submit_code: session.state === 'awaiting_code',
    authenticated: session.authenticated,
    completed: session.completed,
    error: session.error,
  }
}

function refreshSessionState(session: InternalAuthSession) {
  session.cleanOutput = stripAnsi(session.output)
  const derived = parseAuthState(session)

  // Auto-answer theme selector
  if (derived.state === 'awaiting_theme' && !session.themeHandled) {
    session.themeHandled = true
    session.terminal.send('1\n')
    session.state = 'pending'
    session.updatedAt = Date.now()
    return
  }

  // Auto-answer login method (1 = Claude subscription)
  if (derived.state === 'awaiting_method' && !session.methodHandled) {
    session.methodHandled = true
    session.terminal.send('1\n')
    session.state = 'pending'
    session.updatedAt = Date.now()
    return
  }

  session.state = session.authenticated
    ? 'authenticated'
    : session.completed && derived.state === 'starting'
      ? 'failed'
      : derived.state === 'starting' && session.output.trim().length > 0
        ? 'pending'
        : derived.state
  session.authUrl = derived.authUrl
  session.prompt = derived.prompt
  session.error = session.completed && !session.authenticated
    ? (derived.error ?? session.error ?? 'Claude authentication failed.')
    : derived.error
  session.updatedAt = Date.now()
}

async function finalizeSession(sessionId: string) {
  const session = authSessions.get(sessionId)
  if (!session) return

  const status = await checkClaudeStatus()
  session.authenticated = status.authenticated
  session.completed = true
  session.error = status.authenticated
    ? null
    : (status.auth_output ?? session.error ?? 'Claude authentication could not be verified.')
  refreshSessionState(session)
}

function getSessionOrThrow(sessionId: string): InternalAuthSession {
  const session = authSessions.get(sessionId)
  if (!session) throw new Error('Claude auth session not found')
  return session
}

function disposeExistingSessions() {
  for (const session of authSessions.values()) {
    session.terminal.kill()
  }
  authSessions.clear()
}

async function waitForAuthBootstrap(sessionId: string, timeoutMs = 2000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const session = authSessions.get(sessionId)
    if (!session) return
    if (session.authUrl || session.output.trim().length > 0) return
    await Bun.sleep(100)
  }
}

// ─── Status check ───────────────────────────────────────────────────

function syncPersistedClaudeStatus(status: ClaudeSetupStatus) {
  if (status.installed && status.path) {
    upsertToolPath('claude_cli', status.path, status.version, status.authenticated)
  } else {
    deleteToolRecord('claude_cli')
  }
}

export async function checkClaudeStatus(): Promise<ClaudeSetupStatus> {
  const { stdout: path, exitCode: whichExit } = await exec('which claude')

  if (whichExit !== 0 || !path) {
    const status: ClaudeSetupStatus = {
      installed: false,
      version: null,
      path: null,
      authenticated: false,
      auth_output: null,
    }
    syncPersistedClaudeStatus(status)
    return status
  }

  const claudeBin = path.split('\n')[0]
  const { stdout: versionOut } = await exec(`"${claudeBin}" --version`)
  const versionMatch = versionOut.match(/(\d+\.\d+[\.\d]*)/)
  const version = versionMatch ? versionMatch[1] : null

  const { stdout: authOut, exitCode: authExit } = await exec(`"${claudeBin}" auth status 2>&1`)
  const authenticated = authExit === 0 && !authOut.toLowerCase().includes('not logged in')

  const status: ClaudeSetupStatus = {
    installed: true,
    version,
    path: claudeBin,
    authenticated,
    auth_output: authOut || null,
  }
  syncPersistedClaudeStatus(status)
  return status
}

export async function verifyClaudeAuth(): Promise<ClaudeSetupStatus> {
  const status = await checkClaudeStatus()
  if (!status.authenticated) {
    setToolAuthenticated('claude_cli', false)
  }
  return status
}

// ─── Auth session API ───────────────────────────────────────────────

export async function startClaudeAuth(): Promise<ClaudeAuthStartResult> {
  disposeExistingSessions()

  let session: InternalAuthSession | null = null
  const sessionId = crypto.randomUUID()
  const terminal = createTerminalSession(
    `claude-auth-${sessionId}`,
    (chunk) => {
      if (!session) return
      session.output = `${session.output}${chunk}`.slice(-MAX_OUTPUT_LENGTH)
      refreshSessionState(session)
    },
    () => {
      void finalizeSession(sessionId)
    },
    process.env.HOME ?? '/',
  )

  session = {
    id: sessionId,
    terminal,
    output: '',
    cleanOutput: '',
    state: 'starting',
    authUrl: null,
    prompt: null,
    authenticated: false,
    completed: false,
    error: null,
    themeHandled: false,
    methodHandled: false,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }

  authSessions.set(sessionId, session)
  terminal.send('claude\n')

  await waitForAuthBootstrap(sessionId)
  refreshSessionState(session)
  return toAuthStatus(session)
}

export function getClaudeAuthStatus(sessionId: string): ClaudeAuthSessionStatus {
  const session = getSessionOrThrow(sessionId)
  refreshSessionState(session)
  return toAuthStatus(session)
}

export function submitClaudeAuthInput(sessionId: string, code: string): ClaudeAuthSubmitResult {
  const session = getSessionOrThrow(sessionId)
  session.terminal.send(`${code.trim()}\n`)
  session.state = 'pending'
  session.updatedAt = Date.now()
  return toAuthStatus(session)
}
