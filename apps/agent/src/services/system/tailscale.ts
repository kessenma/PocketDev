/**
 * Tailscale detection + guided setup for reaching the agent from a phone when
 * the host is behind NAT (e.g. a Mac mini at home). See docs/macos/tailscale.md.
 *
 * Reads state with `tailscale status --json` / `tailscale serve status --json`.
 * The only config it changes is what the console explicitly asks for:
 * starting a login (`tailscale up`) and turning Serve on/off for our port.
 */

import { existsSync } from 'node:fs'
import { networkInterfaces } from 'node:os'

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

/** Full checklist for the console's "Remote access" card. */
export interface TailscaleSetupStatus extends TailscaleInfo {
  cliPath: string | null
  /** NoState | NeedsLogin | NeedsMachineAuth | Stopped | Starting | Running | null (not installed / unreadable) */
  backendState: string | null
  /** Pending login URL reported by tailscaled (when BackendState is NeedsLogin). */
  authUrl: string | null
  magicDnsEnabled: boolean
  /** Node key never expires (admin console → Machines → Disable key expiry). */
  keyExpiryDisabled: boolean
  /** Something other than this agent is already served on https :443. */
  serveConflict: string | null
  /** The agent only listens on loopback, so it's reachable only through Serve. */
  agentLoopbackOnly: boolean
  agentPort: number
}

const CLI_CANDIDATES = [
  '/usr/local/bin/tailscale', // Standalone app "CLI integration", or Intel Homebrew
  '/opt/homebrew/bin/tailscale', // Apple Silicon Homebrew (open-source tailscaled)
  '/Applications/Tailscale.app/Contents/MacOS/Tailscale', // App Store / Standalone app bundle
  '/usr/bin/tailscale', // Linux packages
]

const CACHE_TTL_MS = 30_000
const EXEC_TIMEOUT_MS = 3_000

let cached: { value: TailscaleSetupStatus; at: number } | null = null

function agentPort(): number {
  return Number(process.env.POCKETDEV_PORT ?? 4387)
}

function findCli(): string | null {
  for (const candidate of CLI_CANDIDATES) {
    if (existsSync(candidate)) return candidate
  }
  const fromPath = Bun.which('tailscale')
  return fromPath ?? null
}

// The GUI app binary decides GUI-vs-CLI from its environment; under a
// LaunchAgent it can otherwise try to launch the app UI.
const CLI_ENV = () => ({ ...process.env, TAILSCALE_BE_CLI: '1' })

async function runCli(bin: string, args: string[], timeoutMs = EXEC_TIMEOUT_MS): Promise<{ out: string; code: number }> {
  try {
    const proc = Bun.spawn([bin, ...args], { stdout: 'pipe', stderr: 'pipe', stdin: 'ignore', env: CLI_ENV() })
    const timer = setTimeout(() => proc.kill(), timeoutMs)
    const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()])
    const code = await proc.exited
    clearTimeout(timer)
    return { out: out || err, code }
  } catch (err) {
    return { out: err instanceof Error ? err.message : String(err), code: -1 }
  }
}

/**
 * Start a long-running CLI command (login / serve) and wait up to `waitMs`.
 * Both can block waiting for the user to approve something in a browser, in
 * which case they print a login.tailscale.com URL — we return that instead of
 * hanging the HTTP request. The process keeps running (up to `lifetimeMs`) so
 * the flow can complete once the user approves.
 */
async function runInteractive(
  bin: string,
  args: string[],
  waitMs: number,
  lifetimeMs = 10 * 60_000,
): Promise<{ done: boolean; code: number | null; output: string; url: string | null }> {
  const proc = Bun.spawn([bin, ...args], { stdout: 'pipe', stderr: 'pipe', stdin: 'ignore', env: CLI_ENV() })
  let output = ''
  const decoder = new TextDecoder()
  const pump = async (stream: ReadableStream<Uint8Array>) => {
    const reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        output += decoder.decode(value, { stream: true })
      }
    } catch { /* closed */ }
  }
  void pump(proc.stdout as ReadableStream<Uint8Array>)
  void pump(proc.stderr as ReadableStream<Uint8Array>)
  const killTimer = setTimeout(() => { try { proc.kill() } catch { /* gone */ } }, lifetimeMs)
  proc.exited.finally(() => clearTimeout(killTimer))

  const started = Date.now()
  let code: number | null = null
  proc.exited.then((c) => { code = c })
  while (Date.now() - started < waitMs) {
    if (code !== null) break
    if (extractLoginUrl(output)) break
    await Bun.sleep(250)
  }
  await Bun.sleep(100) // let trailing output flush
  return { done: code !== null, code, output: output.trim(), url: extractLoginUrl(output) }
}

export function extractLoginUrl(text: string): string | null {
  return text.match(/https:\/\/login\.tailscale\.com\/[^\s"')]+/)?.[0] ?? null
}

interface RawStatus {
  BackendState?: string
  AuthURL?: string
  Self?: { DNSName?: string; TailscaleIPs?: string[]; KeyExpiry?: string }
  CertDomains?: string[] | null
  CurrentTailnet?: { MagicDNSEnabled?: boolean } | null
}

/** Parse `tailscale status --json`. Exported for tests. */
export function parseStatus(json: string): Pick<TailscaleInfo, 'running' | 'dnsName' | 'ipv4' | 'httpsCertsEnabled'>
  & Pick<TailscaleSetupStatus, 'backendState' | 'authUrl' | 'magicDnsEnabled' | 'keyExpiryDisabled'> {
  try {
    const s = JSON.parse(json) as RawStatus
    const dnsName = (s.Self?.DNSName ?? '').replace(/\.$/, '') || null
    const ipv4 = (s.Self?.TailscaleIPs ?? []).find((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip)) ?? null
    const running = s.BackendState === 'Running'
    return {
      running,
      dnsName,
      ipv4,
      httpsCertsEnabled: Array.isArray(s.CertDomains) && s.CertDomains.length > 0,
      backendState: s.BackendState ?? null,
      authUrl: s.AuthURL || null,
      magicDnsEnabled: s.CurrentTailnet?.MagicDNSEnabled === true,
      // tailscaled omits KeyExpiry when expiry is disabled for the node.
      keyExpiryDisabled: running && !s.Self?.KeyExpiry,
    }
  } catch {
    return {
      running: false, dnsName: null, ipv4: null, httpsCertsEnabled: false,
      backendState: null, authUrl: null, magicDnsEnabled: false, keyExpiryDisabled: false,
    }
  }
}

/**
 * Parse `tailscale serve status --json`: is https://<dnsName>:443/ proxied to
 * this agent, and if not, is something else already there? Exported for tests.
 */
export function parseServe(json: string, dnsName: string | null, port: number): { active: boolean; conflict: string | null } {
  if (!dnsName) return { active: false, conflict: null }
  try {
    const cfg = JSON.parse(json) as {
      Web?: Record<string, { Handlers?: Record<string, { Proxy?: string; Path?: string; Text?: string }> }>
    }
    const handlers = cfg.Web?.[`${dnsName}:443`]?.Handlers ?? {}
    const root = handlers['/']
    const proxy = root?.Proxy ?? ''
    const active = new RegExp(`^(https?://)?(127\\.0\\.0\\.1|localhost):${port}/?$`).test(proxy)
    if (active) return { active: true, conflict: null }
    if (root) return { active: false, conflict: proxy || root.Path || 'another handler' }
    return { active: false, conflict: null }
  } catch {
    return { active: false, conflict: null }
  }
}

/** Back-compat helper used by tests. */
export function parseServeActive(json: string, dnsName: string | null, port: number): boolean {
  return parseServe(json, dnsName, port).active
}

function emptyStatus(): TailscaleSetupStatus {
  const host = process.env.POCKETDEV_HOST ?? '0.0.0.0'
  return {
    installed: false, running: false, dnsName: null, ipv4: null, httpsCertsEnabled: false, serveActive: false,
    cliPath: null, backendState: null, authUrl: null, magicDnsEnabled: false, keyExpiryDisabled: false,
    serveConflict: null, agentLoopbackOnly: isLoopbackHost(host), agentPort: agentPort(),
  }
}

export async function getTailscaleSetupStatus(options: { forceRefresh?: boolean } = {}): Promise<TailscaleSetupStatus> {
  if (!options.forceRefresh && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value

  const value = emptyStatus()
  const bin = findCli()
  if (bin) {
    value.installed = true
    value.cliPath = bin
    // `status --json` can exit non-zero while stopped/logged out but still prints JSON.
    const { out } = await runCli(bin, ['status', '--json'])
    Object.assign(value, parseStatus(out))
    if (value.running && value.dnsName) {
      const serve = await runCli(bin, ['serve', 'status', '--json'])
      const parsed = serve.code === 0 ? parseServe(serve.out, value.dnsName, value.agentPort) : { active: false, conflict: null }
      value.serveActive = parsed.active
      value.serveConflict = parsed.conflict
    }
  }

  cached = { value, at: Date.now() }
  return value
}

export async function getTailscaleInfo(options: { forceRefresh?: boolean } = {}): Promise<TailscaleInfo> {
  const s = await getTailscaleSetupStatus(options)
  return {
    installed: s.installed, running: s.running, dnsName: s.dnsName, ipv4: s.ipv4,
    httpsCertsEnabled: s.httpsCertsEnabled, serveActive: s.serveActive,
  }
}

export function invalidateTailscaleCache(): void {
  cached = null
}

export interface TailscaleActionResult {
  ok: boolean
  /** Open this in a browser to finish (login, or enable HTTPS for the tailnet). */
  actionUrl: string | null
  message: string
  status: TailscaleSetupStatus
}

/** Log this machine into Tailscale (or reconnect it). Returns the login URL when one is needed. */
export async function startTailscaleLogin(): Promise<TailscaleActionResult> {
  const before = await getTailscaleSetupStatus({ forceRefresh: true })
  if (!before.cliPath) {
    return { ok: false, actionUrl: null, message: 'Tailscale is not installed on this machine.', status: before }
  }
  if (before.running) {
    return { ok: true, actionUrl: null, message: 'Already connected to Tailscale.', status: before }
  }
  if (before.authUrl) {
    return { ok: true, actionUrl: before.authUrl, message: 'Open the link to log this machine into Tailscale.', status: before }
  }

  const result = await runInteractive(before.cliPath, ['up'], 15_000)
  invalidateTailscaleCache()
  const status = await getTailscaleSetupStatus({ forceRefresh: true })
  const url = result.url ?? status.authUrl
  if (status.running) return { ok: true, actionUrl: null, message: 'Connected to Tailscale.', status }
  if (url) return { ok: true, actionUrl: url, message: 'Open the link to log this machine into Tailscale, then refresh.', status }
  return { ok: false, actionUrl: null, message: result.output.slice(-500) || 'tailscale up did not return a login URL.', status }
}

/** Serve https://<machine>.<tailnet>.ts.net → http://127.0.0.1:<agent port>. */
export async function enableTailscaleServe(): Promise<TailscaleActionResult> {
  const before = await getTailscaleSetupStatus({ forceRefresh: true })
  if (!before.cliPath || !before.running) {
    return { ok: false, actionUrl: null, message: 'Connect this machine to Tailscale first.', status: before }
  }
  if (before.serveActive) {
    return { ok: true, actionUrl: null, message: 'Tailscale Serve is already set up.', status: before }
  }
  if (before.serveConflict) {
    return {
      ok: false, actionUrl: null, status: before,
      message: `Tailscale Serve already serves ${before.serveConflict} on https :443 — not overwriting it. Remove it with \`tailscale serve --https=443 off\` first.`,
    }
  }

  const result = await runInteractive(before.cliPath, ['serve', '--bg', `http://127.0.0.1:${before.agentPort}`], 20_000)
  invalidateTailscaleCache()
  const status = await getTailscaleSetupStatus({ forceRefresh: true })
  if (status.serveActive) return { ok: true, actionUrl: null, message: `Serving https://${status.dnsName}`, status }
  if (result.url) {
    return {
      ok: false, actionUrl: result.url, status,
      message: 'HTTPS needs to be enabled for your tailnet. Open the link, approve, then try again.',
    }
  }
  return { ok: false, actionUrl: null, message: result.output.slice(-500) || 'tailscale serve failed.', status }
}

export async function disableTailscaleServe(): Promise<TailscaleActionResult> {
  const before = await getTailscaleSetupStatus({ forceRefresh: true })
  if (!before.cliPath) return { ok: false, actionUrl: null, message: 'Tailscale is not installed.', status: before }
  if (!before.serveActive) return { ok: true, actionUrl: null, message: 'Tailscale Serve was not on.', status: before }
  const { out, code } = await runCli(before.cliPath, ['serve', '--https=443', 'off'], 10_000)
  invalidateTailscaleCache()
  const status = await getTailscaleSetupStatus({ forceRefresh: true })
  return { ok: code === 0 && !status.serveActive, actionUrl: null, message: code === 0 ? 'Tailscale Serve turned off.' : out.slice(-500), status }
}

// ─── Network detection ──────────────────────────────────────────────────

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

function inCidr(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask)
}

export function isPrivateLanIpv4(ip: string): boolean {
  return inCidr(ip, '10.0.0.0', 8) || inCidr(ip, '172.16.0.0', 12) || inCidr(ip, '192.168.0.0', 16)
}

export function isTailnetIpv4(ip: string): boolean {
  return inCidr(ip, '100.64.0.0', 10)
}

export interface NetworkSummary {
  /** Best LAN address for same-Wi-Fi pairing (en0/en1 preferred). */
  lanIpv4: string | null
  /** Any interface has a public IPv4 (typical VPS). */
  hasPublicIpv4: boolean
  /** Looks like a machine behind a home/office router — suggest Tailscale. */
  likelyPrivateNetwork: boolean
}

/** Exported for tests; pass os.networkInterfaces()-shaped data. */
export function summarizeNetwork(
  ifaces: Record<string, Array<{ address: string; family: string | number; internal: boolean }> | undefined>,
  platform: NodeJS.Platform = process.platform,
): NetworkSummary {
  const lan: Array<{ name: string; address: string }> = []
  let hasPublicIpv4 = false
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const a of addrs ?? []) {
      const isV4 = a.family === 'IPv4' || a.family === 4
      if (!isV4 || a.internal) continue
      if (isTailnetIpv4(a.address) || inCidr(a.address, '169.254.0.0', 16)) continue
      if (isPrivateLanIpv4(a.address)) lan.push({ name, address: a.address })
      else hasPublicIpv4 = true
    }
  }
  const rank = (n: string) => (n === 'en0' ? 0 : n === 'en1' ? 1 : /^(en|eth|wl)/.test(n) ? 2 : 3)
  lan.sort((a, b) => rank(a.name) - rank(b.name))
  return {
    lanIpv4: lan[0]?.address ?? null,
    hasPublicIpv4,
    likelyPrivateNetwork: platform === 'darwin' || (!hasPublicIpv4 && lan.length > 0),
  }
}

export function getNetworkSummary(): NetworkSummary {
  return summarizeNetwork(networkInterfaces() as Parameters<typeof summarizeNetwork>[0])
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
  /** LAN IPv4 for same-Wi-Fi pairing when the console was opened via localhost. */
  lanIpv4?: string | null
}): PairingAddress {
  const { requestHost, domain, caddyActive, agentPort, agentHost, tailscale, preferTailnet, lanIpv4 = null } = input

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

  if (isUnreachableFromPhone(requestHost) && lanIpv4 && !isLoopbackHost(agentHost)) {
    return {
      host: lanIpv4,
      port: agentPort,
      secure: false,
      hint: 'Same Wi-Fi only: your phone must be on this network to connect. Set up Tailscale to connect from anywhere.',
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
