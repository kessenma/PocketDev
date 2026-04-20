const GITHUB_REPO = 'kessenma/PocketDev'
const GITHUB_API = 'https://api.github.com'
const CACHE_TTL_MS = 5 * 60 * 1000

interface ReleaseAsset {
  name: string
  browser_download_url: string
}

interface GithubRelease {
  tag_name: string
  name: string
  prerelease: boolean
  published_at: string
  assets: ReleaseAsset[]
}

interface StableEntry {
  version: string
  bundleUrl: string
  pinnedUrl: string
}

interface BetaInfo {
  version: string
  publishedAt: string
  bundleUrl: string
  pinnedUrl: string
}

interface CacheData {
  latest: StableEntry
  stableVersions: StableEntry[]
  beta: BetaInfo | null
  fetchedAt: number
}

let cache: CacheData | null = null

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function extractBundleUrl(release: GithubRelease): string | null {
  return release.assets.find((a) => a.name === 'agent-bundle.tar.gz')?.browser_download_url ?? null
}

function extractPinnedUrl(release: GithubRelease): string | null {
  const version = release.tag_name.replace(/^v/, '')
  return (
    release.assets.find((a) => a.name === `${version}.tar.gz`)?.browser_download_url ??
    release.assets.find((a) => a.name.endsWith('.tar.gz') && a.name !== 'agent-bundle.tar.gz')
      ?.browser_download_url ??
    null
  )
}

async function fetchFromGitHub(): Promise<CacheData> {
  const headers = githubHeaders()
  const signal = AbortSignal.timeout(8_000)

  const [latestRes, allRes] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/releases/latest`, { headers, signal }),
    fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/releases?per_page=30`, { headers, signal }),
  ])

  if (!latestRes.ok) {
    throw new Error(`GitHub /releases/latest returned ${latestRes.status}`)
  }

  const latestData = (await latestRes.json()) as GithubRelease
  const allData: GithubRelease[] = allRes.ok ? ((await allRes.json()) as GithubRelease[]) : []

  const stableVersions: StableEntry[] = allData
    .filter((r) => !r.prerelease)
    .slice(0, 10)
    .map((r) => ({
      version: r.tag_name.replace(/^v/, ''),
      bundleUrl: extractBundleUrl(r) ?? '',
      pinnedUrl: extractPinnedUrl(r) ?? '',
    }))
    .filter((r) => r.bundleUrl)

  const latestBundleUrl = extractBundleUrl(latestData)
  if (!latestBundleUrl) {
    throw new Error(`No agent-bundle.tar.gz asset in release ${latestData.tag_name}`)
  }

  const latest: StableEntry = {
    version: latestData.tag_name.replace(/^v/, ''),
    bundleUrl: latestBundleUrl,
    pinnedUrl: extractPinnedUrl(latestData) ?? latestBundleUrl,
  }

  const nightlyRelease = allData.find((r) => r.prerelease && r.tag_name === 'nightly-latest')
  let beta: BetaInfo | null = null
  if (nightlyRelease) {
    const betaBundleUrl = extractBundleUrl(nightlyRelease)
    const betaVersion = nightlyRelease.name.match(/Version: (.+)$/)?.[1] ?? nightlyRelease.tag_name
    if (betaBundleUrl) {
      beta = {
        version: betaVersion,
        publishedAt: nightlyRelease.published_at,
        bundleUrl: betaBundleUrl,
        pinnedUrl: extractPinnedUrl(nightlyRelease) ?? betaBundleUrl,
      }
    }
  }

  return { latest, stableVersions, beta, fetchedAt: Date.now() }
}

async function getCache(): Promise<CacheData | null> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache
  try {
    cache = await fetchFromGitHub()
    return cache
  } catch (err) {
    console.error('[agent-version] GitHub API fetch failed:', err)
    if (cache) {
      console.warn('[agent-version] Serving stale cache from', new Date(cache.fetchedAt).toISOString())
      return cache
    }
    return null
  }
}

export async function handleVersionCheck(): Promise<Response> {
  const result = await getCache()
  if (!result) {
    return new Response(JSON.stringify({ error: 'Version info unavailable — GitHub API unreachable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return Response.json(
    {
      version: result.latest.version,
      versions: result.stableVersions.map((r) => r.version),
      beta: result.beta
        ? { version: result.beta.version, publishedAt: result.beta.publishedAt }
        : undefined,
      changelog_url: 'https://pocketdev.run/changelog',
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}

export async function handleBundleDownload(pathname: string): Promise<Response> {
  const result = await getCache()
  if (!result) {
    return new Response('Version info unavailable — GitHub API unreachable', { status: 503 })
  }

  // /agent/bundle/nightly → latest beta pre-release
  if (pathname === '/agent/bundle/nightly') {
    if (!result.beta) {
      return new Response('No beta release available.', { status: 404 })
    }
    return new Response(null, { status: 302, headers: { Location: result.beta.bundleUrl } })
  }

  // /agent/bundle/{version} → pinned stable release
  const versionMatch = pathname.match(/^\/agent\/bundle\/(.+)$/)
  if (versionMatch) {
    const requestedVersion = versionMatch[1]
    const release = result.stableVersions.find((r) => r.version === requestedVersion)
    if (!release || !release.bundleUrl) {
      return new Response(`Version ${requestedVersion} not found.`, { status: 404 })
    }
    return new Response(null, { status: 302, headers: { Location: release.bundleUrl } })
  }

  // /agent/bundle → latest stable
  return new Response(null, {
    status: 302,
    headers: { Location: result.latest.bundleUrl, 'Cache-Control': 'public, max-age=300' },
  })
}
