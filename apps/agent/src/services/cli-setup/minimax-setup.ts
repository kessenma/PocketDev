import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { upsertToolPath } from '../../db/index.ts'
import { checkOpenCodeStatus } from './opencode-setup.ts'
import type { MinimaxConfigureResult, MinimaxSetupStatus } from '@pocketdev/shared/types'

const CONFIG_CANDIDATES = [
  `${process.env.HOME ?? '/root'}/.config/opencode/config.json`,
  `${process.env.HOME ?? '/root'}/.opencode/config.json`,
]

function maskKey(key: string): string {
  return `sk-mm-...${key.slice(-4)}`
}

function findConfigPath(): string | null {
  for (const candidate of CONFIG_CANDIDATES) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

function readConfigJson(path: string): Record<string, unknown> {
  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

function getApiKeyFromConfig(config: Record<string, unknown>): string | null {
  const providers = config.providers as Record<string, unknown> | undefined
  if (providers) {
    const minimax = providers.minimax as Record<string, unknown> | undefined
    if (typeof minimax?.apiKey === 'string' && minimax.apiKey) return minimax.apiKey
  }
  return null
}

function deepSet(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (typeof cur[key] !== 'object' || cur[key] === null) {
      cur[key] = {}
    }
    cur = cur[key] as Record<string, unknown>
  }
  cur[path[path.length - 1]] = value
}

export async function checkMinimaxStatus(): Promise<MinimaxSetupStatus> {
  const openCodeStatus = await checkOpenCodeStatus()

  // Check env var fallback
  const envKey = process.env.MINIMAX_API_KEY ?? null

  const configPath = findConfigPath()
  let apiKey: string | null = null

  if (configPath) {
    const config = readConfigJson(configPath)
    apiKey = getApiKeyFromConfig(config)
  }

  if (!apiKey && envKey) {
    apiKey = envKey
  }

  const configured = !!apiKey

  if (configured && openCodeStatus.installed && configPath) {
    upsertToolPath('minimax_provider', configPath, openCodeStatus.version, true)
  }

  return {
    opencode_installed: openCodeStatus.installed,
    opencode_version: openCodeStatus.version,
    api_key_configured: configured,
    api_key_masked: configured ? maskKey(apiKey!) : null,
    verified: configured,
    verify_output: null,
  }
}

export async function configureMinimaxKey(apiKey: string): Promise<MinimaxConfigureResult> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, api_key_masked: null, error: 'API key must not be empty.' }
  }

  const trimmedKey = apiKey.trim()

  // Try CLI first: opencode config set providers.minimax.apiKey <key>
  const openCodeStatus = await checkOpenCodeStatus()
  if (openCodeStatus.installed && openCodeStatus.path) {
    const home = process.env.HOME ?? '/root'
    const proc = Bun.spawn(
      [openCodeStatus.path, 'config', 'set', 'providers.minimax.apiKey', trimmedKey],
      { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, HOME: home } },
    )
    await proc.exited
    if (proc.exitCode === 0) {
      const masked = maskKey(trimmedKey)
      upsertToolPath('minimax_provider', openCodeStatus.path, openCodeStatus.version)
      return { success: true, api_key_masked: masked, error: null }
    }
    // CLI subcommand not available — fall through to direct file patch
  }

  // Direct JSON patch
  let configPath = findConfigPath()
  if (!configPath) {
    // Use the first candidate path and create it
    configPath = CONFIG_CANDIDATES[0]
    const dir = configPath.replace(/\/[^/]+$/, '')
    const mkdirProc = Bun.spawn(['mkdir', '-p', dir], { stdout: 'pipe', stderr: 'pipe' })
    await mkdirProc.exited
  }

  const config = readConfigJson(configPath)
  deepSet(config, ['providers', 'minimax', 'apiKey'], trimmedKey)

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (e) {
    return {
      success: false,
      api_key_masked: null,
      error: `Failed to write config: ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  const masked = maskKey(trimmedKey)
  upsertToolPath('minimax_provider', configPath, openCodeStatus.version)
  return { success: true, api_key_masked: masked, error: null }
}

export async function verifyMinimax(): Promise<MinimaxSetupStatus> {
  return checkMinimaxStatus()
}
