/**
 * Explain *why* a server address might be unreachable from this phone, based
 * on what kind of address it is. Used by ConnectScreen when pairing or
 * reconnecting fails with a network error (not an auth error).
 *
 * See docs/macos/tailscale.md — home machines are reached over Tailscale.
 */

export type HostKind = 'tailnet' | 'lan' | 'loopback' | 'public'

function ipv4Parts(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const parts = m.slice(1).map(Number)
  return parts.every((p) => p >= 0 && p <= 255) ? parts : null
}

export function classifyHost(rawHost: string): HostKind {
  const host = rawHost.trim().toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return 'loopback'
  if (host.endsWith('.ts.net')) return 'tailnet'
  if (host.endsWith('.local') || host.endsWith('.lan') || host.endsWith('.home.arpa')) return 'lan'
  const ip = ipv4Parts(host)
  if (ip) {
    const [a, b] = ip
    if (a === 127) return 'loopback'
    if (a === 100 && b >= 64 && b <= 127) return 'tailnet' // 100.64.0.0/10 (CGNAT, used by Tailscale)
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'lan'
  }
  return 'public'
}

/** fetch() failures in React Native surface as TypeError('Network request failed') / timeouts. */
export function isNetworkFailure(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /network request failed|network error|timed? ?out|timeout|aborted|abort|could not connect|failed to fetch|ECONNREFUSED|ENOTFOUND|ENETUNREACH/i.test(message)
}

export interface ReachabilityHint {
  kind: HostKind
  title: string
  body: string
  /** Offer the Tailscale store link + retry. */
  suggestTailscale: boolean
}

export function reachabilityHint(host: string, opts: { secure: boolean; platform: 'ios' | 'android' | string }): ReachabilityHint | null {
  const kind = classifyHost(host)
  switch (kind) {
    case 'tailnet':
      return {
        kind,
        title: 'Is Tailscale on?',
        body: `${host} is a Tailscale address. Install the Tailscale app on this phone, log in with the same account as the computer, make sure it's connected, then retry.`,
        suggestTailscale: true,
      }
    case 'lan':
      return {
        kind,
        title: 'Same Wi-Fi needed',
        body:
          `${host} is a local network address, so this phone must be on the same Wi-Fi as the computer.` +
          (opts.platform === 'android' && !opts.secure
            ? ' Android may also block plain-HTTP connections — set up Tailscale with HTTPS in the PocketDev console (Security → Remote Access).'
            : ' To connect from anywhere, set up Tailscale in the PocketDev console (Security → Remote Access) and re-pair.'),
        suggestTailscale: false,
      }
    case 'loopback':
      return {
        kind,
        title: "That's the computer's own address",
        body: `${host} only works on the computer itself. Open the PocketDev console using its network or Tailscale address and scan the new QR code.`,
        suggestTailscale: false,
      }
    default:
      return null
  }
}

export const TAILSCALE_STORE_URL = {
  ios: 'https://apps.apple.com/app/tailscale/id1470499037',
  android: 'https://play.google.com/store/apps/details?id=com.tailscale.ipn',
} as const
