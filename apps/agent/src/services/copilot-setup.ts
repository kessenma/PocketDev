import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createTerminalSession, type TerminalSession } from './terminal.ts'
import { deleteToolRecord, getToolRecord, upsertToolPath } from '../db/index.ts'
import type {
  CopilotInstallResult,
  CopilotSetupStatus,
  CopilotTrustSessionState,
  CopilotTrustSessionStatus,
  CopilotTrustStartResult,
} from '@pocketdev/shared/types'

const DATA_DIR = process.env.POCKETDEV_DATA_DIR ?? join(process.cwd(), 'data')
const TRUST_MARKER_FILE = join(DATA_DIR, 'copilot-trust.json')
const COPILOT_INSTALL_COMMAND = 'curl -fsSL https://gh.io/copilot-install | bash'
const MAX_OUTPUT_LENGTH = 16_000
const OUTPUT_EXCERPT_LENGTH = 1_500
const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[@-_]/g
const CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g
const TRUST_PROMPT_PATTERN = /do you trust (?:the files in this folder|the contents of this directory)\?/i
const TRUST_CONTINUE_PATTERN = /press enter to continue/i
const COPILOT_UI_READY_PATTERN = /\u001b\]2;GitHub Copilot\u0007|\u001b\[\?1049h/

// Terminal query patterns that TUI apps send and expect responses for.
// If we don't respond, the app may hang waiting for the terminal's reply.
const TERMINAL_QUERY_RESPONSES: Array<{ pattern: RegExp; response: string; label: string }> = [
  // OSC 11 - background color query → reply with dark background
  // Terminated by either ST (ESC \) or BEL (\x07)
  { pattern: /\u001b\]11;\?(?:\u001b\\|\u0007)/, response: '\u001b]11;rgb:0a0a/0a0a/0a0a\u001b\\', label: 'OSC 11 (bg color)' },
  // OSC 10 - foreground color query → reply with light foreground
  { pattern: /\u001b\]10;\?(?:\u001b\\|\u0007)/, response: '\u001b]10;rgb:f4f0/e8e8/d0d0\u001b\\', label: 'OSC 10 (fg color)' },
  // Kitty keyboard protocol query → reply with no flags
  { pattern: /\u001b\[\?u/, response: '\u001b[?0u', label: 'Kitty keyboard query' },
]
const TRUST_REMEMBERED_PATTERN = /has been added to trusted folders/i
const READY_PATTERNS = [
  /describe a task to get started\./i,
  /tip:\s*\/usage/i,
  TRUST_REMEMBERED_PATTERN,
]

interface InternalTrustSession {
  id: string
  terminal: TerminalSession
  output: string
  state: CopilotTrustSessionState
  prompt: string | null
  trustTarget: string | null
  trusted: boolean
  completed: boolean
  error: string | null
  trustHandled: boolean
  fallbackTrustAttempted: boolean
  uiReady: boolean
  startedAt: number
  updatedAt: number
}

const trustSessions = new Map<string, InternalTrustSession>()
type CopilotDebugEvent = {
  ts: string
  sessionId: string | null
  message: string
}
const copilotDebugEvents: CopilotDebugEvent[] = []

function recordDebugEvent(sessionId: string | null, message: string) {
  copilotDebugEvents.unshift({
    ts: new Date().toISOString(),
    sessionId,
    message,
  })
  if (copilotDebugEvents.length > 60) {
    copilotDebugEvents.length = 60
  }
}

async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const wrapped = `export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"; source ~/.bashrc 2>/dev/null; ${cmd}`
  const proc = Bun.spawn(['bash', '-lc', wrapped], {
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

async function which(binary: string): Promise<string | null> {
  const { stdout, exitCode } = await exec(`which ${binary}`)
  return exitCode === 0 && stdout ? stdout.split('\n')[0] : null
}

function normalizeOutput(text: string): string {
  return text
    .replace(ANSI_RE, '')
    .replace(/\r/g, '\n')
    .replace(CONTROL_RE, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function getOutputExcerpt(output: string): string | null {
  const trimmed = normalizeOutput(output)
  if (!trimmed) return null
  return trimmed.slice(-OUTPUT_EXCERPT_LENGTH)
}

function getRawOutputExcerpt(output: string): string | null {
  const trimmed = output.trim()
  if (!trimmed) return null
  return JSON.stringify(trimmed.slice(-OUTPUT_EXCERPT_LENGTH))
}

function derivePrompt(output: string): string | null {
  const lines = normalizeOutput(output).split('\n').map((line) => line.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (/^script (started|done)/i.test(line)) continue
    return line
  }
  return null
}

function getWorkspaceTrustTarget() {
  return resolve(process.env.HOME ?? '/root')
}

function normalizeTrustTarget(target: string) {
  return resolve(target)
}

function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** Respond to terminal queries that TUI apps expect answers for. */
function answerTerminalQueries(chunk: string, terminal: TerminalSession, sessionId: string) {
  for (const { pattern, response, label } of TERMINAL_QUERY_RESPONSES) {
    if (pattern.test(chunk)) {
      recordDebugEvent(sessionId, `Responding to terminal query: ${label}`)
      terminal.send(response)
    }
  }
}

function readTrustMarkers(): Record<string, true> {
  try {
    if (!existsSync(TRUST_MARKER_FILE)) return {}
    const parsed = JSON.parse(readFileSync(TRUST_MARKER_FILE, 'utf8')) as Record<string, true>
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function writeTrustMarkers(markers: Record<string, true>) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(TRUST_MARKER_FILE, `${JSON.stringify(markers, null, 2)}\n`)
}

function hasStoredTrust(target = getWorkspaceTrustTarget()) {
  const markers = readTrustMarkers()
  return Boolean(markers[normalizeTrustTarget(target)])
}

function storeTrustedTarget(target = getWorkspaceTrustTarget()) {
  const markers = readTrustMarkers()
  markers[normalizeTrustTarget(target)] = true
  writeTrustMarkers(markers)
}

async function getGitHubAuthStatus(): Promise<{
  authenticated: boolean
  githubUsername: string | null
  output: string | null
}> {
  const ghPath = await which('gh')
  if (!ghPath) {
    return {
      authenticated: false,
      githubUsername: null,
      output: 'GitHub CLI is not installed.',
    }
  }

  const authResult = await exec('gh auth status 2>&1')
  const authenticated = authResult.exitCode === 0

  let githubUsername: string | null = null
  if (authenticated) {
    const userResult = await exec('gh api user --jq .login')
    if (userResult.exitCode === 0 && userResult.stdout) {
      githubUsername = userResult.stdout.trim()
    }
  }

  return {
    authenticated,
    githubUsername,
    output: authResult.stdout || authResult.stderr || null,
  }
}

async function detectCopilotVersion(): Promise<string | null> {
  const candidates = [
    'gh copilot -- --version 2>&1',
    'copilot --version 2>&1',
  ]

  for (const command of candidates) {
    const result = await exec(command)
    const combined = `${result.stdout}\n${result.stderr}`.trim()
    const match = combined.match(/(\d+\.\d+[\.\d]*)/)
    if (match) return match[1]
  }

  return null
}

function syncPersistedCopilotStatus(status: CopilotSetupStatus) {
  if (status.installed && status.path) {
    upsertToolPath('copilot_cli', status.path, status.version, status.authenticated && status.trust_configured)
  } else {
    deleteToolRecord('copilot_cli')
  }
}

function parseTrustState(session: InternalTrustSession) {
  const normalized = normalizeOutput(session.output)
  const prompt = derivePrompt(session.output)
  const ready = READY_PATTERNS.some((pattern) => pattern.test(normalized))
  const awaitingTrust = TRUST_PROMPT_PATTERN.test(normalized) || TRUST_CONTINUE_PATTERN.test(normalized)
  const match = normalized.match(/confirm folder trust\s*\n([^\n]+)/i)
  const trustTarget = match?.[1]?.trim() || session.trustTarget || getWorkspaceTrustTarget()
  const lower = normalized.toLowerCase()
  const failed = /error|failed|denied/.test(lower) && !ready

  return {
    state: (ready
      ? 'trusted'
      : awaitingTrust
        ? 'awaiting_trust'
        : failed
          ? 'failed'
          : 'pending') as CopilotTrustSessionState,
    prompt,
    trustTarget,
    trusted: ready,
    error: failed ? (prompt ?? 'GitHub Copilot trust setup failed.') : null,
  }
}

function toTrustStatus(session: InternalTrustSession): CopilotTrustSessionStatus {
  return {
    session_id: session.id,
    state: session.state,
    prompt: session.prompt,
    output_excerpt: getOutputExcerpt(session.output),
    trust_target: session.trustTarget,
    trusted: session.trusted,
    completed: session.completed,
    error: session.error,
  }
}

function completeTrustSession(session: InternalTrustSession) {
  if (session.completed) return
  recordDebugEvent(session.id, `Trust completed for ${session.trustTarget ?? getWorkspaceTrustTarget()}`)
  session.trusted = true
  session.state = 'trusted'
  session.completed = true
  session.error = null
  session.trustTarget = session.trustTarget || getWorkspaceTrustTarget()
  storeTrustedTarget(session.trustTarget)
  session.updatedAt = Date.now()
  try {
    session.terminal.send('\u0003')
  } catch {
    // Best-effort cleanup after trust is recorded.
  }
}

function refreshTrustSessionState(session: InternalTrustSession) {
  if (!session.uiReady && COPILOT_UI_READY_PATTERN.test(session.output)) {
    session.uiReady = true
    session.updatedAt = Date.now()
    recordDebugEvent(session.id, 'Copilot alternate-screen UI detected')
    scheduleFallbackTrustAttempt(session)
  }

  const derived = parseTrustState(session)

  if (derived.state === 'awaiting_trust' && !session.trustHandled) {
    recordDebugEvent(session.id, `Trust prompt detected for ${derived.trustTarget ?? 'unknown target'}; selecting option 2 (remember) with arrow-down + enter`)
    session.trustHandled = true
    session.trustTarget = derived.trustTarget
    session.prompt = derived.prompt
    session.state = 'pending'
    session.updatedAt = Date.now()
    // Arrow down to select option 2 ("Yes, and remember this folder"), then enter
    session.terminal.send('\x1b[B')
    setTimeout(() => {
      const latest = trustSessions.get(session.id)
      if (latest && !latest.completed) {
        latest.terminal.send('\r')
      }
    }, 300)
    return
  }

  session.prompt = derived.prompt
  session.trustTarget = derived.trustTarget
  session.error = derived.error
  session.updatedAt = Date.now()

  if (derived.trusted) {
    completeTrustSession(session)
    return
  }

  session.state = session.completed && !session.trusted ? 'failed' : derived.state
}

/** Minimum word count in normalized output to consider the TUI as rendered. */
const MIN_TUI_WORDS = 4

function hasMeaningfulText(output: string): boolean {
  const normalized = normalizeOutput(output)
  const words = normalized.split(/\s+/).filter((w) => w.length > 1)
  return words.length >= MIN_TUI_WORDS
}

function scheduleFallbackTrustAttempt(session: InternalTrustSession, attempt = 0) {
  if (session.fallbackTrustAttempted || session.completed || session.trusted || !session.uiReady) return

  const sessionId = session.id
  // First check at 3s, then retry every 2s up to 5 attempts (total ~13s before giving up)
  const delay = attempt === 0 ? 3000 : 2000
  const maxAttempts = 5

  setTimeout(() => {
    const latest = trustSessions.get(sessionId)
    if (!latest || latest.completed || latest.trusted || latest.trustHandled || latest.fallbackTrustAttempted || !latest.uiReady) return

    // Don't send keystrokes until the TUI has actually rendered text content
    if (!hasMeaningfulText(latest.output)) {
      if (attempt < maxAttempts) {
        recordDebugEvent(sessionId, `Fallback check ${attempt + 1}: TUI not fully rendered yet, waiting...`)
        scheduleFallbackTrustAttempt(latest, attempt + 1)
      } else {
        recordDebugEvent(sessionId, `Fallback: TUI never rendered text after ${maxAttempts + 1} checks; session will be caught by timeout`)
        latest.fallbackTrustAttempted = true
      }
      return
    }

    latest.fallbackTrustAttempted = true
    latest.updatedAt = Date.now()

    // Check if copilot went straight to ready (trust already handled by user)
    const normalized = normalizeOutput(latest.output)
    const alreadyReady = READY_PATTERNS.some((p) => p.test(normalized))
    if (alreadyReady) {
      recordDebugEvent(sessionId, 'Copilot already at ready screen (trust was handled externally); completing session')
      completeTrustSession(latest)
      return
    }

    // Check if trust prompt is actually visible before sending keystrokes
    const hasTrustPrompt = TRUST_PROMPT_PATTERN.test(normalized) || TRUST_CONTINUE_PATTERN.test(normalized)
    if (hasTrustPrompt) {
      recordDebugEvent(sessionId, 'Fallback: trust prompt found in rendered TUI; sending arrow-down + enter')
      latest.terminal.send('\x1b[B')
      setTimeout(() => {
        const current = trustSessions.get(sessionId)
        if (current && !current.completed) {
          current.terminal.send('\r')
        }
      }, 300)
    } else {
      recordDebugEvent(sessionId, `Fallback: TUI rendered but no trust prompt or ready pattern found; normalized excerpt: ${normalized.slice(-200)}`)
    }
  }, delay)
}

function scheduleSessionTimeout(sessionId: string) {
  setTimeout(() => {
    const session = trustSessions.get(sessionId)
    if (!session || session.completed || session.trusted) return

    recordDebugEvent(sessionId, 'Trust session timed out after 30s; finalizing')
    void finalizeTrustSession(sessionId)
  }, 30_000)
}

async function finalizeTrustSession(sessionId: string) {
  const session = trustSessions.get(sessionId)
  if (!session) return

  recordDebugEvent(sessionId, 'Terminal session exited; finalizing trust session')
  refreshTrustSessionState(session)
  if (session.trusted) return

  const status = await checkCopilotStatus()
  session.trusted = status.trust_configured
  session.trustTarget = status.trust_target ?? session.trustTarget
  session.completed = true
  session.state = status.trust_configured ? 'trusted' : 'failed'
  session.error = status.trust_configured ? null : (session.error ?? 'GitHub Copilot trust could not be verified.')
  recordDebugEvent(sessionId, `Finalize result: state=${session.state} trusted=${session.trusted ? 'yes' : 'no'} error=${session.error ?? 'none'}`)
}

function disposeExistingTrustSessions() {
  for (const session of trustSessions.values()) {
    session.terminal.kill()
  }
  trustSessions.clear()
}

async function waitForTrustBootstrap(sessionId: string, timeoutMs = 3000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const session = trustSessions.get(sessionId)
    if (!session) return
    if (session.output.trim().length > 0) return
    await Bun.sleep(100)
  }
}

function getTrustSessionOrThrow(sessionId: string) {
  const session = trustSessions.get(sessionId)
  if (!session) {
    throw new Error('Copilot trust session not found')
  }
  return session
}

export async function checkCopilotStatus(): Promise<CopilotSetupStatus> {
  const path = await which('copilot')
  const ghStatus = await getGitHubAuthStatus()
  const trustConfigured = hasStoredTrust()
  const trustTarget = getWorkspaceTrustTarget()

  if (!path) {
    const status = {
      installed: false,
      version: null,
      path: null,
      authenticated: ghStatus.authenticated,
      github_username: ghStatus.githubUsername,
      auth_output: ghStatus.output,
      trust_configured: trustConfigured,
      trust_target: trustTarget,
    } satisfies CopilotSetupStatus
    syncPersistedCopilotStatus(status)
    return status
  }

  const version = await detectCopilotVersion()
  const status = {
    installed: true,
    version,
    path,
    authenticated: ghStatus.authenticated,
    github_username: ghStatus.githubUsername,
    auth_output: ghStatus.output,
    trust_configured: trustConfigured,
    trust_target: trustTarget,
  } satisfies CopilotSetupStatus

  syncPersistedCopilotStatus(status)
  return status
}

export async function installCopilot(): Promise<CopilotInstallResult> {
  const { stdout, stderr, exitCode } = await exec(COPILOT_INSTALL_COMMAND, 240_000)
  const output = [stdout, stderr].filter(Boolean).join('\n').trim() || null

  if (exitCode !== 0) {
    return {
      success: false,
      installed: false,
      version: null,
      path: null,
      output,
      error: output ?? 'Failed to install GitHub Copilot CLI.',
    }
  }

  const status = await checkCopilotStatus()
  return {
    success: status.installed,
    installed: status.installed,
    version: status.version,
    path: status.path,
    output,
    error: status.installed ? null : 'GitHub Copilot install completed but the binary was not detected.',
  }
}

export async function startCopilotTrust(): Promise<CopilotTrustStartResult> {
  disposeExistingTrustSessions()

  const copilotPath = await which('copilot')
  const ghStatus = await getGitHubAuthStatus()
  recordDebugEvent(null, `Copilot trust preflight: copilotPath=${copilotPath ?? 'missing'} ghAuthenticated=${ghStatus.authenticated ? 'yes' : 'no'} ghUser=${ghStatus.githubUsername ?? 'none'}`)

  let session: InternalTrustSession | null = null
  const sessionId = crypto.randomUUID()
  recordDebugEvent(sessionId, `Starting Copilot trust flow in ${getWorkspaceTrustTarget()}`)
  const terminal = createTerminalSession(
    `copilot-trust-${sessionId}`,
    (chunk) => {
      if (!session) return
      session.output = `${session.output}${chunk}`.slice(-MAX_OUTPUT_LENGTH)
      recordDebugEvent(sessionId, `PTY output chunk received (${chunk.length} chars)`)
      answerTerminalQueries(chunk, session.terminal, sessionId)
      refreshTrustSessionState(session)
    },
    (exitCode) => {
      recordDebugEvent(sessionId, `PTY exited with code ${exitCode}`)
      void finalizeTrustSession(sessionId)
    },
    getWorkspaceTrustTarget(),
  )

  session = {
    id: sessionId,
    terminal,
    output: '',
    state: 'starting',
    prompt: null,
    trustTarget: getWorkspaceTrustTarget(),
    trusted: false,
    completed: false,
    error: null,
    trustHandled: false,
    fallbackTrustAttempted: false,
    uiReady: false,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }

  trustSessions.set(sessionId, session)
  scheduleSessionTimeout(sessionId)
  const launchCommand = `exec ${shellEscape(copilotPath ?? 'copilot')}`
  recordDebugEvent(sessionId, `Sending \`${launchCommand}\` to PTY session`)
  terminal.send(`${launchCommand}\n`)

  await waitForTrustBootstrap(sessionId)
  refreshTrustSessionState(session)
  recordDebugEvent(sessionId, `Bootstrap complete: state=${session.state} prompt=${session.prompt ?? 'none'}`)
  return toTrustStatus(session)
}

export function getCopilotTrustStatus(sessionId: string): CopilotTrustSessionStatus {
  const session = getTrustSessionOrThrow(sessionId)
  recordDebugEvent(sessionId, `Status requested: current state=${session.state}`)
  refreshTrustSessionState(session)
  return toTrustStatus(session)
}

export async function verifyCopilotSetup(): Promise<CopilotSetupStatus> {
  const status = await checkCopilotStatus()
  if (status.installed && status.authenticated && !status.trust_configured) {
    disposeExistingTrustSessions()
    let session: InternalTrustSession | null = null
    const sessionId = crypto.randomUUID()
    const terminal = createTerminalSession(
      `copilot-verify-${sessionId}`,
      (chunk) => {
        if (!session) return
        session.output = `${session.output}${chunk}`.slice(-MAX_OUTPUT_LENGTH)
        answerTerminalQueries(chunk, session.terminal, sessionId)
        refreshTrustSessionState(session)
      },
      (exitCode) => {
        recordDebugEvent(sessionId, `Verify PTY exited with code ${exitCode}`)
        void finalizeTrustSession(sessionId)
      },
      getWorkspaceTrustTarget(),
    )

    session = {
      id: sessionId,
      terminal,
      output: '',
      state: 'starting',
      prompt: null,
      trustTarget: getWorkspaceTrustTarget(),
      trusted: false,
      completed: false,
      error: null,
      trustHandled: false,
      fallbackTrustAttempted: false,
      uiReady: false,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    }
    trustSessions.set(sessionId, session)
    terminal.send(`exec ${shellEscape(status.path ?? 'copilot')}\n`)
    await Bun.sleep(2000)
    refreshTrustSessionState(session)
    if (session.trusted) {
      storeTrustedTarget(session.trustTarget ?? getWorkspaceTrustTarget())
    }
    try {
      terminal.kill()
    } catch {
      // Best-effort cleanup.
    }
  }

  return checkCopilotStatus()
}

export const __test = {
  normalizeOutput,
  parseTrustStateFromOutput(output: string) {
    const session: InternalTrustSession = {
      id: 'test',
      terminal: null as unknown as TerminalSession,
      output,
      state: 'starting',
      prompt: null,
      trustTarget: getWorkspaceTrustTarget(),
      trusted: false,
      completed: false,
      error: null,
      trustHandled: false,
      fallbackTrustAttempted: false,
      uiReady: false,
      startedAt: 0,
      updatedAt: 0,
    }
    return parseTrustState(session)
  },
  getOutputExcerpt,
  getPersistedState() {
    return getToolRecord('copilot_cli')
  },
}

export function getCopilotAuthDebug() {
  const sessions = Array.from(trustSessions.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((session) => ({
      sessionId: session.id,
      state: session.state,
      trusted: session.trusted,
      completed: session.completed,
      prompt: session.prompt,
      trustTarget: session.trustTarget,
      trustHandled: session.trustHandled,
      fallbackTrustAttempted: session.fallbackTrustAttempted,
      uiReady: session.uiReady,
      error: session.error,
      startedAt: new Date(session.startedAt).toISOString(),
      updatedAt: new Date(session.updatedAt).toISOString(),
      outputExcerpt: getOutputExcerpt(session.output),
      rawOutputExcerpt: getRawOutputExcerpt(session.output),
    }))

  return {
    activeSessionCount: sessions.length,
    sessions,
    persistedState: getToolRecord('copilot_cli'),
    trustMarkers: Object.keys(readTrustMarkers()).sort(),
    events: copilotDebugEvents,
    liveStatusTarget: getWorkspaceTrustTarget(),
    liveStatus: {
      trustConfigured: hasStoredTrust(),
    },
  }
}
