import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from '@pocketdev/db'
import { installs } from '@pocketdev/db/schema'

// server.ts runs from /app/apps/web (Docker WORKDIR), install.sh is in same dir
const SCRIPT_PATH = join(process.cwd(), 'install.sh')

function getScript(): string {
  return readFileSync(SCRIPT_PATH, 'utf-8')
}

function getScriptVersion(script: string): string {
  const match = script.match(/POCKETDEV_VERSION="([^"]+)"/)
  return match?.[1] ?? 'unknown'
}

export async function handleInstallScript(req: Request): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '0.0.0.0'
  const userAgent = req.headers.get('user-agent')

  const script = getScript()

  try {
    await db.insert(installs).values({
      ip_address: ip,
      user_agent: userAgent,
      script_version: getScriptVersion(script),
    })
  } catch (err) {
    console.error('Failed to track install:', err)
  }

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="install.sh"',
    },
  })
}
