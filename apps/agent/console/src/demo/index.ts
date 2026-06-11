import { installMockFetch } from './mock-fetch'
import { installMockWebSocket } from './mock-ws'

/**
 * Activates backend-less demo mode: the console's network calls are answered
 * from static fixtures so the full UI is interactive with no agent behind it.
 * Both installers are idempotent (safe under React StrictMode double-invoke).
 */
export function installDemoBackend(): void {
  installMockFetch()
  installMockWebSocket()
}
