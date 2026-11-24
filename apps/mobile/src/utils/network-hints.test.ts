import { classifyHost, isNetworkFailure, reachabilityHint } from './network-hints'

declare const describe: (name: string, test: () => void) => void
declare const it: (name: string, test: () => void) => void
declare const expect: (value: unknown) => {
  toBe: (expected: unknown) => void
  toBeNull: () => void
  toContain: (expected: string) => void
}

describe('classifyHost', () => {
  it('recognises Tailscale addresses', () => {
    expect(classifyHost('mac-mini.tail1234.ts.net')).toBe('tailnet')
    expect(classifyHost('100.101.102.103')).toBe('tailnet')
    expect(classifyHost('100.63.0.1')).toBe('public') // just outside 100.64.0.0/10
  })

  it('recognises home-network and loopback addresses', () => {
    expect(classifyHost('192.168.1.81')).toBe('lan')
    expect(classifyHost('10.0.0.5')).toBe('lan')
    expect(classifyHost('172.20.1.1')).toBe('lan')
    expect(classifyHost('kyles-mac-mini.local')).toBe('lan')
    expect(classifyHost('localhost')).toBe('loopback')
    expect(classifyHost('127.0.0.1')).toBe('loopback')
  })

  it('treats everything else as public', () => {
    expect(classifyHost('203.0.113.42')).toBe('public')
    expect(classifyHost('dev.example.com')).toBe('public')
  })
})

describe('reachabilityHint', () => {
  it('suggests Tailscale for tailnet hosts', () => {
    const hint = reachabilityHint('mac-mini.tail1234.ts.net', { secure: true, platform: 'ios' })
    expect(hint?.suggestTailscale).toBe(true)
  })

  it('warns Android users about cleartext on LAN', () => {
    expect(reachabilityHint('192.168.1.81', { secure: false, platform: 'android' })?.body).toContain('plain-HTTP')
  })

  it('has nothing to add for public hosts', () => {
    expect(reachabilityHint('203.0.113.42', { secure: false, platform: 'ios' })).toBeNull()
  })
})

describe('isNetworkFailure', () => {
  it('matches React Native fetch failures but not auth errors', () => {
    expect(isNetworkFailure(new TypeError('Network request failed'))).toBe(true)
    expect(isNetworkFailure(new Error('Request timed out'))).toBe(true)
    expect(isNetworkFailure(new Error('Invalid pairing code'))).toBe(false)
  })
})
