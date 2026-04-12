import { describe, expect, test } from 'bun:test'
import { __test } from './copilot-setup.ts'

describe('copilot-setup trust parsing', () => {
  test('detects the folder trust prompt', () => {
    const result = __test.parseTrustStateFromOutput([
      'GitHub Copilot v1.0.18\n',
      'Confirm folder trust\n',
      '/Users/ke\n',
      'Do you trust the files in this folder?\n',
      '› 1. Yes\n',
      '2. Yes, and remember this folder for future sessions\n',
    ].join(''))

    expect(result.state).toBe('awaiting_trust')
    expect(result.trustTarget).toBe('/Users/ke')
    expect(result.trusted).toBe(false)
  })

  test('detects a trusted and ready session after the first-run prompt is cleared', () => {
    const result = __test.parseTrustStateFromOutput([
      'GitHub Copilot v1.0.18\n',
      'Describe a task to get started.\n',
      'Tip: /usage Display session usage metrics and statistics\n',
    ].join(''))

    expect(result.state).toBe('trusted')
    expect(result.trusted).toBe(true)
  })
})
