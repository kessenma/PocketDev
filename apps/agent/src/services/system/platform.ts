/**
 * Host platform abstraction.
 *
 * The agent originally assumed a root-owned systemd service on Linux. macOS
 * hosts (e.g. a Mac mini) run the agent as a per-user launchd LaunchAgent
 * instead — see apps/web/install-macos.sh. Everything that touches the service
 * manager, the system package manager, or a Linux-only facility should go
 * through this module so the route/service code stays platform-neutral.
 */

import { spawn } from 'node:child_process'
import { existsSync, writeFileSync, chmodSync, openSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

export const IS_MACOS = process.platform === 'darwin'
export const IS_LINUX = process.platform === 'linux'

export type ServiceManager = 'systemd' | 'launchd' | 'none'

export const SYSTEMD_SERVICE_NAME = 'pocketdev-agent'
export const LAUNCHD_LABEL = 'run.pocketdev.agent'

export const INSTALL_SCRIPT_URL = 'https://pocketdev.run/install.sh'

/**
 * Which service manager supervises this agent process.
 *
 * Installers set POCKETDEV_SERVICE_MANAGER explicitly; when it is missing
 * (older installs, `bun run src/index.ts` in dev) we fall back to the
 * platform default, and to 'none' when that manager isn't actually present.
 */
export function getServiceManager(): ServiceManager {
  const explicit = process.env.POCKETDEV_SERVICE_MANAGER
  if (explicit === 'systemd' || explicit === 'launchd' || explicit === 'none') return explicit

  if (IS_LINUX) return existsSync('/run/systemd/system') ? 'systemd' : 'none'
  if (IS_MACOS) return existsSync(launchAgentPlistPath()) ? 'launchd' : 'none'
  return 'none'
}

export function launchAgentPlistPath(): string {
  return join(homedir(), 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`)
}

/**
 * launchd service target for the current user, e.g. `gui/501/run.pocketdev.agent`.
 *
 * install-macos.sh bootstraps into the `gui/<uid>` domain when the user has a
 * login session (needed for Keychain access, which Claude Code uses for its
 * credentials) and falls back to `user/<uid>` otherwise; it records which one
 * in POCKETDEV_LAUNCHD_DOMAIN.
 */
export function launchdServiceTarget(): string {
  const uid = typeof process.getuid === 'function' ? process.getuid() : 501
  const domain = process.env.POCKETDEV_LAUNCHD_DOMAIN || `gui/${uid}`
  return `${domain}/${LAUNCHD_LABEL}`
}

/** Shell snippet that restarts the agent under whatever supervises it. */
export function restartAgentShell(): string {
  switch (getServiceManager()) {
    case 'systemd':
      return `systemctl restart ${SYSTEMD_SERVICE_NAME}`
    case 'launchd':
      return `launchctl kickstart -k ${launchdServiceTarget()}`
    default:
      // Unsupervised (dev): nothing will bring us back, so do nothing.
      return 'true'
  }
}

/** Temp dir for helper scripts. macOS clears per-user $TMPDIR less eagerly than /tmp. */
export function scratchDir(): string {
  return IS_LINUX ? '/tmp' : tmpdir()
}

/**
 * Run a shell script fully detached from the agent so it survives the agent
 * being stopped/restarted (upgrade, rollback, uninstall).
 *
 * - systemd: `systemd-run` puts it in its own transient unit, outside our
 *   cgroup — `systemctl stop` kills the whole cgroup otherwise.
 * - launchd / none: start it in a new session (setsid via `detached: true`).
 *   The LaunchAgent plist also sets AbandonProcessGroup so launchd doesn't
 *   reap it when the agent job stops.
 */
export function spawnDetachedScript(name: string, script: string): { scriptPath: string; logPath: string } {
  const ts = Date.now()
  const dir = scratchDir()
  const scriptPath = join(dir, `${name}-${ts}.sh`)
  const logPath = join(dir, `${name}-${ts}.log`)
  writeFileSync(scriptPath, script, 'utf8')
  chmodSync(scriptPath, 0o755)

  if (getServiceManager() === 'systemd') {
    Bun.spawn(
      ['systemd-run', '--quiet', '--no-block', '--unit', `${name}-${ts}`, '/bin/sh', scriptPath],
      { stdio: ['ignore', 'ignore', 'ignore'] },
    )
  } else {
    const out = openSync(logPath, 'a')
    const child = spawn('/bin/sh', [scriptPath], {
      detached: true,
      stdio: ['ignore', out, out],
      env: process.env,
    })
    child.unref()
  }

  return { scriptPath, logPath }
}

// ─── Package manager ────────────────────────────────────────────────────

export type SystemPackageManager = 'brew' | 'apt-get' | 'dnf' | 'yum' | 'pacman' | 'apk'

/**
 * Pick a platform-appropriate shell command. Used for the copy-paste
 * install hints shown in the console/mobile prerequisites UI.
 */
export function platformCommand(cmds: { linux: string; macos: string }): string {
  return IS_MACOS ? cmds.macos : cmds.linux
}

/** `brew install <pkgs>` on macOS, `sudo apt-get install -y <pkgs>` elsewhere. */
export function systemInstallHint(pkgs: { linux: string; macos: string }): string {
  return IS_MACOS ? `brew install ${pkgs.macos}` : `sudo apt-get install -y ${pkgs.linux}`
}

export function homebrewPrefix(): string | null {
  for (const prefix of ['/opt/homebrew', '/usr/local']) {
    if (existsSync(join(prefix, 'bin', 'brew'))) return prefix
  }
  return null
}
