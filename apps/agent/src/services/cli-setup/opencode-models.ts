import { getConfig, setConfig, getToolPath } from '../../db/index.ts'
import type { ServerModelDiscovery, ServerSelectableModel } from '@pocketdev/shared/types'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g

type OpenCodeDiscoveryResult = {
  models: ServerSelectableModel[]
  modelDiscovery: ServerModelDiscovery
}

const FALLBACK_MODELS: Record<string, ServerSelectableModel[]> = {
  minimax: [
    { id: 'minimax-m2.7', cliModelId: 'minimax/MiniMax-M2.7', name: 'MiniMax M2.7', headline: '', description: '', contextWindow: 'Large context', premiumMultiplier: null },
    { id: 'minimax-m2.5', cliModelId: 'minimax/MiniMax-M2.5', name: 'MiniMax M2.5', headline: '', description: '', contextWindow: 'Large context', premiumMultiplier: null },
    { id: 'minimax-m2.5-highspeed', cliModelId: 'minimax/MiniMax-M2.5-highspeed', name: 'MiniMax M2.5 Highspeed', headline: '', description: '', contextWindow: 'Large context', premiumMultiplier: null },
    { id: 'minimax-m2.1', cliModelId: 'minimax/MiniMax-M2.1', name: 'MiniMax M2.1', headline: '', description: '', contextWindow: 'Large context', premiumMultiplier: null },
  ],
}

function cacheKey(provider: string) { return `opencode_models_${provider}` }
function cacheAtKey(provider: string) { return `opencode_models_${provider}_at` }

/** Slug-ify a display name for use as a stable ID, e.g. "MiniMax M2.7" → "minimax-m2.7" */
function toId(provider: string, displayName: string): string {
  return `${provider}-${displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, '')}`
}

/** Parse model lines from `opencode models <provider>` output */
function parseModelLines(raw: string, provider: string): ServerSelectableModel[] {
  const normalized = raw.replace(ANSI_RE, '').replace(/\r/g, '\n')
  const seen = new Set<string>()
  const models: ServerSelectableModel[] = []

  // Try JSON first (future-proof if opencode adds --json flag)
  try {
    const parsed = JSON.parse(normalized) as unknown
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'string' && item.trim()) {
          const name = item.trim()
          if (seen.has(name)) continue
          seen.add(name)
          models.push({
            id: toId(provider, name),
            cliModelId: `${provider}/${name}`,
            name,
            headline: '',
            description: '',
            contextWindow: 'Large context',
            premiumMultiplier: null,
          })
        }
      }
      if (models.length > 0) return models
    }
  } catch {
    // not JSON — fall through to line parsing
  }

  // Line-by-line parsing
  for (const raw_line of normalized.split('\n')) {
    const line = raw_line.trim()
    if (!line) continue
    // Skip provider header lines like "MiniMax (minimax.io)" or "Select model"
    if (/\(.*\)/.test(line)) continue
    if (/^select\s+model/i.test(line)) continue
    if (/^esc\b/i.test(line)) continue
    // A model line: starts with letter/digit, no spaces unless it's "Name M2.7" style
    if (!/^[A-Za-z0-9]/.test(line)) continue

    // Split on multiple spaces — handles "MiniMax-M2.7-highspeed MiniMax-M2.5-highspeed" on one line
    for (const candidate of line.split(/\s{2,}|\t/)) {
      const name = candidate.trim()
      if (!name || seen.has(name)) continue
      // Must look like a model name (contains letter+digit or dash)
      if (!/[A-Za-z]/.test(name) || !/[\d.-]/.test(name)) continue
      seen.add(name)
      models.push({
        id: toId(provider, name),
        cliModelId: `${provider}/${name}`,
        name,
        headline: '',
        description: '',
        contextWindow: 'Large context',
        premiumMultiplier: null,
      })
    }
  }

  return models
}

function fallbackDiscovery(provider: string, error: string): OpenCodeDiscoveryResult {
  const fallback = FALLBACK_MODELS[provider] ?? []
  return {
    models: fallback,
    modelDiscovery: { available: false, discoveredCount: 0, source: 'fallback', error },
  }
}

export async function discoverOpenCodeModels(provider: string): Promise<OpenCodeDiscoveryResult> {
  // SQLite cache
  const cached = getConfig(cacheKey(provider))
  const cachedAt = getConfig(cacheAtKey(provider))
  if (cached && cachedAt) {
    const age = Date.now() - new Date(cachedAt).getTime()
    if (age < CACHE_TTL_MS) {
      try {
        return JSON.parse(cached) as OpenCodeDiscoveryResult
      } catch {
        // corrupted — fall through
      }
    }
  }

  const opencodePath = getToolPath('opencode_cli') ?? 'opencode'

  try {
    const home = process.env.HOME ?? '/root'
    const pathPrefix = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/opt/homebrew/bin'
    const cmd = `export PATH="${pathPrefix}:$HOME/.opencode/bin:$HOME/.local/bin:$PATH"; '${opencodePath.replace(/'/g, `'\\''`)}' models ${provider}`
    const proc = Bun.spawn(['bash', '-lc', cmd], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: home },
    })
    const timer = setTimeout(() => proc.kill(), 15_000)
    const [stdout] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
    clearTimeout(timer)

    const models = parseModelLines(stdout, provider)
    if (models.length === 0) {
      return fallbackDiscovery(provider, `opencode models ${provider} returned no parseable model names`)
    }

    const result: OpenCodeDiscoveryResult = {
      models,
      modelDiscovery: { available: true, discoveredCount: models.length, source: 'picker' },
    }

    setConfig(cacheKey(provider), JSON.stringify(result))
    setConfig(cacheAtKey(provider), new Date().toISOString())
    return result
  } catch (err) {
    return fallbackDiscovery(provider, err instanceof Error ? err.message : 'Unknown error during opencode model discovery')
  }
}

/** Invalidate cached models for a provider (call after API key is configured). */
export function invalidateOpenCodeModelCache(provider: string): void {
  try {
    setConfig(cacheKey(provider), '')
    setConfig(cacheAtKey(provider), '')
  } catch {
    // best-effort
  }
}
