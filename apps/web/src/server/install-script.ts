import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from '@pocketdev/db'
import { installs } from '@pocketdev/db/schema'

// server.ts runs from /app/apps/web (Docker WORKDIR), install scripts are in same dir
const VERSION_PATH = join(process.cwd(), 'VERSION')

/** Install scripts served from the web root. */
export const INSTALL_SCRIPTS = {
  '/install.sh': 'install.sh',
  // macOS installer. install.sh hands off to this on Darwin, so only
  // install.sh downloads are tracked to avoid double-counting.
  '/install-macos.sh': 'install-macos.sh',
} as const

export type InstallScriptPath = keyof typeof INSTALL_SCRIPTS

export function isInstallScriptPath(pathname: string): pathname is InstallScriptPath {
  return Object.prototype.hasOwnProperty.call(INSTALL_SCRIPTS, pathname)
}

function getScript(fileName: string): string {
  const raw = readFileSync(join(process.cwd(), fileName), 'utf-8')
  try {
    const version = readFileSync(VERSION_PATH, 'utf-8').trim()
    // Substitute the version in the install banner — actual bundle download still hits /agent/bundle
    return raw.replace(/POCKETDEV_VERSION="[^"]*"/, `POCKETDEV_VERSION="${version}"`)
  } catch {
    return raw
  }
}

function getScriptVersion(script: string): string {
  const match = script.match(/POCKETDEV_VERSION="([^"]+)"/)
  return match?.[1] ?? 'unknown'
}

export async function handleInstallScript(
  req: Request,
  scriptPath: InstallScriptPath = '/install.sh',
): Promise<Response> {
  const fileName = INSTALL_SCRIPTS[scriptPath]
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '0.0.0.0'
  const userAgent = req.headers.get('user-agent')

  const script = getScript(fileName)

  if (scriptPath === '/install.sh') {
    try {
      await db.insert(installs).values({
        ip_address: ip,
        user_agent: userAgent,
        script_version: getScriptVersion(script),
      })
    } catch (err) {
      console.error('Failed to track install:', err)
    }
  }

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
