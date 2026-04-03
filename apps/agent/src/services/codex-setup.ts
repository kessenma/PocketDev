import { createTerminalSession, type TerminalSession } from './terminal.ts'
import { deleteToolRecord, getToolRecord, setToolAuthenticated, upsertToolPath } from '../db/index.ts'
import { checkNpm, execShell } from './pkg-setup.ts'
import type {
  CodexAuthSessionState,
  CodexAuthSessionStatus,
  CodexAuthStartResult,
  CodexAuthSubmitResult,
  CodexInstallResult,
  CodexSetupStatus,
} from '@pocketdev/shared/types'

const CODEX_INSTALL_COMMAND = 'npm i -g @openai/codex'
const AUTH_URL_PATTERN = /https:\/\/[^\s\])>"']+/g
const VERIFICATION_CODE_PATTERNS = [
  /code[:\s]+([A-Z0-9]{4}(?:-[A-Z0-9]{4})+)/i,
  /\b([A-Z0-9]{4}(?:-[A-Z0-9]{4})+)\b/,
]
const MAX_OUTPUT_LENGTH = 16_000
const OUTPUT_EXCERPT_LENGTH = 1_500

interface InternalAuthSession {
  id: string
  terminal: TerminalSession
  output: string
  state: CodexAuthSessionState
  authUrl: string | null
  verificationCode: string | null
  prompt: string | null
  authenticated: boolean
  completed: boolean
  error: string | null
  startedAt: number
  updatedAt: number
}

const authSessions = new Map<string, InternalAuthSession>()

const exec = execShell

async function which(binary: string): Promise<string | null> {
  const { stdout, exitCode } = await exec(`which ${binary}`)
  return exitCode === 0 && stdout ? stdout.split('\n')[0] : null
}

function getOutputExcerpt(output: string): string | null {
  const trimmed = output.trim()
  if (!trimmed) return null
  return trimmed.slice(-OUTPUT_EXCERPT_LENGTH)
}

function derivePrompt(output: string): string | null {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (
      line.startsWith('http') ||
      line.startsWith('Script started') ||
      line.startsWith('Script done') ||
      /^__/.test(line)
    ) {
      continue
    }
    return line
  }

  return null
}

function parseVerificationCode(output: string): string | null {
  for (const pattern of VERIFICATION_CODE_PATTERNS) {
    const match = output.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function parseAuthState(output: string, completed: boolean, authenticated: boolean): {
  state: CodexAuthSessionState
  authUrl: string | null
  verificationCode: string | null
  prompt: string | null
  error: string | null
} {
  const urls = output.match(AUTH_URL_PATTERN)
  const authUrl = urls?.find((url) =>
    url.includes('openai.com') ||
    url.includes('platform.openai.com') ||
    url.includes('auth') ||
    url.includes('oauth'),
  ) ?? urls?.[urls.length - 1] ?? null
  const verificationCode = parseVerificationCode(output)
  const prompt = derivePrompt(output)
  const lower = output.toLowerCase()
  const hasFailure = /error|failed|denied|timed out|timed-out/.test(lower)
  const waitingForInput = /enter|paste|code/.test(lower) && !authenticated

  if (authenticated) {
    return {
      state: 'authenticated',
      authUrl,
      verificationCode,
      prompt,
      error: null,
    }
  }

  if (completed && hasFailure) {
    return {
      state: 'failed',
      authUrl,
      verificationCode,
      prompt,
      error: prompt ?? 'Codex authentication failed.',
    }
  }

  if (waitingForInput && authUrl) {
    return {
      state: 'awaiting_code',
      authUrl,
      verificationCode,
      prompt,
      error: null,
    }
  }

  if (authUrl) {
    return {
      state: 'awaiting_browser',
      authUrl,
      verificationCode,
      prompt,
      error: null,
    }
  }

  return {
    state: completed ? 'failed' : 'starting',
    authUrl,
    verificationCode,
    prompt,
    error: completed ? (prompt ?? 'Codex authentication failed.') : null,
  }
}

function toAuthStatus(session: InternalAuthSession): CodexAuthSessionStatus {
  return {
    session_id: session.id,
    state: session.state,
    auth_url: session.authUrl,
    verification_code: session.verificationCode,
    prompt: session.prompt,
    output_excerpt: getOutputExcerpt(session.output),
    can_submit_code: session.state === 'awaiting_code' || !!session.verificationCode,
    authenticated: session.authenticated,
    completed: session.completed,
    error: session.error,
  }
}

function syncPersistedCodexStatus(status: CodexSetupStatus) {
  if (status.installed && status.path) {
    upsertToolPath('codex_cli', status.path, status.version, status.authenticated)
  } else {
    deleteToolRecord('codex_cli')
  }
}

function refreshSessionState(session: InternalAuthSession) {
  const derived = parseAuthState(session.output, session.completed, session.authenticated)
  session.state = session.authenticated
    ? 'authenticated'
    : session.completed && session.state !== 'authenticated'
      ? derived.state === 'starting' ? 'failed' : derived.state
      : (derived.state === 'starting' ? 'pending' : derived.state)
  session.authUrl = derived.authUrl
  session.verificationCode = derived.verificationCode
  session.prompt = derived.prompt
  session.error = session.completed && !session.authenticated
    ? (derived.error ?? session.error ?? 'Codex authentication failed.')
    : derived.error
  session.updatedAt = Date.now()
}

async function finalizeSession(sessionId: string) {
  const session = authSessions.get(sessionId)
  if (!session) return

  const status = await checkCodexStatus()
  session.authenticated = status.authenticated
  session.completed = true
  session.error = status.authenticated
    ? null
    : (status.auth_output ?? session.error ?? 'Codex authentication could not be verified.')
  refreshSessionState(session)
}

function getSessionOrThrow(sessionId: string): InternalAuthSession {
  const session = authSessions.get(sessionId)
  if (!session) {
    throw new Error('Codex auth session not found')
  }
  return session
}

function disposeExistingSessions() {
  for (const session of authSessions.values()) {
    session.terminal.kill()
  }
  authSessions.clear()
}

async function waitForAuthBootstrap(sessionId: string, timeoutMs = 1500) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const session = authSessions.get(sessionId)
    if (!session) return
    if (session.authUrl || session.output.trim().length > 0) return
    await Bun.sleep(100)
  }
}

export async function checkCodexStatus(): Promise<CodexSetupStatus> {
  const path = await which('codex')
  if (!path) {
    const status = {
      installed: false,
      version: null,
      path: null,
      authenticated: false,
      auth_output: null,
    } satisfies CodexSetupStatus
    syncPersistedCodexStatus(status)
    return status
  }

  const { stdout: versionOut } = await exec('codex --version')
  const versionMatch = versionOut.match(/(\d+\.\d+[\.\d]*)/)
  const version = versionMatch ? versionMatch[1] : null

  const { stdout: authOut, stderr: authErr, exitCode: authExit } = await exec('codex login status 2>&1')
  const authOutput = [authOut, authErr].filter(Boolean).join('\n').trim()
  const authenticated = authExit === 0 && !authOutput.toLowerCase().includes('not logged in')

  const status = {
    installed: true,
    version,
    path,
    authenticated,
    auth_output: authOutput || null,
  } satisfies CodexSetupStatus

  syncPersistedCodexStatus(status)
  return status
}

export async function installCodex(): Promise<CodexInstallResult> {
  const npm = await checkNpm()
  if (!npm.installed || !npm.path) {
    setToolAuthenticated('codex_cli', false)
    return {
      success: false,
      installed: false,
      version: null,
      path: null,
      output: null,
      error: 'npm is not installed. Set up package managers first.',
    }
  }

  const { stdout, stderr, exitCode } = await exec(CODEX_INSTALL_COMMAND, 240_000)
  const output = [stdout, stderr].filter(Boolean).join('\n').trim() || null

  if (exitCode !== 0) {
    return {
      success: false,
      installed: false,
      version: null,
      path: null,
      output,
      error: output ?? 'Failed to install Codex CLI.',
    }
  }

  const status = await checkCodexStatus()
  return {
    success: status.installed,
    installed: status.installed,
    version: status.version,
    path: status.path,
    output,
    error: status.installed ? null : 'Codex CLI install completed but the binary was not detected.',
  }
}

export async function startCodexAuth(): Promise<CodexAuthStartResult> {
  disposeExistingSessions()

  let session: InternalAuthSession | null = null
  const sessionId = crypto.randomUUID()
  const terminal = createTerminalSession(
    `codex-auth-${sessionId}`,
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
    state: 'starting',
    authUrl: null,
    verificationCode: null,
    prompt: null,
    authenticated: false,
    completed: false,
    error: null,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }

  authSessions.set(sessionId, session)
  terminal.send('codex login\n')

  await waitForAuthBootstrap(sessionId)
  refreshSessionState(session)
  return toAuthStatus(session)
}

export function getCodexAuthStatus(sessionId: string): CodexAuthSessionStatus {
  const session = getSessionOrThrow(sessionId)
  refreshSessionState(session)
  return toAuthStatus(session)
}

export function submitCodexAuthInput(sessionId: string, code: string): CodexAuthSubmitResult {
  const session = getSessionOrThrow(sessionId)
  session.terminal.send(`${code.trim()}\n`)
  session.state = 'pending'
  session.updatedAt = Date.now()
  return toAuthStatus(session)
}

export async function verifyCodexAuth(): Promise<CodexSetupStatus> {
  const status = await checkCodexStatus()
  if (!status.authenticated) {
    setToolAuthenticated('codex_cli', false)
  }
  return status
}

export function getPersistedCodexState() {
  return getToolRecord('codex_cli')
}
