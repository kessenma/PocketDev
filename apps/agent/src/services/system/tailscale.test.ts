import { describe, expect, test } from 'bun:test'
import { choosePairingAddress, extractLoginUrl, parseServe, parseServeActive, parseStatus, summarizeNetwork, type TailscaleInfo } from './tailscale.ts'

const DNS = 'mac-mini.tail1234.ts.net'

const statusJson = JSON.stringify({
  BackendState: 'Running',
  Self: { DNSName: `${DNS}.`, TailscaleIPs: ['100.101.102.103', 'fd7a:115c:a1e0::1'] },
  CertDomains: [DNS],
})

const serveJson = (proxy: string) => JSON.stringify({
  TCP: { '443': { HTTPS: true } },
  Web: { [`${DNS}:443`]: { Handlers: { '/': { Proxy: proxy } } } },
})

const ts = (over: Partial<TailscaleInfo> = {}): TailscaleInfo => ({
  installed: true, running: true, dnsName: DNS, ipv4: '100.101.102.103',
  httpsCertsEnabled: true, serveActive: false, ...over,
})

const base = {
  requestHost: 'localhost', domain: null, caddyActive: false,
  agentPort: 4387, agentHost: '0.0.0.0', preferTailnet: true,
}

describe('tailscale status parsing', () => {
  test('extracts MagicDNS name, IPv4 and cert support', () => {
    expect(parseStatus(statusJson)).toMatchObject({
      running: true, dnsName: DNS, ipv4: '100.101.102.103', httpsCertsEnabled: true,
      backendState: 'Running', keyExpiryDisabled: true,
    })
  })

  test('reads MagicDNS, key expiry and pending login URL', () => {
    const withExpiry = JSON.parse(statusJson)
    withExpiry.Self.KeyExpiry = '2027-05-01T00:00:00Z'
    withExpiry.CurrentTailnet = { MagicDNSEnabled: true }
    expect(parseStatus(JSON.stringify(withExpiry))).toMatchObject({ magicDnsEnabled: true, keyExpiryDisabled: false })
    expect(parseStatus(JSON.stringify({ BackendState: 'NeedsLogin', AuthURL: 'https://login.tailscale.com/a/abc' })))
      .toMatchObject({ running: false, backendState: 'NeedsLogin', authUrl: 'https://login.tailscale.com/a/abc' })
  })

  test('flags an existing :443 handler as a conflict instead of overwriting it', () => {
    expect(parseServe(serveJson('http://127.0.0.1:3000'), DNS, 4387)).toEqual({ active: false, conflict: 'http://127.0.0.1:3000' })
    expect(parseServe(serveJson('http://127.0.0.1:4387'), DNS, 4387)).toEqual({ active: true, conflict: null })
  })

  test('pulls login/consent URLs out of CLI output', () => {
    expect(extractLoginUrl('To authenticate, visit:\n\n\thttps://login.tailscale.com/a/1a2b3c\n')).toBe('https://login.tailscale.com/a/1a2b3c')
    expect(extractLoginUrl('nothing here')).toBeNull()
  })

  test('tolerates garbage / logged-out output', () => {
    expect(parseStatus('nope').running).toBe(false)
    expect(parseStatus(JSON.stringify({ BackendState: 'NeedsLogin' })).dnsName).toBeNull()
  })

  test('serve is only "active" when :443/ proxies to our port', () => {
    expect(parseServeActive(serveJson('http://127.0.0.1:4387'), DNS, 4387)).toBe(true)
    expect(parseServeActive(serveJson('http://localhost:4387/'), DNS, 4387)).toBe(true)
    expect(parseServeActive(serveJson('http://127.0.0.1:3000'), DNS, 4387)).toBe(false)
    expect(parseServeActive('{}', DNS, 4387)).toBe(false)
  })
})

describe('pairing address selection', () => {
  test('Tailscale Serve → ts.net:443 over HTTPS', () => {
    expect(choosePairingAddress({ ...base, tailscale: ts({ serveActive: true }) }))
      .toMatchObject({ host: DNS, port: 443, secure: true })
  })

  test('Tailscale without serve → tailnet IPv4 on the agent port', () => {
    expect(choosePairingAddress({ ...base, tailscale: ts() }))
      .toMatchObject({ host: '100.101.102.103', port: 4387, secure: false })
  })

  test('agent bound to loopback cannot be reached on the tailnet IP', () => {
    const r = choosePairingAddress({ ...base, agentHost: '127.0.0.1', tailscale: ts() })
    expect(r.host).toBe('localhost')
    expect(r.hint).toContain("can't reach")
  })

  test('Linux VPS behaviour unchanged: public host used when not preferring tailnet', () => {
    const r = choosePairingAddress({ ...base, requestHost: '203.0.113.42', preferTailnet: false, tailscale: ts() })
    expect(r).toEqual({ host: '203.0.113.42', port: 4387, secure: false, hint: null })
  })

  test('domain.txt + Caddy wins over everything', () => {
    expect(choosePairingAddress({ ...base, domain: 'dev.example.com', caddyActive: true, tailscale: ts({ serveActive: true }) }))
      .toEqual({ host: 'dev.example.com', port: 443, secure: true, hint: null })
  })

  test('no Tailscale + localhost → warning', () => {
    const r = choosePairingAddress({ ...base, tailscale: ts({ installed: false, running: false, dnsName: null, ipv4: null }) })
    expect(r.hint).toContain('loopback')
  })

  test('0.0.0.0 bind counts as reachable on the tailnet', () => {
    expect(choosePairingAddress({ ...base, agentHost: '0.0.0.0', tailscale: ts() }).host).toBe('100.101.102.103')
  })
})

describe('same-Wi-Fi fallback', () => {
  const noTs = ts({ installed: false, running: false, dnsName: null, ipv4: null })

  test('console opened at localhost → QR uses the LAN IP', () => {
    const r = choosePairingAddress({ ...base, tailscale: noTs, lanIpv4: '192.168.1.81' })
    expect(r).toMatchObject({ host: '192.168.1.81', port: 4387, secure: false })
    expect(r.hint).toContain('Same Wi-Fi')
  })

  test('Tailscale still wins over the LAN IP', () => {
    expect(choosePairingAddress({ ...base, tailscale: ts(), lanIpv4: '192.168.1.81' }).host).toBe('100.101.102.103')
  })
})

describe('network summary', () => {
  test('Mac on home Wi-Fi', () => {
    expect(summarizeNetwork({
      lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      utun4: [{ address: '100.101.102.103', family: 'IPv4', internal: false }],
      en1: [{ address: '10.0.0.9', family: 'IPv4', internal: false }],
      en0: [{ address: '192.168.1.81', family: 'IPv4', internal: false }],
    }, 'darwin')).toEqual({ lanIpv4: '192.168.1.81', hasPublicIpv4: false, likelyPrivateNetwork: true })
  })

  test('Linux VPS with a public IP is not treated as a home network', () => {
    expect(summarizeNetwork({
      eth0: [{ address: '203.0.113.42', family: 'IPv4', internal: false }],
      docker0: [{ address: '172.17.0.1', family: 'IPv4', internal: false }],
    }, 'linux')).toMatchObject({ hasPublicIpv4: true, likelyPrivateNetwork: false })
  })

  test('Linux box behind NAT is', () => {
    expect(summarizeNetwork({ eth0: [{ address: '192.168.0.20', family: 4, internal: false }] }, 'linux').likelyPrivateNetwork).toBe(true)
  })
})
