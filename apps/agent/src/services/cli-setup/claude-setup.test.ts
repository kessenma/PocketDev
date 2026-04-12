import { describe, expect, test } from 'bun:test'
import { __test } from './claude-setup.ts'

describe('claude-setup output normalization', () => {
  test('removes CSI private mode sequences and preserves login prompt text', () => {
    const raw = [
      '\x1b[?2026h',
      'Claude Code can be used with your Claude subscription or billed based on API usage through your Console account.\r\n',
      '\x1b[?2004l',
      ' Select login method:\r\n',
      '\r\n',
      ' \u276f 1. Claude account with subscription · Pro, Max, Team, or Enterprise\r\n',
      '\r\n',
      '   2. Anthropic Console account · API usage billing\r\n',
      '\x1b[?2026l',
    ].join('')

    const normalized = __test.normalizeOutputForMatching(raw)

    expect(normalized).toContain('Select login method:')
    expect(normalized).toContain('Claude account with subscription')
    expect(normalized).not.toContain('[?2026')
    expect(normalized).not.toContain('[?2004')
  })

  test('reconstructs wrapped oauth urls before exposing them to the client', () => {
    const raw = [
      'Browser didn\'t open? Use the url below to sign in (c to copy)\n',
      'https://claude.com/cai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88\n',
      'ed-5944d1962f5e&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.co\n',
      'm%2Foauth%2Fcode%2Fcallback&scope=org%3Acreate_api_key+user%3Aprofile\n',
      'Paste code here if prompted >\n',
    ].join('')

    const [url] = __test.extractAuthUrls(raw)

    expect(url).toContain('client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e')
    expect(url).toContain('redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback')
    expect(url).not.toContain('\n')
  })
})
