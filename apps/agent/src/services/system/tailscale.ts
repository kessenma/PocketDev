/**
 * Tailscale detection for reaching the agent from a phone when the host is
 * behind NAT (e.g. a Mac mini at home). See docs/macos/tailscale.md.
 *
 * Read-only: we never change Tailscale config from here. `tailscale serve`
 * is set up by install-macos.sh --tailscale-serve (or by hand).
 */

import { existsSync } from 'node:fs'

export interface TailscaleInfo {
  /** A Tailscale CLI was found. */
  installed: boolean
  /** BackendState === 'Running' (logged in + connected). */
  running: boolean
  /** MagicDNS name without the trailing dot, e.g. "mac-mini.tail1234.ts.net". */
  dnsName: string | null
  /** First Tailscale IPv4 (100.64.0.0/10). The mobile host regex can't take IPv6. */
  ipv4: string | null
  /** Tailnet has HTTPS certificates enabled (CertDomains non-empty). */
  httpsCertsEnabled: boolean
  /** `tailscale serve` proxies https://<dnsName>:443/ to this agent's port. */
  serveActive: boolean
}

const CLI_CANDIDATES = [
  '/usr/local/bin/tailscale', // Standalone app "CLI integration", or Intel Homebrew
  '/opt/homebrew/bin/tailscale', // Apple Silicon Homebrew (open-source tailscaled)
  '/Applications/Tailscale.app/Contents/MacOS/Tailscale', // App Store / Standalone app bundle
  '/usr/bin/tailscale', // Linux packages
]

const CACHE_TTL_MS = 30_000
const EXEC_TIMEOUT_MS = 3_000

let cached: { value: TailscaleInfo; at: number } | null = null

function findCli(): string | null {
  for (const candidate of CLI_CANDIDATES) {
    if (existsSync(candidate)) return candidate
  }
  const fromPath = Bun.which('tailscale')
  return fromPath ?? null
}

async function runCli(bin: string, args: string[]): Promise<string | null> {
  try {
    const proc = Bun.spawn([bin, ...args], {
      stdout: 'pipe',
      stderr: 'ignore',
      stdin: 'ignore',
      // The GUI app binary decides GUI-vs-CLI from its environment; under a
      // LaunchAgent it can otherwise try to launch the app UI.
      env: { ...process.env, TAILSCALE_BE_CLI: '1' },
    })
    const timer = setTimeout(() => proc.kill(), EXEC_TIMEOUT_MS)
    const out = await new Response(proc.stdout).text()
    const code = await proc.exited
    clearTimeout(timer)
    return code === 0 ? out : null
  } catch {
    return null
  }
}

/** Parse `tailscale status --json`. Exported for tests. */
export function parseStatus(json: string): Pick<TailscaleInfo, 'running' | 'dnsName' | 'ipv4' | 'httpsCertsEnabled'> {
  try {
    const s = JSON.parse(json) as {
      BackendState?: string
      Self?: { DNSName?: string; TailscaleIPs?: string[] }
      CertDomains?: string[] | null
    }
    const dnsName = (s.Self?.DNSName ?? '').replace(/\.$/, '') || null
    const ipv4 = (s.Self?.TailscaleIPs ?? []).find((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip)) ?? null
    return {
      running: s.BackendState === 'Running',
      dnsName,
      ipv4,
      httpsCertsEnabled: Array.isArray(s.CertDomains) && s.CertDomains.length > 0,
    }
  } catch {
    return { running: false, dnsName: null, ipv4: null, httpsCertsEnabled: false }
  }
}

/**
 * Parse `tailscale serve status --json` and decide whether https://<dnsName>:443/
 * is proxied to this agent. Exported for tests.
 */
export function parseServeActive(json: string, dnsName: string | null, agentPort: number): boolean {
  if (!dnsName) return false
  try {
    const cfg = JSON.parse(json) as {
      Web?: Record<string, { Handlers?: Record<string, { Proxy?: string }> }>
    }
    const site = cfg.Web?.[`${dnsName}:443`]
    const proxy = site?.Handlers?.['/']?.Proxy ?? ''
    return new RegExp(`^(https?://)?(127\\.0\\.0\\.1|localhost):${agentPort}/?$`).test(proxy)
  } catch {
    return false
  }
}

export async function getTailscaleInfo(options: { forceRefresh?: boolean } = {}): Promise<TailscaleInfo> {
  if (!options.forceRefresh && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value

  const empty: TailscaleInfo = {
    installed: false, running: false, dnsName: null, ipv4: null, httpsCertsEnabled: false, serveActive: false,
  }
  const bin = findCli()
  if (!bin) {
    cached = { value: empty, at: Date.now() }
    return empty
  }

  const statusJson = await runCli(bin, ['status', '--json'])
  const status = statusJson ? parseStatus(statusJson) : { running: false, dnsName: null, ipv4: null, httpsCertsEnabled: false }
  let serveActive = false
  if (status.running && status.dnsName) {
    const serveJson = await runCli(bin, ['serve', 'status', '--json'])
    const port = Number(process.env.POCKETDEV_PORT ?? 4387)
    serveActive = serveJson ? parseServeActive(serveJson, status.dnsName, port) : false
  }

  const value: TailscaleInfo = { installed: true, ...status, serveActive }
  cached = { value, at: Date.now() }
  return value
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/** Loopback-only address. Note 0.0.0.0 is NOT loopback as a bind address — it means "all interfaces". */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.toLowerCase())
}

/** A host a phone can't connect to (loopback, or the 0.0.0.0 placeholder extractHostIp returns). */
export function isUnreachableFromPhone(host: string): boolean {
  return isLoopbackHost(host) || host === '0.0.0.0' || host === ''
}

export interface PairingAddress {
  host: string
  port: number
  secure: boolean
  /** Shown next to the QR when the address probably won't work from a phone. */
  hint: string | null
}

/**
 * Pick the address to put in the pairing QR. Priority:
 *   1. explicit domain (domain.txt) — existing Linux/Caddy behaviour
 *   2. HTTPS proxy in front of us: Caddy (Linux) or Tailscale Serve
 *   3. Tailscale running without serve → tailnet IPv4 on the agent port
 *   4. whatever host the browser used, with a warning if it's loopback
 */
export function choosePairingAddress(input: {
  requestHost: string
  domain: string | null
  caddyActive: boolean
  agentPort: number
  agentHost: string
  tailscale: TailscaleInfo
  /**
   * Prefer the tailnet IP over the host the browser used. True on macOS
   * (home NAT — the LAN/public address is useless off-network). On Linux only
   * when the browser host is loopback, so VPS pairing behaviour is unchanged.
   */
  preferTailnet: boolean
}): PairingAddress {
  const { requestHost, domain, caddyActive, agentPort, agentHost, tailscale, preferTailnet } = input

  if (domain) return { host: domain, port: caddyActive ? 443 : agentPort, secure: caddyActive, hint: null }
  if (caddyActive) return { host: requestHost, port: 443, secure: true, hint: null }

  if (tailscale.running && tailscale.serveActive && tailscale.dnsName) {
    return { host: tailscale.dnsName, port: 443, secure: true, hint: 'Via Tailscale Serve — your phone needs the Tailscale app connected to the same tailnet.' }
  }

  if (preferTailnet && tailscale.running && tailscale.ipv4 && !isLoopbackHost(agentHost)) {
    return {
      host: tailscale.ipv4,
      port: agentPort,
      secure: false,
      hint: 'Via Tailscale (plain HTTP inside the encrypted tailnet). Android release builds block cleartext — enable Tailscale Serve for HTTPS.',
    }
  }

  if (isUnreachableFromPhone(requestHost)) {
    return {
      host: requestHost,
      port: agentPort,
      secure: false,
      hint: "This QR points at this machine's loopback address, which your phone can't reach. Open the console via this machine's LAN or Tailscale address, or set up Tailscale.",
    }
  }

  return { host: requestHost, port: agentPort, secure: false, hint: null }
}
