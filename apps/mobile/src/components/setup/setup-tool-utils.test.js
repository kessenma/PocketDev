const { getCodexBlockedReason } = require('./setup-tool-utils')

describe('getCodexBlockedReason', () => {
  it('blocks Codex setup when npm is missing', () => {
    const report = {
      tools: [
        { id: 'npm', status: 'missing' },
      ],
    }

    expect(getCodexBlockedReason(report)).toBe(
      'Install package managers first to make npm available for Codex.',
    )
  })

  it('allows Codex setup when npm is installed', () => {
    const report = {
      tools: [
        { id: 'npm', status: 'installed' },
      ],
    }

    expect(getCodexBlockedReason(report)).toBeNull()
  })
})
