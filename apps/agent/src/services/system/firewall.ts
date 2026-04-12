/**
 * Network-level port locking via iptables.
 *
 * Uses a dedicated `POCKETDEV` iptables chain so we never touch
 * the user's existing rules. On agent startup the chain is always
 * flushed → port is unlocked (safe default; prevents lockout after
 * restarts/updates).
 *
 * Only active when POCKETDEV_FIREWALL_LOCK_ENABLED=true.
 * Set from the console UI (persisted in server_config) or via env var.
 */

import { getConfig, setConfig } from '../../db/index.ts'

const CHAIN = 'POCKETDEV'
const BLOCKED_PORT = Number(process.env.POCKETDEV_PORT ?? 4387)

let locked = false
let firewallAvailable = false
let firewallEnabled = false

async function runIptables(...args: string[]): Promise<boolean> {
  const r = Bun.spawnSync(['iptables', ...args], { stderr: 'pipe' })
  return r.exitCode === 0
}

/** Load persisted enabled state from DB, falling back to env var. */
function loadEnabledState(): boolean {
  const persisted = getConfig('firewall_lock_enabled')
  if (persisted !== null) return persisted === '1'
  return process.env.POCKETDEV_FIREWALL_LOCK_ENABLED === 'true'
}

export async function initFirewall(): Promise<void> {
  firewallEnabled = loadEnabledState()

  if (!firewallEnabled) {
    console.log('[firewall] Port security disabled (POCKETDEV_FIREWALL_LOCK_ENABLED=false)')
    return
  }

  try {
    // Create chain (idempotent — returns non-zero if already exists, which is fine)
    await runIptables('-N', CHAIN)
    // Remove any stale jump rule, then re-insert at top of INPUT
    await runIptables('-D', 'INPUT', '-j', CHAIN)
    await runIptables('-I', 'INPUT', '-j', CHAIN)
    // Flush chain → start unlocked
    await runIptables('-F', CHAIN)
    locked = false
    firewallAvailable = true
    console.log(`[firewall] POCKETDEV chain initialized (port ${BLOCKED_PORT} unlocked)`)
  } catch (err) {
    console.warn('[firewall] iptables unavailable — network-level locking disabled:', err)
    firewallAvailable = false
  }
}

export async function lockPort(): Promise<void> {
  if (!firewallAvailable || !firewallEnabled) return
  await runIptables('-F', CHAIN)
  await runIptables('-A', CHAIN, '-p', 'tcp', '--dport', String(BLOCKED_PORT), '-j', 'DROP')
  locked = true
  console.log(`[firewall] Port ${BLOCKED_PORT} blocked`)
}

export async function unlockPort(): Promise<void> {
  if (!firewallAvailable || !firewallEnabled) return
  await runIptables('-F', CHAIN)
  locked = false
  console.log(`[firewall] Port ${BLOCKED_PORT} unblocked`)
}

export function isLocked(): boolean {
  return locked
}

export function isFirewallEnabled(): boolean {
  return firewallEnabled
}

export function isFirewallAvailable(): boolean {
  return firewallAvailable
}

/** Enable or disable network-level locking. Persisted to DB. */
export async function setFirewallEnabled(enabled: boolean): Promise<void> {
  firewallEnabled = enabled
  setConfig('firewall_lock_enabled', enabled ? '1' : '0')

  if (enabled && !firewallAvailable) {
    // Try to initialize now that it's been turned on
    await initFirewall()
  } else if (!enabled && locked) {
    // Unlock before disabling so the port isn't left blocked
    await unlockPort()
  }
}
