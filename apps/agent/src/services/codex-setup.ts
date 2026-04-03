import { createTerminalSession, type TerminalSession } from './terminal.ts'
import { deleteToolRecord, getToolRecord, setToolAuthenticated, upsertToolPath } from '../db/index.ts'
import { checkNpm, execShell } from './pkg-setup.ts'
import type {
  CodexAuthCallbackReplayResult,
  CodexAuthMode,
  CodexAuthSessionState,
  CodexAuthSessionStatus,
  CodexAuthStartResult,
  CodexAuthSubmitResult,
  CodexInstallResult,
  CodexSetupStatus,
} from '@pocketdev/shared/types'

const CODEX_INSTALL_COMMAND = 'sudo npm i -g @openai/codex'
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

interface CodexReplayDebugSnapshot {
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

const authSessions = new Map<string, InternalAuthSession>()
let lastReplayDebug: CodexReplayDebugSnapshot | null = null

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

function validateCodexCallbackUrl(callbackUrl: string): URL {
  const trimmed = callbackUrl.trim()
  const normalized = /^localhost:1455\/auth\/callback/i.test(trimmed) || /^127\.0\.0\.1:1455\/auth\/callback/i.test(trimmed) || /^\[::1\]:1455\/auth\/callback/i.test(trimmed) || /^::1:1455\/auth\/callback/i.test(trimmed)
    ? `http://${trimmed}`
    : trimmed
  const url = new URL(normalized)
  if (url.protocol !== 'http:') {
    throw new Error('Codex callback must use http')
  }
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)) {
    throw new Error('Codex callback must target localhost')
  }
  if ((url.port || '80') !== '1455') {
    throw new Error('Codex callback must target port 1455')
  }
  if (url.pathname !== '/auth/callback') {
    throw new Error('Codex callback path is invalid')
  }
  return url
}

function buildLoopbackCallbackCandidates(parsed: URL): string[] {
  const hosts = [
    parsed.hostname,
    'localhost',
    '127.0.0.1',
    '[::1]',
  ]

  const uniqueHosts = Array.from(new Set(hosts.filter(Boolean)))
  return uniqueHosts.map((hostname) => {
    const candidate = new URL(parsed.toString())
    candidate.hostname = hostname
    return candidate.toString()
  })
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

export async function startCodexAuth(mode: CodexAuthMode): Promise<CodexAuthStartResult> {
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
  const authCommand = mode === 'device_code'
    ? 'codex login --device-auth\n'
    : 'codex login\n'
  terminal.send(authCommand)

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

export async function replayCodexAuthCallback(
  sessionId: string,
  callbackUrl: string,
): Promise<CodexAuthCallbackReplayResult> {
  const session = getSessionOrThrow(sessionId)
  if (session.completed) {
    lastReplayDebug = {
      sessionId,
      inputCallbackUrl: callbackUrl,
      attempts: [],
      success: false,
      statusCode: null,
      error: 'Codex auth session is already completed.',
      sessionOutputExcerpt: getOutputExcerpt(session.output),
      sessionPrompt: session.prompt,
      recordedAt: new Date().toISOString(),
    }
    return {
      success: false,
      callback_url: callbackUrl,
      status_code: null,
      error: 'Codex auth session is already completed.',
      attempts: [],
      session_output_excerpt: getOutputExcerpt(session.output),
      session_prompt: session.prompt,
    }
  }

  let parsed: URL
  try {
    parsed = validateCodexCallbackUrl(callbackUrl)
  } catch (error) {
    lastReplayDebug = {
      sessionId,
      inputCallbackUrl: callbackUrl,
      attempts: [],
      success: false,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Invalid callback URL',
      sessionOutputExcerpt: getOutputExcerpt(session.output),
      sessionPrompt: session.prompt,
      recordedAt: new Date().toISOString(),
    }
    return {
      success: false,
      callback_url: callbackUrl,
      status_code: null,
      error: error instanceof Error ? error.message : 'Invalid callback URL',
      attempts: [],
      session_output_excerpt: getOutputExcerpt(session.output),
      session_prompt: session.prompt,
    }
  }

  const candidates = buildLoopbackCallbackCandidates(parsed)
  const failures: string[] = []

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: 'GET',
        redirect: 'manual',
      })
      session.updatedAt = Date.now()

      if (response.status >= 200 && response.status < 400) {
        const attempts = failures.length > 0 ? [...failures, `${candidate} -> HTTP ${response.status}`] : [`${candidate} -> HTTP ${response.status}`]
        lastReplayDebug = {
          sessionId,
          inputCallbackUrl: callbackUrl,
          attempts,
          success: true,
          statusCode: response.status,
          error: null,
          sessionOutputExcerpt: getOutputExcerpt(session.output),
          sessionPrompt: session.prompt,
          recordedAt: new Date().toISOString(),
        }
        return {
          success: true,
          callback_url: candidate,
          status_code: response.status,
          error: null,
          attempts,
          session_output_excerpt: getOutputExcerpt(session.output),
          session_prompt: session.prompt,
        }
      }

      failures.push(`${candidate} -> HTTP ${response.status}`)
    } catch (error) {
      failures.push(`${candidate} -> ${error instanceof Error ? error.message : 'request failed'}`)
    }
  }

  lastReplayDebug = {
    sessionId,
    inputCallbackUrl: callbackUrl,
    attempts: failures,
    success: false,
    statusCode: null,
    error: `Failed to replay callback against local Codex server. ${failures.join(' | ')}`,
    sessionOutputExcerpt: getOutputExcerpt(session.output),
    sessionPrompt: session.prompt,
    recordedAt: new Date().toISOString(),
  }
  return {
    success: false,
    callback_url: callbackUrl,
    status_code: null,
    error: `Failed to replay callback against local Codex server. ${failures.join(' | ')}`,
    attempts: failures,
    session_output_excerpt: getOutputExcerpt(session.output),
    session_prompt: session.prompt,
  }
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

export function getCodexAuthDebug() {
  const sessions = Array.from(authSessions.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((session) => ({
      sessionId: session.id,
      state: session.state,
      authenticated: session.authenticated,
      completed: session.completed,
      authUrl: session.authUrl,
      verificationCode: session.verificationCode,
      prompt: session.prompt,
      error: session.error,
      startedAt: new Date(session.startedAt).toISOString(),
      updatedAt: new Date(session.updatedAt).toISOString(),
      outputExcerpt: getOutputExcerpt(session.output),
    }))

  return {
    activeSessionCount: sessions.length,
    sessions,
    lastReplayDebug,
    persistedState: getToolRecord('codex_cli'),
  }
}
