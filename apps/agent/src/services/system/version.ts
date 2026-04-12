import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const VERSION_FILE = join(process.cwd(), 'version.json')
const UPDATE_CHECK_URL = 'https://pocketdev.run/agent/version'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

let cachedVersion: string | null = null

interface VersionCheckResult {
  current: string
  latest: string
  updateAvailable: boolean
  changelogUrl: string
  versions: string[]
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

/** Compare two semver strings. Returns true if b is newer than a. */
function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (nb > na) return true
    if (nb < na) return false
  }
  return false
}

export async function checkForUpdate(): Promise<VersionCheckResult | null> {
  const now = Date.now()

  // Return cached result if still fresh
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
    }

    const current = getAgentVersion()
    const result: VersionCheckResult = {
      current,
      latest: data.version,
      updateAvailable: current === 'dev' || current === 'unknown' || isNewer(current, data.version),
      changelogUrl: data.changelog_url,
      versions: data.versions,
    }

    cachedCheck = { result, checkedAt: now }
    return result
  } catch {
    // Network failure — return stale cache or null
    return cachedCheck?.result ?? null
  }
}

/** Clear the cached version so it gets re-read (used after self-update). */
export function clearVersionCache(): void {
  cachedVersion = null
  cachedCheck = null
}
