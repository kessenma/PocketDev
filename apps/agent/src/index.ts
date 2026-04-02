import { Elysia } from 'elysia'
import { healthRoutes } from './routes/health.ts'
import { setupRoutes } from './routes/setup.ts'
import { fileRoutes } from './routes/files.ts'
import { wsRoutes } from './services/ws.ts'
import { terminalWsRoutes } from './services/terminal-ws.ts'
import { proxyRoutes } from './services/proxy.ts'
import { prerequisitesRoutes } from './routes/prerequisites.ts'
import { databaseRoutes } from './routes/databases.ts'
import { containerRoutes } from './routes/containers.ts'
import { capabilitiesRoutes } from './routes/capabilities.ts'
import { gitRoutes } from './routes/git.ts'
import { gitSetupRoutes } from './routes/git-setup.ts'
import { claudeSetupRoutes } from './routes/claude-setup.ts'
import { codexSetupRoutes } from './routes/codex-setup.ts'
import { pkgSetupRoutes } from './routes/pkg-setup.ts'
import { serverActionsRoutes } from './routes/server-actions.ts'
import { planRoutes } from './routes/plans.ts'
import { screenshotRoutes } from './services/preview-screenshot.ts'
import { consoleRoutes, consoleStaticRoutes } from './routes/console.ts'
import { initSetup, getServerKeypair } from './services/setup.ts'
import { getDb } from './db/index.ts'

const PORT = Number(process.env.POCKETDEV_PORT ?? 4387)

if (process.env.POCKETDEV_DEV_MODE === '1') {
  console.log('⚠️  DEV MODE ENABLED - authentication disabled, auto-pairing active')
}

// Initialize database + run migrations on startup
getDb()

// Generate server keypair on first boot
getServerKeypair()

// Start setup mode if no devices registered
const setupCode = initSetup()

new Elysia()
  .onError(({ error }) => {
    if (error instanceof Error && error.message === 'Unauthorized') {
      console.warn('Rejected unauthorized WebSocket connection')
      return
    }
    console.error('Server error:', error)
  })
  .group('/PocketDev', (app) => app
    // Health check (no auth)
    .use(healthRoutes)
    // Console API (admin setup, login, passcode, status)
    .use(consoleRoutes)
    // API routes (most require device auth)
    .group('/api', (api) => api
      .use(setupRoutes)
      .use(prerequisitesRoutes)
      .use(databaseRoutes)
      .use(containerRoutes)
      .use(capabilitiesRoutes)
      .use(gitRoutes)
      .use(gitSetupRoutes)
      .use(claudeSetupRoutes)
      .use(codexSetupRoutes)
      .use(pkgSetupRoutes)
      .use(serverActionsRoutes)
      .use(planRoutes)
      .use(fileRoutes)
    )
    // WebSocket routes
    .use(wsRoutes)
    .use(terminalWsRoutes)
    // Preview proxy + screenshot
    .use(screenshotRoutes)
    .use(proxyRoutes)
    // Console SPA static files (must be last — catch-all)
    .use(consoleStaticRoutes)
  )
  .listen(PORT)

console.log(`🔧 PocketDev Agent running on port ${PORT}`)

if (process.env.POCKETDEV_DEV_MODE === '1' && setupCode) {
  console.log(`DEV MODE device ready: ${setupCode}`)
} else if (setupCode) {
  console.log('')
  console.log('============================================')
  console.log('  Setup Mode Active')
  console.log('============================================')
  console.log('')
  console.log(`  Setup code: ${setupCode}`)
  console.log('')
  console.log('  This code expires in 15 minutes.')
  console.log('  Pair your device to get started.')
  console.log('============================================')
  console.log('')
} else {
  console.log('Device already paired. Ready for connections.')
}
