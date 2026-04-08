import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

const INSTALL_SCRIPT_PATH = join(process.cwd(), 'install.sh')
const VERSIONS_DIR = join(process.cwd(), 'public', 'agent-versions')
const LATEST_BUNDLE_PATH = join(process.cwd(), 'public', 'agent-bundle.tar.gz')

function getLatestVersion(): string {
  try {
    const script = readFileSync(INSTALL_SCRIPT_PATH, 'utf-8')
    const match = script.match(/POCKETDEV_VERSION="([^"]+)"/)
    return match?.[1] ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function getAvailableVersions(): string[] {
  if (!existsSync(VERSIONS_DIR)) return []
  return readdirSync(VERSIONS_DIR)
    .filter((f) => f.endsWith('.tar.gz'))
    .map((f) => f.replace('.tar.gz', ''))
    .sort()
}

export function handleVersionCheck(): Response {
  return Response.json(
    {
      version: getLatestVersion(),
      versions: getAvailableVersions(),
      changelog_url: 'https://pocketdev.run/changelog',
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}

export function handleBundleDownload(pathname: string): Response {
  const versionMatch = pathname.match(/^\/agent\/bundle\/(.+)$/)
  const bundlePath = versionMatch
    ? join(VERSIONS_DIR, `${versionMatch[1]}.tar.gz`)
    : LATEST_BUNDLE_PATH

  if (existsSync(bundlePath)) {
    return new Response(Bun.file(bundlePath), {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="agent-bundle.tar.gz"',
        'Cache-Control': 'public, max-age=300',
      },
    })
  }

  return new Response(
    versionMatch
      ? `Version ${versionMatch[1]} not found.`
      : 'Agent bundle not available. Run: bash scripts/build-agent-bundle.sh',
    { status: 404 },
  )
}
