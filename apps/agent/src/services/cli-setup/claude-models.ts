import { getToolPath, getConfig, setConfig } from '../../db/index.ts'
import { createTerminalSession, type TerminalSession } from '../terminal/terminal.ts'
import type {
  ServerModelDiscovery,
  ServerSelectableModel,
} from '@pocketdev/shared/types'

const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[@-_]/g
const CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g
const BLOCK_CHARS_RE = /[█▘▝▗▖▐▌▀▄░▒▓]/g

// Matches numbered picker rows: "  1. Default (recommended)  Opus 4.7 with 1M context · ..."
const MODEL_ROW_RE = /^\s*(?:[>❯✓✔\s]*)?\s*\d+\.\s+(.+?)\s{2,}(.+)$/

const READY_PATTERNS = [
  /type @ to mention/i,
  /what would you like/i,
  />\s*$/,
]

const TRUST_PATTERNS = [
  /yes.*i trust this folder/i,
  /is this a project you (created|trust)/i,
]

const PICKER_FOOTER_RE = /enter to confirm.*esc to exit/i

const TERMINAL_QUERY_RESPONSES: Array<{ pattern: RegExp; response: string }> = [
  { pattern: /\u001b\[>c/, response: '\u001b[>0;0;0c' },
  { pattern: /\u001b\[(?!>)c/, response: '\u001b[?62;22c' },
  { pattern: /\u001b\[6n/, response: '\u001b[1;1R' },
  { pattern: /\u001b\[>q/, response: '\u001bP>|xterm-256color\u001b\\' },
  { pattern: /\u001b\]11;\?(?:\u001b\\|\u0007)/, response: '\u001b]11;rgb:0a0a/0a0a/0a0a\u001b\\' },
  { pattern: /\u001b\]10;\?(?:\u001b\\|\u0007)/, response: '\u001b]10;rgb:f4f0/e8e8/d0d0\u001b\\' },
  { pattern: /\u001b\[\?u/, response: '\u001b[?0u' },
  { pattern: /\u001b\]4;\d+;\?(?:\u001b\\|\u0007)/, response: '\u001b]4;0;rgb:0000/0000/0000\u001b\\' },
  { pattern: /\u001b\[18t/, response: '\u001b[8;40;120t' },
  { pattern: /\u001b\[\?1004h/, response: '\u001b[I' },
]

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const DB_CACHE_KEY = 'claude_model_cache'
const DB_CACHE_AT_KEY = 'claude_model_cache_at'

type ClaudeDiscoveryResult = {
  models: ServerSelectableModel[]
  modelDiscovery: ServerModelDiscovery
}

type ParsedRow = {
  label: string
  description: string
}

const FALLBACK_MODELS: ServerSelectableModel[] = [
  {
    id: 'claude-opus-4-7',
    cliModelId: 'claude-opus-4-7',
    name: 'Claude Opus 4.7',
    headline: 'Deep reasoning for harder refactors',
    description: 'Use when the task needs stronger planning or higher-confidence architectural work.',
    contextWindow: '1M context',
  },
  {
    id: 'claude-sonnet-4-6',
    cliModelId: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    headline: 'Balanced default for most coding sessions',
    description: 'Good fit for day-to-day implementation, review, and bug fixing.',
    contextWindow: '200K context',
  },
  {
    id: 'claude-sonnet-4-6-1m',
    cliModelId: 'claude-sonnet-4-6[1m]',
    name: 'Claude Sonnet 4.6 (1M)',
    headline: 'Extended context with balanced speed',
    description: 'Sonnet speed with full 1M context window for larger tasks.',
    contextWindow: '1M context',
  },
  {
    id: 'claude-haiku-4-5',
    cliModelId: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    headline: 'Fast responses for lighter tasks',
    description: 'Useful for short edits, summaries, or lightweight debugging loops.',
    contextWindow: '200K context',
  },
]

let cachedDiscovery: ClaudeDiscoveryResult | null = null
let cachedAt = 0

export async function discoverClaudeModels(): Promise<ClaudeDiscoveryResult> {
  // In-memory cache
  if (cachedDiscovery && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedDiscovery
  }

  // SQLite cache (survives restarts)
  const dbCacheRaw = getConfig(DB_CACHE_KEY)
  const dbCacheAt = getConfig(DB_CACHE_AT_KEY)
  if (dbCacheRaw && dbCacheAt) {
    const age = Date.now() - new Date(dbCacheAt).getTime()
    if (age < CACHE_TTL_MS) {
      try {
        const parsed = JSON.parse(dbCacheRaw) as ClaudeDiscoveryResult
        cachedDiscovery = parsed
        cachedAt = Date.now() - age
        return cachedDiscovery
      } catch {
        // corrupted cache — fall through to fresh discovery
      }
    }
  }

  try {
    const binary = getToolPath('claude_cli')
    if (!binary) {
      return fallbackDiscovery('Claude CLI is not installed.')
    }

    const pickerOutput = await captureClaudeModelPicker(binary)
    const rows = parsePickerRows(pickerOutput)
    if (rows.length === 0) {
      return fallbackDiscovery('Claude /model picker did not contain parseable model rows.')
    }

    const models = rows.map(pickerRowToModel)
    cachedDiscovery = {
      models,
      modelDiscovery: {
        available: true,
        discoveredCount: models.length,
        source: 'picker',
      },
    }
    cachedAt = Date.now()

    // Persist to SQLite
    setConfig(DB_CACHE_KEY, JSON.stringify(cachedDiscovery))
    setConfig(DB_CACHE_AT_KEY, new Date().toISOString())

    return cachedDiscovery
  } catch (error) {
    return fallbackDiscovery(error instanceof Error ? error.message : 'Unknown Claude model discovery failure.')
  }
}

async function captureClaudeModelPicker(binary: string): Promise<string> {
  const sessionId = `claude-models-${crypto.randomUUID()}`
  let output = ''
  let terminal: TerminalSession | null = null
  const answeredQueries = new Set<string>()
  let trustAnswered = false

  try {
    terminal = createTerminalSession(
      sessionId,
      (chunk) => {
        output = `${output}${chunk}`.slice(-64_000)
        if (terminal) answerTerminalQueries(chunk, terminal, answeredQueries)

        // Answer the trust prompt once if it appears
        if (!trustAnswered && terminal) {
          const normalized = normalizeOutput(output)
          if (TRUST_PATTERNS.some((p) => p.test(normalized))) {
            trustAnswered = true
            terminal.send('1\n')
          }
        }
      },
      () => {},
      '/tmp',
    )

    terminal.resize(120, 40)
    await Bun.sleep(250)
    terminal.send(`${shellEscape(binary)} --dangerously-skip-permissions\n`)

    const ready = await waitFor(() => isClaudeReady(output), 30_000)
    if (!ready) {
      throw new Error(`Timed out waiting for Claude to become ready. Output excerpt: ${getOutputExcerpt(output)}`)
    }

    terminal.send('/model\n')

    const pickerReady = await waitFor(() => hasModelPicker(output), 15_000)
    if (!pickerReady) {
      throw new Error(`Timed out waiting for Claude model picker. Output excerpt: ${getOutputExcerpt(output)}`)
    }

    await Bun.sleep(500)
    return output
  } finally {
    if (terminal) {
      try { terminal.send('\u001b') } catch { /* ignore */ }
      await Bun.sleep(150)
      try { terminal.send('/exit\n') } catch { /* ignore */ }
      await Bun.sleep(150)
      terminal.kill()
    }
  }
}

function answerTerminalQueries(chunk: string, terminal: TerminalSession, answeredQueries: Set<string>) {
  for (const { pattern, response } of TERMINAL_QUERY_RESPONSES) {
    if (answeredQueries.has(response)) continue
    if (pattern.test(chunk)) {
      answeredQueries.add(response)
      terminal.send(response)
    }
  }
}

function parsePickerRows(output: string): ParsedRow[] {
  const normalized = normalizeOutput(output)
  const rows: ParsedRow[] = []
  const seenLabels = new Set<string>()

  for (const line of normalized.split('\n')) {
    const match = line.match(MODEL_ROW_RE)
    if (!match) continue

    const label = match[1]
      .replace(/[✓✔]/g, '')
      .trim()
    const description = match[2].trim()

    if (!label || !description || seenLabels.has(label)) continue
    seenLabels.add(label)
    rows.push({ label, description })
  }

  return rows
}

function pickerRowToModel(row: ParsedRow): ServerSelectableModel {
  const cliModelId = deriveCliModelId(row.description)
  const id = cliModelId.replace(/\[1m\]$/, '-1m')
  return {
    id,
    cliModelId,
    name: buildDisplayName(row.label, row.description),
    headline: buildHeadline(cliModelId),
    description: buildDescription(cliModelId),
    contextWindow: row.description.toLowerCase().includes('1m context') ? '1M context' : '200K context',
  }
}

// Derive cliModelId from the description side of the picker row.
// e.g. "Opus 4.7 with 1M context · ..." → "claude-opus-4-7[1m]"
function deriveCliModelId(description: string): string {
  const desc = description.toLowerCase()
  const is1m = desc.includes('1m context')

  // Match "Opus 4.7", "Sonnet 4.6", "Haiku 4.5", etc.
  const match = description.match(/\b(Opus|Sonnet|Haiku)\s+(\d+\.\d+)/i)
  if (match) {
    const name = match[1].toLowerCase()
    const version = match[2]
    return is1m ? `claude-${name}-${version}[1m]` : `claude-${name}-${version}`
  }

  // Fallback: derive from the label words
  return description
    .toLowerCase()
    .replace(/\s*·.*$/, '')
    .replace(/\s*with\s+1m context/i, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function buildDisplayName(label: string, description: string): string {
  // "Default (recommended)" → use description's model name instead, e.g. "Claude Opus 4.7"
  const match = description.match(/\b(Opus|Sonnet|Haiku)\s+(\d+\.\d+)/i)
  if (match) {
    const is1m = description.toLowerCase().includes('1m context')
    return `Claude ${match[1]} ${match[2]}${is1m ? ' (1M)' : ''}`
  }
  return `Claude ${label}`
}

function buildHeadline(cliModelId: string): string {
  if (cliModelId.includes('opus')) return 'Deep reasoning for harder refactors'
  if (cliModelId.includes('haiku')) return 'Fast responses for lighter tasks'
  if (cliModelId.includes('[1m]') || cliModelId.includes('-1m')) return 'Extended context with balanced speed'
  if (cliModelId.includes('sonnet')) return 'Balanced default for most coding sessions'
  return 'Claude model'
}

function buildDescription(cliModelId: string): string {
  if (cliModelId.includes('opus')) return 'Use when the task needs stronger planning or higher-confidence architectural work.'
  if (cliModelId.includes('haiku')) return 'Useful for short edits, summaries, or lightweight debugging loops.'
  if (cliModelId.includes('[1m]') || cliModelId.includes('-1m')) return 'Sonnet speed with full 1M context window for larger tasks.'
  if (cliModelId.includes('sonnet')) return 'Good fit for day-to-day implementation, review, and bug fixing.'
  return 'Available through the Claude model picker.'
}

function fallbackDiscovery(error: string): ClaudeDiscoveryResult {
  return {
    models: FALLBACK_MODELS,
    modelDiscovery: {
      available: false,
      discoveredCount: 0,
      source: 'fallback',
      error,
    },
  }
}

function normalizeOutput(text: string): string {
  return text
    .replace(ANSI_RE, '')
    .replace(/\r/g, '\n')
    .replace(CONTROL_RE, ' ')
    .replace(BLOCK_CHARS_RE, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function isClaudeReady(output: string): boolean {
  const normalized = normalizeOutput(output)
  return READY_PATTERNS.some((p) => p.test(normalized))
}

function hasModelPicker(output: string): boolean {
  const normalized = normalizeOutput(output)
  return /select model/i.test(normalized) && PICKER_FOOTER_RE.test(normalized)
}

function getOutputExcerpt(output: string): string {
  return normalizeOutput(output).slice(-500)
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

async function waitFor(check: () => boolean, timeoutMs: number): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (check()) return true
    await Bun.sleep(100)
  }
  return false
}
