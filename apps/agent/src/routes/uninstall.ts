/**
 * Device-facing uninstall route (Ed25519 auth required).
 *
 * Linux (systemd): tears down everything install.sh creates — the
 * pocketdev-agent service, /opt/pocketdev, the sudoers drop-in, the
 * tmp-cleanup timer, and the Caddyfile if we wrote it.
 *
 * macOS (launchd): tears down what install-macos.sh creates — the
 * LaunchAgent plist and ~/.pocketdev.
 *
 * The agent can't tear itself down from inside its own service (stopping the
 * service kills us mid-teardown), so the script is launched fully detached via
 * spawnDetachedScript(). That script survives us, stops us, then cleans up.
 */

import { Elysia } from 'elysia'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { authenticateRequest } from '../services/auth/auth.ts'
import { killAllTasks } from '../services/tasks/task-manager.ts'
import {
  getServiceManager,
  launchAgentPlistPath,
  launchdServiceTarget,
  spawnDetachedScript,
} from '../services/system/platform.ts'

function launchdTeardownScript(): string {
  const pocketdevHome = process.env.POCKETDEV_HOME ?? join(homedir(), '.pocketdev')
  return `#!/bin/sh
sleep 2
PLIST='${launchAgentPlistPath()}'
launchctl bootout ${launchdServiceTarget()} 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
rm -rf '${pocketdevHome}'
rm -- "$0"
`
}

const SYSTEMD_TEARDOWN_SCRIPT = `#!/bin/sh
sleep 2
systemctl stop pocketdev-agent 2>/dev/null || true
systemctl disable pocketdev-agent 2>/dev/null || true
systemctl stop pocketdev-tmp-cleanup.timer 2>/dev/null || true
systemctl disable pocketdev-tmp-cleanup.timer 2>/dev/null || true
rm -f /etc/systemd/system/pocketdev-agent.service
rm -f /etc/systemd/system/pocketdev-tmp-cleanup.service
rm -f /etc/systemd/system/pocketdev-tmp-cleanup.timer
rm -f /etc/sudoers.d/pocketdev-caddy
# Only blank the Caddyfile if it's the one install.sh wrote (fingerprint: our reverse_proxy port).
if [ -f /etc/caddy/Caddyfile ] && grep -q "reverse_proxy localhost:4387" /etc/caddy/Caddyfile; then
  : > /etc/caddy/Caddyfile
  systemctl reload caddy 2>/dev/null || true
fi
rm -rf /opt/pocketdev
systemctl daemon-reload 2>/dev/null || true
rm -- "$0"
`

export const uninstallRoutes = new Elysia()
  .post('/uninstall', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const manager = getServiceManager()
    if (manager === 'none') {
      set.status = 400
      return { error: 'This agent is not running as an installed service — nothing to uninstall.' }
    }

    killAllTasks()

    spawnDetachedScript(
      'pocketdev-uninstall',
      manager === 'launchd' ? launchdTeardownScript() : SYSTEMD_TEARDOWN_SCRIPT,
    )

    return { ok: true }
  })
