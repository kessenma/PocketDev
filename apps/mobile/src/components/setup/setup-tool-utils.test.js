const { getCodexBlockedReason, getCopilotBlockedReason, getServerSetupStatus } = require('./setup-tool-utils')

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

describe('getCopilotBlockedReason', () => {
  it('blocks Copilot setup when git is missing', () => {
    const report = {
      tools: [
        { id: 'git', status: 'missing', auth_status: 'not_applicable' },
        { id: 'github_cli', status: 'installed', auth_status: 'authenticated' },
      ],
    }

    expect(getCopilotBlockedReason(report)).toBe(
      'Complete Git setup first so Copilot can use your Git identity and GitHub access.',
    )
  })

  it('blocks Copilot setup when GitHub CLI auth is missing', () => {
    const report = {
      tools: [
        { id: 'git', status: 'installed', auth_status: 'authenticated' },
        { id: 'github_cli', status: 'installed', auth_status: 'unauthenticated' },
      ],
    }

    expect(getCopilotBlockedReason(report)).toBe(
      'Complete GitHub CLI setup first so Copilot can sign in with GitHub.',
    )
  })

  it('allows Copilot setup when git and GitHub CLI are ready', () => {
    const report = {
      tools: [
        { id: 'git', status: 'installed', auth_status: 'authenticated' },
        { id: 'github_cli', status: 'installed', auth_status: 'authenticated' },
      ],
    }

    expect(getCopilotBlockedReason(report)).toBeNull()
  })
})

describe('getServerSetupStatus', () => {
  it('treats OpenCode as a valid AI runtime when installed', () => {
    const report = {
      tools: [
        { id: 'git', name: 'Git', status: 'installed', auth_status: 'authenticated', required: true },
        { id: 'npm', name: 'npm', status: 'installed', auth_status: 'not_applicable', required: true },
        { id: 'opencode_cli', name: 'OpenCode CLI', status: 'installed', auth_status: 'not_applicable', required: false },
      ],
    }

    expect(getServerSetupStatus(report).aiReady).toBe(true)
  })
})
