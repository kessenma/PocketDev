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
})
