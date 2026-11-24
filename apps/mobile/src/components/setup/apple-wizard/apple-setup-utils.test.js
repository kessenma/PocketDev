const {
  ASC_SIGN_IN_PROMPTS,
  getAppleSummaryRows,
  getFirstAppleStep,
  getMarkerResult,
  getXcodesPrompts,
  isLikelyP8Key,
  parseKeyIdFromFileName,
  toReadablePath,
  withResultMarker,
} = require('./apple-setup-utils')
const { createSecurePromptMatcher } = require('../../../utils/secure-prompts')

function makeStatus(overrides = {}) {
  return {
    supported: true,
    xcode: {
      installed: true,
      app_path: '/Applications/Xcode.app',
      version: '16.2',
      build: '16C5032a',
      beta: false,
      selected: true,
      developer_dir: '/Applications/Xcode.app/Contents/Developer',
      license_accepted: true,
      first_launch_done: true,
      ios_platform_installed: true,
      ...overrides.xcode,
    },
    asc: { installed: true, path: '/usr/local/bin/asc', version: '0.20.0', telemetry_enabled: false, ...overrides.asc },
    account: {
      configured: true,
      profile_name: 'pocketdev',
      key_id: 'ABC123DEFG',
      validation: null,
      validation_error: null,
      web_session: false,
      ...overrides.account,
    },
    signing_identities: 1,
    commands: {
      install_xcode_app_store: 'mas get 497799835',
      install_xcode_xcodes: 'xcodes install --latest',
      finish_xcode: null,
      download_ios_platform: null,
      install_asc: 'curl -fsSL https://asccli.sh/install | bash',
      ...overrides.commands,
    },
    ready: true,
  }
}

describe('parseKeyIdFromFileName', () => {
  it('reads the key id from an App Store Connect file name', () => {
    expect(parseKeyIdFromFileName('AuthKey_ABC123DEFG.p8')).toBe('ABC123DEFG')
  })

  it('handles duplicate downloads, paths and lowercase', () => {
    expect(parseKeyIdFromFileName('AuthKey_abc123defg (1).p8')).toBe('ABC123DEFG')
    expect(parseKeyIdFromFileName('/private/var/tmp/AuthKey_ZZZZ999999.p8')).toBe('ZZZZ999999')
  })

  it('returns null for other files', () => {
    expect(parseKeyIdFromFileName('key.p8')).toBeNull()
    expect(parseKeyIdFromFileName('AuthKey_SHORT.p8')).toBeNull()
    expect(parseKeyIdFromFileName('AuthKey_ABC123DEFG.pem')).toBeNull()
    expect(parseKeyIdFromFileName(null)).toBeNull()
  })
})

describe('isLikelyP8Key', () => {
  it('accepts a PEM private key', () => {
    const begin = '-----BEGIN ' + 'PRIVATE KEY-----'
    const end = '-----END ' + 'PRIVATE KEY-----'
    expect(isLikelyP8Key(`${begin}\nMIGTAgEAMBMGByqGSM49\n${end}\n`)).toBe(true)
    expect(isLikelyP8Key('hello')).toBe(false)
  })
})

describe('toReadablePath', () => {
  it('turns file:// uris into decoded paths and leaves content:// alone', () => {
    expect(toReadablePath('file:///var/mobile/tmp/AuthKey%20copy.p8')).toBe('/var/mobile/tmp/AuthKey copy.p8')
    expect(toReadablePath('content://com.android.providers/document/1')).toBe('content://com.android.providers/document/1')
  })
})

describe('getFirstAppleStep', () => {
  it('starts at Xcode when it is missing or needs setup', () => {
    expect(getFirstAppleStep(makeStatus({ xcode: { installed: false } }))).toBe('xcode')
    expect(getFirstAppleStep(makeStatus({ commands: { finish_xcode: 'sudo xcodebuild -license accept' } }))).toBe('xcode')
  })

  it('moves on to asc, then the account, then verify', () => {
    expect(getFirstAppleStep(makeStatus({ asc: { installed: false } }))).toBe('asc')
    expect(getFirstAppleStep(makeStatus({ account: { configured: false } }))).toBe('account')
    expect(getFirstAppleStep(makeStatus())).toBe('verify')
  })
})

describe('getAppleSummaryRows', () => {
  it('summarises Xcode, asc and the key from the prerequisites report', () => {
    const report = {
      os: 'macOS 15.2',
      tools: [
        { id: 'xcode', status: 'misconfigured', version: '16.2', details: { beta: 'false' } },
        { id: 'asc_cli', status: 'installed', auth_status: 'authenticated', version: '0.20.0', details: { key_id: 'ABC123DEFG' } },
      ],
    }
    expect(getAppleSummaryRows(report)).toEqual([
      { id: 'xcode', label: 'Xcode', state: 'attention', detail: 'Xcode 16.2 · needs a one-time setup' },
      { id: 'asc_cli', label: 'asc CLI', state: 'ready', detail: 'v0.20.0' },
      { id: 'asc_key', label: 'App Store Connect key', state: 'ready', detail: 'Key ABC123DEFG' },
    ])
  })

  it('flags beta Xcode and missing tools', () => {
    const report = {
      os: 'macOS 15.2',
      tools: [
        { id: 'xcode', status: 'misconfigured', version: '16.3', details: { beta: 'true' } },
        { id: 'asc_cli', status: 'missing', auth_status: 'unauthenticated', version: null, details: {} },
      ],
    }
    const rows = getAppleSummaryRows(report)
    expect(rows[0].detail).toBe("Xcode 16.3 · beta can't upload")
    expect(rows[1].state).toBe('missing')
    expect(rows[2]).toMatchObject({ state: 'missing', detail: 'Not connected' })
  })
})

describe('result markers', () => {
  it('detects OK / FAIL lines but not the echoed command', () => {
    const cmd = withResultMarker('asc --version', 'abc1')
    const echo = `% ${cmd}\r\n`
    expect(getMarkerResult(echo, 'abc1')).toBeNull()
    expect(getMarkerResult(`${echo}0.20.0\r\n\r\n__PD_abc1_OK\r\n`, 'abc1')).toBe('ok')
    expect(getMarkerResult(`${echo}boom\r\n\r\n__PD_abc1_FAIL\r\n`, 'abc1')).toBe('fail')
    expect(getMarkerResult('__PD_other_OK\r\n', 'abc1')).toBeNull()
  })
})

describe('Apple sign-in prompts', () => {
  it('asks for the asc password, then the 2FA code with Apple’s message', () => {
    const matcher = createSecurePromptMatcher(ASC_SIGN_IN_PROMPTS)
    expect(matcher.push('Apple Account password: ')).toMatchObject({ kind: 'password' })
    expect(matcher.push('\r\nVerification code sent to your trusted devices.\r\nEnter 2FA ')).toBeNull()
    expect(matcher.push('code: ')).toMatchObject({
      kind: 'code',
      message: 'Verification code sent to your trusted devices.',
    })
  })

  it('handles the xcodes prompts', () => {
    const matcher = createSecurePromptMatcher(getXcodesPrompts('me@example.com'))
    expect(matcher.push('Apple ID: ')).toMatchObject({ kind: 'text', defaultValue: 'me@example.com' })
    expect(matcher.push('me@example.com\r\nApple ID Password: ')).toMatchObject({ kind: 'password' })
    const code = matcher.push(
      '\r\nTwo-factor authentication is enabled for this account.\r\n\r\nEnter "sms" without quotes to exit this prompt and choose a phone number to send an SMS security code to.\r\nEnter the 6 digit code from one of your trusted devices: ',
    )
    expect(code).toMatchObject({ kind: 'code', alternative: { label: 'Text me a code instead', value: 'sms' } })
    expect(matcher.push('sms\r\nTrusted phone numbers:\r\n1: •••-••12\r\nSelect a trusted phone number to receive a code via SMS: '))
      .toMatchObject({ title: 'Choose a phone number' })
    expect(matcher.push('1\r\nEnter the 6 digit code sent to •••-••12: ')).toMatchObject({ kind: 'code', alternative: null })
  })
})
