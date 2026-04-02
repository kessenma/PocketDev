import { db } from '@pocketdev/db'
import { installs } from '@pocketdev/db/schema'

const SCRIPT_VERSION = '0.1.0'

const INSTALL_SCRIPT = `#!/bin/bash
set -euo pipefail

echo "============================================"
echo "  PocketDev Installer v${SCRIPT_VERSION}"
echo "============================================"
echo ""
echo "PocketDev is not yet available for installation."
echo "Follow the project at: https://github.com/kessenma/PocketDev"
echo ""
echo "Coming soon:"
echo "  - Secure device pairing"
echo "  - AI agent control from your phone"
echo "  - Live task streaming"
echo ""
`

export async function handleInstallScript(req: Request): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '0.0.0.0'
  const userAgent = req.headers.get('user-agent')

  try {
    await db.insert(installs).values({
      ip_address: ip,
      user_agent: userAgent,
      script_version: SCRIPT_VERSION,
    })
  } catch (err) {
    console.error('Failed to track install:', err)
  }

  return new Response(INSTALL_SCRIPT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="install.sh"',
    },
  })
}
