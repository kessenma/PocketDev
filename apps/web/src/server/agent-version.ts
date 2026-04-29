const GITHUB_REPO = 'kessenma/PocketDev'
const GITHUB_API = 'https://api.github.com'
const CACHE_TTL_MS = 5 * 60 * 1000

interface ReleaseAsset {
  name: string
  url: string                  // GitHub API URL — used for authenticated downloads
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
  publishedAt: string
  assetApiUrl: string   // https://api.github.com/repos/.../releases/assets/{id}
  pinnedApiUrl: string
}

interface BetaInfo {
  version: string
  publishedAt: string
  assetApiUrl: string
  pinnedApiUrl: string
}

interface CacheData {
  latest: StableEntry
  stableVersions: StableEntry[]
  betas: BetaInfo[]
  fetchedAt: number
}

let cache: CacheData | null = null

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function extractBundleApiUrl(release: GithubRelease): string | null {
  return release.assets.find((a) => a.name === 'agent-bundle.tar.gz')?.url ?? null
}

function extractPinnedApiUrl(release: GithubRelease): string | null {
  const version = release.tag_name.replace(/^v/, '')
  return (
    release.assets.find((a) => a.name === `${version}.tar.gz`)?.url ??
    release.assets.find((a) => a.name.endsWith('.tar.gz') && a.name !== 'agent-bundle.tar.gz')?.url ??
    null
  )
}

async function fetchFromGitHub(): Promise<CacheData> {
  const headers = githubHeaders()
  const signal = AbortSignal.timeout(8_000)

  const allRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/releases?per_page=30`, {
    headers,
    signal,
  })
  if (!allRes.ok) {
    throw new Error(`GitHub /releases returned ${allRes.status}`)
  }

  const allData: GithubRelease[] = await allRes.json()

  const stableVersions: StableEntry[] = allData
    .filter((r) => !r.prerelease)
    .slice(0, 10)
    .map((r) => ({
      version: r.tag_name.replace(/^v/, ''),
      publishedAt: r.published_at,
      assetApiUrl: extractBundleApiUrl(r) ?? '',
      pinnedApiUrl: extractPinnedApiUrl(r) ?? '',
    }))
    .filter((r) => r.assetApiUrl)

  const effectiveLatest = allData.find((r) => !r.prerelease) ?? allData.find((r) => r.prerelease)
  const latestApiUrl = effectiveLatest ? extractBundleApiUrl(effectiveLatest) : null
  if (!latestApiUrl || !effectiveLatest) {
    throw new Error('No releases found — publish at least one GitHub Release first')
  }

  const latest: StableEntry = {
    version: effectiveLatest.tag_name.replace(/^v/, ''),
    assetApiUrl: latestApiUrl,
    pinnedApiUrl: extractPinnedApiUrl(effectiveLatest) ?? latestApiUrl,
  }

  // Individual beta releases have tags like `nightly-0.2.0-beta.abc1234`.
  // `nightly-latest` is a rolling alias — exclude it so we don't double-count.
  const betas: BetaInfo[] = allData
    .filter((r) => r.prerelease && r.tag_name.startsWith('nightly-') && r.tag_name !== 'nightly-latest')
    .slice(0, 10)
    .map((r) => {
      const pinnedAsset = r.assets.find((a) => a.name.endsWith('.tar.gz') && a.name !== 'agent-bundle.tar.gz')
      const version = pinnedAsset?.name.replace(/\.tar\.gz$/, '') ?? r.tag_name.replace(/^nightly-/, '')
      const assetApiUrl = extractBundleApiUrl(r) ?? pinnedAsset?.url ?? ''
      const pinnedApiUrl = pinnedAsset?.url ?? assetApiUrl
      return { version, publishedAt: r.published_at, assetApiUrl, pinnedApiUrl }
    })
    .filter((b) => b.assetApiUrl)

  return { latest, stableVersions, betas, fetchedAt: Date.now() }
}

async function getCache(force = false): Promise<CacheData | null> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache
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

/** Proxy a GitHub Release asset download through our server.
 *  The asset API URL with Accept: application/octet-stream redirects to a
 *  pre-signed S3 URL. We follow that redirect and stream the bytes back,
 *  so the caller needs no GitHub credentials.
 */
async function proxyAsset(assetApiUrl: string, filename: string): Promise<Response> {
  const res = await fetch(assetApiUrl, {
    headers: {
      ...githubHeaders(),
      Accept: 'application/octet-stream',
    },
  })

  if (!res.ok) {
    return new Response(`Failed to fetch asset: ${res.status}`, { status: 502 })
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}

export async function handleVersionCheck(request?: Request): Promise<Response> {
  const force = request ? new URL(request.url).searchParams.has('force') : false
  const result = await getCache(force)
  if (!result) {
    return new Response(JSON.stringify({ error: 'Version info unavailable — GitHub API unreachable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return Response.json(
    {
      version: result.latest.version,
      versions: result.stableVersions.map((r) => ({ version: r.version, publishedAt: r.publishedAt })),
      betas: result.betas.length
        ? result.betas.map((b) => ({ version: b.version, publishedAt: b.publishedAt }))
        : undefined,
      changelog_url: 'https://pocketdev.run/changelog',
    },
    { headers: { 'Cache-Control': force ? 'no-store' : 'public, max-age=300' } },
  )
}

export async function handleBundleDownload(pathname: string): Promise<Response> {
  const result = await getCache()
  if (!result) {
    return new Response('Version info unavailable — GitHub API unreachable', { status: 503 })
  }

  // /agent/bundle/nightly → most recent individual beta release
  if (pathname === '/agent/bundle/nightly') {
    if (!result.betas.length) {
      return new Response('No beta release available.', { status: 404 })
    }
    return proxyAsset(result.betas[0].assetApiUrl, 'agent-bundle.tar.gz')
  }

  // /agent/bundle/{version} → pinned stable or beta release
  const versionMatch = pathname.match(/^\/agent\/bundle\/(.+)$/)
  if (versionMatch) {
    const requestedVersion = versionMatch[1]
    const stable = result.stableVersions.find((r) => r.version === requestedVersion)
    if (stable) return proxyAsset(stable.pinnedApiUrl, `${requestedVersion}.tar.gz`)
    const beta = result.betas.find((b) => b.version === requestedVersion)
    if (beta) return proxyAsset(beta.pinnedApiUrl, `${requestedVersion}.tar.gz`)
    return new Response(`Version ${requestedVersion} not found.`, { status: 404 })
  }

  // /agent/bundle → latest stable
  return proxyAsset(result.latest.assetApiUrl, 'agent-bundle.tar.gz')
}
