import { describe, expect, test } from 'bun:test'
import { choosePairingAddress, parseServeActive, parseStatus, type TailscaleInfo } from './tailscale.ts'

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
    expect(parseStatus(statusJson)).toEqual({
      running: true, dnsName: DNS, ipv4: '100.101.102.103', httpsCertsEnabled: true,
    })
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
