import { describe, expect, test } from 'bun:test'
import { __test } from './opencode-setup.ts'

describe('opencode-setup version parsing', () => {
  test('extracts semver from standard version output', () => {
    expect(__test.parseVersion('opencode 0.9.1')).toBe('0.9.1')
  })

  test('returns null when output has no version', () => {
    expect(__test.parseVersion('OpenCode CLI')).toBeNull()
  })
})
