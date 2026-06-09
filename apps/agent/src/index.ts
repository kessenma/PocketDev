import { Elysia } from 'elysia'
import { healthRoutes } from './routes/health.ts'
import { setupRoutes } from './routes/setup.ts'
import { fileRoutes } from './routes/files.ts'
import { wsRoutes } from './services/terminal/ws.ts'
import { terminalWsRoutes } from './services/terminal/terminal-ws.ts'
import { consoleTerminalWsRoutes } from './services/terminal/console-terminal-ws.ts'
import { proxyRoutes } from './services/preview/proxy.ts'
import { prerequisitesRoutes } from './routes/prerequisites.ts'
import { databaseRoutes } from './routes/databases.ts'
import { containerRoutes } from './routes/containers.ts'
import { capabilitiesRoutes } from './routes/capabilities.ts'
import { gitRoutes } from './routes/git.ts'
import { gitSetupRoutes } from './routes/git-setup.ts'
import { claudeSetupRoutes } from './routes/claude-setup.ts'
import { copilotSetupRoutes } from './routes/copilot-setup.ts'
import { codexSetupRoutes } from './routes/codex-setup.ts'
import { opencodeSetupRoutes } from './routes/opencode-setup.ts'
import { minimaxSetupRoutes } from './routes/minimax-setup.ts'
import { pkgSetupRoutes } from './routes/pkg-setup.ts'
import { pythonSetupRoutes } from './routes/python-setup.ts'
import { rustSetupRoutes } from './routes/rust-setup.ts'
import { goSetupRoutes } from './routes/go-setup.ts'
import { typescriptSetupRoutes } from './routes/typescript-setup.ts'
import { dockerSetupRoutes } from './routes/docker-setup.ts'
import { serverActionsRoutes } from './routes/server-actions.ts'
import { planRoutes } from './routes/plans.ts'
import { taskRoutes } from './routes/tasks.ts'
import { projectRoutes } from './routes/projects.ts'
import { scriptRoutes } from './routes/scripts.ts'
import { envRoutes } from './routes/envs.ts'
import { offlineSnapshotRoutes } from './routes/offline-snapshots.ts'
import { pushTokenRoutes } from './routes/push-token.ts'
import { bugsRoutes } from './routes/bugs.ts'
import { screenshotRoutes } from './services/preview/preview-screenshot.ts'
import { consoleRoutes, consoleStaticRoutes } from './routes/console.ts'
import { passkeyRoutes } from './routes/passkey.ts'
import { lockRoutes } from './routes/lock.ts'
import { uninstallRoutes } from './routes/uninstall.ts'
import { initSetup, getServerKeypair } from './services/auth/setup.ts'
import { getDb } from './db/index.ts'
import { initFirewall } from './services/system/firewall.ts'
import { startWakeServer } from './services/system/wake-server.ts'

const PORT = Number(process.env.POCKETDEV_PORT ?? 4387)
const HOST = process.env.POCKETDEV_HOST ?? '0.0.0.0'

if (process.env.POCKETDEV_DEV_MODE === '1') {
  console.log('⚠️  DEV MODE ENABLED - authentication disabled, auto-pairing active')
}

// Initialize database + run migrations on startup
getDb()

// Generate server keypair on first boot
getServerKeypair()

// Start setup mode if no devices registered
const setupCode = initSetup()

// Initialize firewall (no-op if POCKETDEV_FIREWALL_LOCK_ENABLED != true)
initFirewall().then(startWakeServer)

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
    // Passkey auth routes
    .use(passkeyRoutes)
    // API routes (most require device auth)
    .group('/api', (api) => api
      .use(lockRoutes)
      .use(setupRoutes)
      .use(uninstallRoutes)
      .use(prerequisitesRoutes)
      .use(databaseRoutes)
      .use(containerRoutes)
      .use(capabilitiesRoutes)
      .use(gitRoutes)
      .use(gitSetupRoutes)
      .use(claudeSetupRoutes)
      .use(copilotSetupRoutes)
      .use(codexSetupRoutes)
      .use(opencodeSetupRoutes)
      .use(minimaxSetupRoutes)
      .use(pkgSetupRoutes)
      .use(pythonSetupRoutes)
      .use(rustSetupRoutes)
      .use(goSetupRoutes)
      .use(typescriptSetupRoutes)
      .use(dockerSetupRoutes)
      .use(serverActionsRoutes)
      .use(planRoutes)
      .use(taskRoutes)
      .use(projectRoutes)
      .use(scriptRoutes)
      .use(envRoutes)
      .use(offlineSnapshotRoutes)
      .use(pushTokenRoutes)
      .use(bugsRoutes)
      .use(fileRoutes)
    )
    // WebSocket routes
    .use(wsRoutes)
    .use(terminalWsRoutes)
    .use(consoleTerminalWsRoutes)
    // Preview proxy + screenshot
    .use(screenshotRoutes)
    .use(proxyRoutes)
    // Console SPA static files (must be last — catch-all)
    .use(consoleStaticRoutes)
  )
  .listen({ port: PORT, hostname: HOST })

console.log(`🔧 PocketDev Agent running on ${HOST}:${PORT}`)

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
