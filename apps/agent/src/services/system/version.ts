import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const VERSION_FILE = join(process.cwd(), 'version.json')
const UPDATE_CHECK_URL = 'https://pocketdev.run/agent/version'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

let cachedVersion: string | null = null

interface BetaInfo {
  version: string
  publishedAt: string
}

export interface VersionCheckResult {
  current: string
  latest: string
  updateAvailable: boolean
  changelogUrl: string
  versions: string[]
  betas?: BetaInfo[]
}

let cachedCheck: { result: VersionCheckResult; checkedAt: number } | null = null

export function getAgentVersion(): string {
  if (cachedVersion) return cachedVersion

  if (existsSync(VERSION_FILE)) {
    try {
      const data = JSON.parse(readFileSync(VERSION_FILE, 'utf-8'))
      cachedVersion = data.version ?? 'unknown'
    } catch {
      cachedVersion = 'unknown'
    }
  } else {
    cachedVersion = 'dev'
  }

  return cachedVersion!
}

/**
 * Compare two semver-ish strings. Returns true if b is strictly newer than a.
 * Pre-release suffixes (e.g. "-beta.abc1234") are treated as older than the
 * same base version without a suffix (semver precedence).
 */
function isNewer(a: string, b: string): boolean {
  const [aBase, aSuffix = ''] = a.split('-', 2)
  const [bBase, bSuffix = ''] = b.split('-', 2)

  const pa = aBase.split('.').map(Number)
  const pb = bBase.split('.').map(Number)

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (nb > na) return true
    if (nb < na) return false
  }

  // Numeric parts equal — apply semver pre-release rules:
  // stable (no suffix) > any pre-release suffix
  if (aSuffix && !bSuffix) return false // a is pre-release, b is stable → b IS newer but from a's perspective b is ahead
  if (!aSuffix && bSuffix) return false // a is stable, b is pre-release → b is older
  if (aSuffix && bSuffix) return bSuffix > aSuffix // lexicographic comparison of pre-release parts
  return false
}

export async function checkForUpdate(): Promise<VersionCheckResult | null> {
  const now = Date.now()

  if (cachedCheck && now - cachedCheck.checkedAt < CACHE_TTL_MS) {
    return cachedCheck.result
  }

  try {
    const res = await fetch(UPDATE_CHECK_URL, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return cachedCheck?.result ?? null

    const data = (await res.json()) as {
      version: string
      versions: string[]
      changelog_url: string
      betas?: BetaInfo[]
    }

    const current = getAgentVersion()
    const result: VersionCheckResult = {
      current,
      latest: data.version,
      updateAvailable: current === 'dev' || current === 'unknown' || isNewer(current, data.version),
      changelogUrl: data.changelog_url,
      versions: data.versions,
      betas: data.betas,
    }

    cachedCheck = { result, checkedAt: now }
    return result
  } catch {
    return cachedCheck?.result ?? null
  }
}

/** Clear the cached version so it gets re-read (used after self-update). */
export function clearVersionCache(): void {
  cachedVersion = null
  cachedCheck = null
}
