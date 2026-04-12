import { getToolPath } from '../../db/index.ts'
import { createTerminalSession, type TerminalSession } from '../terminal/terminal.ts'
import type {
  ServerModelDiscovery,
  ServerSelectableModel,
} from '@pocketdev/shared/types'

const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[@-_]/g
const CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g
const BLOCK_CHARS_RE = /[█▘▝▗▖▐▌▀▄░▒▓]/g
const MODEL_ROW_RE = /^(?:[>❯✓\s]*)?(.+?)\s+(\d+(?:\.\d+)?)x\s*$/
const READY_PATTERNS = [
  /type @ to mention files/i,
  /describe a task to get started/i,
  /shortcuts/i,
]

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

type CopilotDiscoveryResult = {
  models: ServerSelectableModel[]
  modelDiscovery: ServerModelDiscovery
}

type PickerRow = {
  name: string
  premiumMultiplier: number
}

const KNOWN_MODEL_ID_OVERRIDES: Record<string, string> = {
  'Claude Opus 4.6 (fast mode)': 'claude-opus-4.6-fast',
  'GPT-5 mini': 'gpt-5-mini',
  'GPT-5.3-Codex': 'gpt-5.3-codex',
  'GPT-5.2-Codex': 'gpt-5.2-codex',
}

const FALLBACK_PICKER_ROWS: PickerRow[] = [
  { name: 'Claude Sonnet 4.6', premiumMultiplier: 1 },
  { name: 'Claude Sonnet 4.5', premiumMultiplier: 1 },
  { name: 'Claude Haiku 4.5', premiumMultiplier: 0.33 },
  { name: 'Claude Opus 4.6', premiumMultiplier: 3 },
  { name: 'Claude Opus 4.6 (fast mode)', premiumMultiplier: 30 },
  { name: 'Claude Opus 4.5', premiumMultiplier: 3 },
  { name: 'Claude Sonnet 4', premiumMultiplier: 1 },
  { name: 'GPT-5.4', premiumMultiplier: 1 },
  { name: 'GPT-5.3-Codex', premiumMultiplier: 1 },
  { name: 'GPT-5.2-Codex', premiumMultiplier: 1 },
  { name: 'GPT-5.2', premiumMultiplier: 1 },
  { name: 'GPT-5.1', premiumMultiplier: 1 },
  { name: 'GPT-5 mini', premiumMultiplier: 0 },
  { name: 'GPT-4.1', premiumMultiplier: 0 },
]

const FALLBACK_COPILOT_MODELS = FALLBACK_PICKER_ROWS.map((row) => pickerRowToModel(row))

let cachedDiscovery: CopilotDiscoveryResult | null = null

export async function discoverCopilotModels(): Promise<CopilotDiscoveryResult> {
  if (cachedDiscovery) return cachedDiscovery

  try {
    const binary = await findCopilotBinary()
    if (!binary) {
      return fallbackDiscovery('Copilot CLI is not installed.')
    }

    const pickerOutput = await captureCopilotModelPicker(binary)
    const rows = parsePickerRows(pickerOutput)
    if (rows.length === 0) {
      return fallbackDiscovery('Copilot /model picker did not contain parseable model rows.')
    }

    const models = rows.map((row) => pickerRowToModel(row))
    cachedDiscovery = {
      models,
      modelDiscovery: {
        available: true,
        discoveredCount: models.length,
        source: 'picker',
      },
    }
    return cachedDiscovery
  } catch (error) {
    return fallbackDiscovery(error instanceof Error ? error.message : 'Unknown Copilot model discovery failure.')
  }
}

async function findCopilotBinary(): Promise<string | null> {
  const savedPath = getToolPath('copilot_cli')
  if (savedPath) return savedPath

  const result = await exec('which copilot')
  if (result.exitCode === 0 && result.stdout) {
    return result.stdout.split('\n')[0]?.trim() || null
  }

  return null
}

async function captureCopilotModelPicker(binary: string): Promise<string> {
  const sessionId = `copilot-models-${crypto.randomUUID()}`
  let output = ''
  let terminal: TerminalSession | null = null
  const answeredQueries = new Set<string>()

  try {
    terminal = createTerminalSession(
      sessionId,
      (chunk) => {
        output = `${output}${chunk}`.slice(-64_000)
        if (terminal) answerTerminalQueries(chunk, terminal, answeredQueries)
      },
      () => {},
      process.env.HOME ?? process.cwd(),
    )

    terminal.resize(120, 40)
    await Bun.sleep(250)
    terminal.send(`${shellEscape(binary)}\n`)

    const ready = await waitFor(() => isCopilotReady(output), 30_000)
    if (!ready) {
      throw new Error(`Timed out waiting for Copilot to become ready. Output excerpt: ${getOutputExcerpt(output)}`)
    }

    terminal.send('/model\n')

    const pickerReady = await waitFor(() => hasModelPicker(output), 15_000)
    if (!pickerReady) {
      throw new Error(`Timed out waiting for Copilot model picker. Output excerpt: ${getOutputExcerpt(output)}`)
    }

    await Bun.sleep(750)
    return output
  } finally {
    if (terminal) {
      try { terminal.send('\u0003') } catch { /* ignore */ }
      await Bun.sleep(150)
      try { terminal.send('\u0003') } catch { /* ignore */ }
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

function parsePickerRows(output: string): PickerRow[] {
  const normalized = normalizeOutput(output)
  const rows: PickerRow[] = []
  const seen = new Set<string>()

  for (const line of normalized.split('\n')) {
    const match = line.match(MODEL_ROW_RE)
    if (!match) continue

    const rawName = match[1]
      .replace(/\(default\)/gi, '')
      .replace(/[✓]/g, '')
      .replace(/\(Preview\)/gi, '')
      .trim()
    const premiumMultiplier = Number.parseFloat(match[2])
    if (!rawName || Number.isNaN(premiumMultiplier) || seen.has(rawName)) continue

    seen.add(rawName)
    rows.push({ name: rawName, premiumMultiplier })
  }

  return rows
}

function pickerRowToModel(row: PickerRow): ServerSelectableModel {
  const cliModelId = displayNameToModelId(row.name)
  return {
    id: cliModelId,
    cliModelId,
    name: row.name,
    headline: buildHeadline(cliModelId),
    description: buildDescription(cliModelId),
    contextWindow: 'Managed by Copilot',
    premiumMultiplier: row.premiumMultiplier,
  }
}

function displayNameToModelId(name: string): string {
  const trimmed = name.trim()
  if (KNOWN_MODEL_ID_OVERRIDES[trimmed]) return KNOWN_MODEL_ID_OVERRIDES[trimmed]

  return trimmed
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function buildHeadline(modelId: string): string {
  if (modelId.startsWith('claude-opus')) return 'Highest-reasoning Copilot option'
  if (modelId.startsWith('claude-haiku')) return 'Fast Copilot responses for lighter tasks'
  if (modelId.startsWith('claude-sonnet')) return 'Balanced Copilot model for daily coding'
  if (modelId.includes('codex')) return 'Code-focused GPT variant for implementation work'
  if (modelId.includes('mini')) return 'Fastest low-cost Copilot option'
  if (modelId.startsWith('gpt-5')) return 'Frontier GPT model available through Copilot'
  if (modelId.startsWith('gpt-4')) return 'Included GPT fallback for routine tasks'
  return 'GitHub Copilot model'
}

function buildDescription(modelId: string): string {
  if (modelId === 'claude-opus-4.6-fast') {
    return 'Preview fast mode variant surfaced by the Copilot model picker.'
  }
  if (modelId.startsWith('claude-opus')) {
    return 'Use when you want stronger reasoning and are willing to spend more premium requests.'
  }
  if (modelId.startsWith('claude-sonnet')) {
    return 'Good default for most coding, planning, and debugging tasks in Copilot.'
  }
  if (modelId.startsWith('claude-haiku')) {
    return 'Lower-cost Claude option for shorter or simpler sessions.'
  }
  if (modelId.includes('codex')) {
    return 'Code-oriented GPT variant available from the Copilot model picker.'
  }
  if (modelId.includes('mini')) {
    return 'Included model with no premium multiplier in the Copilot picker.'
  }
  if (modelId.startsWith('gpt-4.1')) {
    return 'Included GPT model for general help without premium request cost.'
  }
  if (modelId.startsWith('gpt-5')) {
    return 'General-purpose GPT model available through Copilot model selection.'
  }
  return 'Available through the GitHub Copilot interactive model picker.'
}

function fallbackDiscovery(error: string): CopilotDiscoveryResult {
  return {
    models: FALLBACK_COPILOT_MODELS,
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

function isCopilotReady(output: string): boolean {
  const normalized = normalizeOutput(output)
  return READY_PATTERNS.some((pattern) => pattern.test(normalized))
}

function hasModelPicker(output: string): boolean {
  const normalized = normalizeOutput(output)
  return /select model/i.test(normalized) && parsePickerRows(normalized).length > 0
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

async function exec(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bash', '-lc', command], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      HOME: process.env.HOME ?? process.env.USERPROFILE ?? '/root',
    },
  })

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode: proc.exitCode ?? 1,
  }
}

export const __test = {
  FALLBACK_COPILOT_MODELS,
  parsePickerRows,
  displayNameToModelId,
}
