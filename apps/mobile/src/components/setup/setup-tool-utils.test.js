const {
  getCodexBlockedReason,
  getCopilotBlockedReason,
  getServerSetupStatus,
  getSetupProgress,
  getSupportingTools,
  shouldShowAppleSetup,
} = require('./setup-tool-utils')

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

describe('App Store tools (xcode / asc_cli)', () => {
  const baseTools = [
    { id: 'git', name: 'Git', status: 'installed', auth_status: 'authenticated', required: true, details: {} },
    { id: 'npm', name: 'npm', status: 'installed', auth_status: 'not_applicable', required: true, details: {} },
    { id: 'claude_cli', name: 'Claude', status: 'installed', auth_status: 'authenticated', required: false, details: {} },
    { id: 'docker', name: 'Docker', status: 'installed', auth_status: 'not_applicable', required: false, details: {} },
  ]
  const appleTools = [
    { id: 'xcode', name: 'Xcode', status: 'missing', auth_status: 'not_applicable', required: false, details: {} },
    { id: 'asc_cli', name: 'App Store Connect CLI', status: 'missing', auth_status: 'unauthenticated', required: false, details: {} },
  ]
  const macReport = { os: 'macOS 15.2', arch: 'arm64', tools: [...baseTools, ...appleTools] }

  it('keeps them out of Supporting Tools', () => {
    const ids = getSupportingTools(macReport).map((t) => t.id)
    expect(ids).toContain('docker')
    expect(ids).not.toContain('xcode')
    expect(ids).not.toContain('asc_cli')
  })

  it('does not count them toward setup progress or readiness', () => {
    const withoutApple = { ...macReport, tools: baseTools }
    expect(getSetupProgress(macReport)).toEqual(getSetupProgress(withoutApple))
    expect(getServerSetupStatus(macReport)).toEqual(getServerSetupStatus(withoutApple))
    expect(getServerSetupStatus(macReport).missing.join(' ')).not.toMatch(/Xcode|App Store/)
  })

  it('shows the App Store section only on macOS hosts that report the tools', () => {
    expect(shouldShowAppleSetup(macReport)).toBe(true)
    expect(shouldShowAppleSetup({ ...macReport, tools: [appleTools[1]] })).toBe(true)
    expect(shouldShowAppleSetup({ ...macReport, tools: baseTools })).toBe(false)
    expect(shouldShowAppleSetup({ ...macReport, os: 'Ubuntu 24.04' })).toBe(false)
    expect(shouldShowAppleSetup(null)).toBe(false)
  })
})
