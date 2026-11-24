import { afterEach, describe, expect, test } from 'bun:test'
import {
  __test,
  appleClaudeMdLines,
  appleToolChecks,
  buildCommands,
  buildXcodesInstallCommand,
  defaultKeyName,
  isBetaXcodeBuild,
  pickCredential,
  pickXcodeApp,
  shq,
  validateImport,
} from './apple-setup.ts'
import type { AppleSetupStatus, AppleXcodeStatus } from '@pocketdev/shared/types'

const XCODE_OK: AppleXcodeStatus = {
  installed: true, app_path: '/Applications/Xcode.app', version: '27.2', build: '27B52', beta: false,
  selected: true, developer_dir: '/Applications/Xcode.app/Contents/Developer', license_accepted: true,
  first_launch_done: true, ios_platform_installed: true,
}

function status(overrides: Partial<AppleSetupStatus> = {}): AppleSetupStatus {
  return {
    supported: true,
    xcode: XCODE_OK,
    asc: { installed: true, path: '/Users/me/.local/bin/asc', version: '7.3.1', telemetry_enabled: false },
    account: { configured: true, profile_name: 'pocketdev', key_id: 'ABCDE12345', validation: 'ok', validation_error: null, web_session: false },
    signing_identities: 0,
    commands: buildCommands(XCODE_OK),
    ready: true,
    ...overrides,
  }
}

afterEach(() => __test.setExec(null))

describe('xcode detection helpers', () => {
  test('beta builds end with a lowercase letter or are named beta', () => {
    expect(isBetaXcodeBuild('27B52', 'Xcode.app')).toBe(false)
    expect(isBetaXcodeBuild('17A5241e', 'Xcode.app')).toBe(true)
    expect(isBetaXcodeBuild('27B52', 'Xcode-beta.app')).toBe(true)
    expect(isBetaXcodeBuild(null, 'Xcode.app')).toBe(false)
  })

  test('prefers the selected Xcode, then Xcode.app, then the newest non-beta', () => {
    const apps = ['/Applications/Xcode-26.4.app', '/Applications/Xcode.app', '/Applications/Xcode-beta.app']
    expect(pickXcodeApp(apps, '/Applications/Xcode-26.4.app/Contents/Developer')).toBe('/Applications/Xcode-26.4.app')
    expect(pickXcodeApp(apps, '/Library/Developer/CommandLineTools')).toBe('/Applications/Xcode.app')
    expect(pickXcodeApp(['/Applications/Xcode-26.4.app', '/Applications/Xcode-27.1.app', '/Applications/Xcode-beta.app'], null))
      .toBe('/Applications/Xcode-27.1.app')
    expect(pickXcodeApp([], null)).toBeNull()
  })
})

describe('setup commands', () => {
  test('finish_xcode only includes the steps that are still needed', () => {
    expect(buildCommands(XCODE_OK).finish_xcode).toBeNull()
    const notSelected = buildCommands({ ...XCODE_OK, selected: false, developer_dir: '/Library/Developer/CommandLineTools' })
    expect(notSelected.finish_xcode).toBe("sudo xcode-select -s '/Applications/Xcode.app/Contents/Developer'")
    const fresh = buildCommands({ ...XCODE_OK, selected: false, license_accepted: false, first_launch_done: false })
    expect(fresh.finish_xcode).toContain('sudo xcodebuild -license accept')
    expect(fresh.finish_xcode).toContain('sudo xcodebuild -runFirstLaunch')
  })

  test('iOS platform download is offered only when missing', () => {
    expect(buildCommands(XCODE_OK).download_ios_platform).toBeNull()
    expect(buildCommands({ ...XCODE_OK, ios_platform_installed: false }).download_ios_platform)
      .toContain('xcodebuild -downloadPlatform iOS')
  })

  test('xcodes command quotes the Apple ID and always signs out afterwards', () => {
    const cmd = buildXcodesInstallCommand('me@example.com')
    expect(cmd).toContain("XCODES_USERNAME='me@example.com' xcodes install --latest")
    expect(cmd).toContain('xcodes signout')
    // Anything that isn't a plain email is ignored rather than interpolated
    expect(buildXcodesInstallCommand("x'; rm -rf ~; '@a.b")).not.toContain('XCODES_USERNAME')
  })

  test('shq escapes single quotes', () => {
    expect(shq("it's")).toBe(`'it'\\''s'`)
  })

  test('default key name uses the short host name', () => {
    expect(defaultKeyName('Kyles-Mac-Mini.local')).toBe('PocketDev Kyles-Mac-Mini')
    expect(defaultKeyName('')).toBe('PocketDev Mac')
  })
})

describe('key import validation', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg\n-----END PRIVATE KEY-----'
  const good = { key_id: 'ABCDE12345', issuer_id: '69a6de70-0000-47e3-e053-5b8c7c11a4d1', private_key: pem }

  test('accepts a well-formed key', () => {
    expect(validateImport(good)).toBeNull()
  })

  test('rejects bad key ids, issuer ids and non-key files', () => {
    expect(validateImport({ ...good, key_id: 'abc' })).toContain('Key ID')
    expect(validateImport({ ...good, issuer_id: 'not-a-uuid' })).toContain('Issuer ID')
    expect(validateImport({ ...good, private_key: 'hello' })).toContain('.p8')
  })
})

describe('asc auth status parsing', () => {
  test('picks the default credential, then the PocketDev profile', () => {
    expect(pickCredential({ credentials: [
      { name: 'ci', keyId: 'AAAAAAAAAA', isDefault: false },
      { name: 'main', keyId: 'BBBBBBBBBB', isDefault: true },
    ] })?.name).toBe('main')
    expect(pickCredential({ credentials: [
      { name: 'ci', keyId: 'AAAAAAAAAA', isDefault: false },
      { name: 'pocketdev', keyId: 'BBBBBBBBBB', isDefault: false },
    ] })?.name).toBe('pocketdev')
    expect(pickCredential({ credentials: [] })).toBeNull()
    expect(pickCredential(null)).toBeNull()
  })
})

describe('prerequisites integration', () => {
  test('reports Xcode as misconfigured when installed but not selected', () => {
    const [xcode, asc] = appleToolChecks(status({ xcode: { ...XCODE_OK, selected: false } }))
    expect(xcode.id).toBe('xcode')
    expect(xcode.status).toBe('misconfigured')
    expect(xcode.required).toBe(false)
    expect(asc.status).toBe('installed')
    expect(asc.auth_status).toBe('authenticated')
  })

  test('asc is unauthenticated until a key is stored', () => {
    const [, asc] = appleToolChecks(status({ account: { configured: false, profile_name: null, key_id: null, validation: null, validation_error: null, web_session: false } }))
    expect(asc.auth_status).toBe('unauthenticated')
  })

  test('CLAUDE.md section appears only once asc is signed in', () => {
    expect(appleClaudeMdLines(appleToolChecks(status())).join('\n')).toContain('## App Store Connect')
    const signedOut = appleToolChecks(status({ account: { configured: false, profile_name: null, key_id: null, validation: null, validation_error: null, web_session: false } }))
    expect(appleClaudeMdLines(signedOut)).toEqual([])
  })
})
