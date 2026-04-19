/**
 * Device-facing uninstall route (Ed25519 auth required).
 *
 * Tears down everything install.sh creates: the pocketdev-agent service,
 * /opt/pocketdev, the sudoers drop-in, the tmp-cleanup timer, and the
 * Caddyfile if we wrote it. The agent can't tear itself down from inside
 * its own cgroup — `systemctl stop` kills the whole cgroup — so we launch
 * the teardown via `systemd-run`, which creates a transient unit outside
 * our scope. That script survives us, stops us, then cleans up.
 */

import { Elysia } from 'elysia'
import { writeFileSync, chmodSync } from 'node:fs'
import { authenticateRequest } from '../services/auth/auth.ts'
import { killAllTasks } from '../services/tasks/task-manager.ts'

const TEARDOWN_SCRIPT = `#!/bin/sh
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

    killAllTasks()

    const scriptPath = `/tmp/pocketdev-uninstall-${process.pid}.sh`
    writeFileSync(scriptPath, TEARDOWN_SCRIPT, 'utf8')
    chmodSync(scriptPath, 0o755)

    // systemd-run spawns the script in its own transient unit, outside our cgroup,
    // so `systemctl stop pocketdev-agent` won't kill it mid-teardown.
    Bun.spawn(
      ['systemd-run', '--quiet', '--no-block', '--unit', `pocketdev-uninstall-${Date.now()}`, '/bin/sh', scriptPath],
      { stdio: ['ignore', 'ignore', 'ignore'] },
    )

    return { ok: true }
  })
