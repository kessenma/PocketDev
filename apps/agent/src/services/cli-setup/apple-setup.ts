/**
 * Apple / App Store Connect setup (macOS hosts only).
 *
 * Detects Xcode + the `asc` CLI (https://asccli.sh) and helps register an
 * App Store Connect API key so agents on this Mac can build, sign and upload
 * iOS apps without anyone opening developer.apple.com.
 *
 * Interactive steps that need secrets (sudo, Apple Account password, 2FA) run
 * in the mobile setup terminal: asc/xcodes read them from the PTY, so they
 * never pass through this process, a command line, or shell history.
 */
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { hostname } from 'node:os'
import { join } from 'node:path'
import type {
  ToolCheck,
  AppleAccountStatus,
  AppleApiKeyRole,
  AppleAscStatus,
  AppleCreateKeyCommand,
  AppleCreateKeyRequest,
  AppleImportKeyRequest,
  AppleKeyResult,
  AppleSetupCommands,
  AppleSetupStatus,
  AppleVerifyResult,
  AppleXcodeStatus,
} from '@pocketdev/shared/types'
import { IS_MACOS } from '../system/platform.ts'

const APP_STORE_XCODE_ID = '497799835'
export const ASC_PROFILE_NAME = 'pocketdev'
const ROLES: readonly AppleApiKeyRole[] = ['ADMIN', 'APP_MANAGER', 'DEVELOPER']
const APPLE_ID_RE = /^[^\s@'"`$\\]+@[^\s@'"`$\\]+\.[^\s@'"`$\\]+$/

function home(): string {
  return process.env.HOME ?? '/Users/Shared'
}

/** Where created / imported .p8 files live (asc's conventional location). */
export function ascKeysDir(): string {
  return join(home(), '.asc', 'keys')
}

/** asc writes the create result here (stdout redirect); never contains key material. */
function pendingCreateFile(): string {
  return join(ascKeysDir(), '.pocketdev-create.json')
}

function pendingAppleIdFile(): string {
  return join(ascKeysDir(), '.pocketdev-apple-id')
}

// ─── Shell helpers ──────────────────────────────────────────────────────

const SHELL_PATH = `${home()}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`

type ExecResult = { stdout: string; stderr: string; exitCode: number }
type ExecFn = (argv: string[], opts?: { timeoutMs?: number; env?: Record<string, string> }) => Promise<ExecResult>

const defaultExec: ExecFn = async (argv, opts = {}) => {
  const proc = Bun.spawn(argv, {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
    env: { ...process.env, PATH: `${SHELL_PATH}:${process.env.PATH ?? ''}`, ...opts.env },
  })
  const timer = setTimeout(() => {
    try { proc.kill('SIGKILL') } catch { /* already exited */ }
  }, opts.timeoutMs ?? 15_000)
  try {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    await proc.exited
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1 }
  } catch {
    return { stdout: '', stderr: 'spawn failed', exitCode: 127 }
  } finally {
    clearTimeout(timer)
  }
}

let exec: ExecFn = defaultExec

/** POSIX single-quote a value for the setup-terminal commands. */
export function shq(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function parseJson<T>(text: string): T | null {
  try { return JSON.parse(text) as T } catch { return null }
}

// ─── Detection ──────────────────────────────────────────────────────────

/** Beta Xcode builds end in a lowercase letter (e.g. 17A5241e); releases don't (27B52). */
export function isBetaXcodeBuild(build: string | null, appName: string): boolean {
  if (/beta/i.test(appName)) return true
  return !!build && /[a-z]$/.test(build)
}

/** Pick the Xcode to use: the selected one, else /Applications/Xcode.app, else the newest non-beta. */
export function pickXcodeApp(apps: string[], developerDir: string | null): string | null {
  if (!apps.length) return null
  const selected = developerDir ? apps.find((a) => developerDir.startsWith(`${a}/`)) : undefined
  if (selected) return selected
  if (apps.includes('/Applications/Xcode.app')) return '/Applications/Xcode.app'
  const nonBeta = apps.filter((a) => !/beta/i.test(a))
  return (nonBeta.length ? nonBeta : apps).sort().reverse()[0]
}

function listXcodeApps(): string[] {
  try {
    return readdirSync('/Applications')
      .filter((name) => /^Xcode.*\.app$/.test(name))
      .map((name) => `/Applications/${name}`)
  } catch {
    return []
  }
}

async function plistValue(path: string, key: string): Promise<string | null> {
  const { stdout, exitCode } = await exec(['plutil', '-extract', key, 'raw', path])
  return exitCode === 0 && stdout ? stdout : null
}

async function checkXcode(): Promise<AppleXcodeStatus> {
  const empty: AppleXcodeStatus = {
    installed: false, app_path: null, version: null, build: null, beta: false,
    selected: false, developer_dir: null, license_accepted: false,
    first_launch_done: false, ios_platform_installed: false,
  }
  const sel = await exec(['xcode-select', '-p'])
  const developerDir = sel.exitCode === 0 && sel.stdout ? sel.stdout : null
  const app = pickXcodeApp(listXcodeApps(), developerDir)
  if (!app) return { ...empty, developer_dir: developerDir }

  const devDir = `${app}/Contents/Developer`
  const env = { DEVELOPER_DIR: devDir }
  const [version, build, license, firstLaunch, sdks] = await Promise.all([
    plistValue(`${app}/Contents/Info.plist`, 'CFBundleShortVersionString'),
    plistValue(`${app}/Contents/version.plist`, 'ProductBuildVersion'),
    exec(['xcodebuild', '-license', 'check'], { env }),
    exec(['xcodebuild', '-checkFirstLaunchStatus'], { env }),
    exec(['xcodebuild', '-showsdks', '-json'], { env, timeoutMs: 30_000 }),
  ])
  const sdkList = parseJson<Array<{ platform?: string; canonicalName?: string }>>(sdks.stdout) ?? []
  const appName = app.split('/').pop() ?? app

  return {
    installed: true,
    app_path: app,
    version,
    build,
    beta: isBetaXcodeBuild(build, appName),
    selected: !!developerDir && developerDir.startsWith(`${app}/`),
    developer_dir: developerDir,
    license_accepted: license.exitCode === 0,
    first_launch_done: firstLaunch.exitCode === 0,
    ios_platform_installed: sdkList.some((s) => s.platform === 'iphoneos' || s.canonicalName?.startsWith('iphoneos')),
  }
}

async function findAsc(): Promise<string | null> {
  for (const candidate of [join(home(), '.local', 'bin', 'asc'), '/opt/homebrew/bin/asc', '/usr/local/bin/asc']) {
    if (existsSync(candidate)) return candidate
  }
  const { stdout, exitCode } = await exec(['/bin/sh', '-c', 'command -v asc'])
  return exitCode === 0 && stdout ? stdout.split('\n')[0] : null
}

async function checkAsc(ascPath: string | null): Promise<AppleAscStatus> {
  if (!ascPath) return { installed: false, path: null, version: null, telemetry_enabled: null }
  const [ver, telemetry] = await Promise.all([
    exec([ascPath, '--version']),
    exec([ascPath, 'telemetry', 'status']),
  ])
  const version = (ver.stdout || ver.stderr).match(/(\d+\.\d+[.\d]*)/)?.[1] ?? null
  const t = parseJson<{ enabled?: boolean }>(telemetry.stdout)
  return { installed: true, path: ascPath, version, telemetry_enabled: typeof t?.enabled === 'boolean' ? t.enabled : null }
}

interface AscAuthStatusJson {
  credentials?: Array<{ name: string; keyId: string; isDefault: boolean; validation?: string; validationError?: string }>
}

/** Pick the credential asc will use: the default profile, else the PocketDev one, else the first. */
export function pickCredential(json: AscAuthStatusJson | null) {
  const creds = json?.credentials ?? []
  return creds.find((c) => c.isDefault) ?? creds.find((c) => c.name === ASC_PROFILE_NAME) ?? creds[0] ?? null
}

async function checkAccount(ascPath: string | null, validate: boolean): Promise<AppleAccountStatus> {
  const empty: AppleAccountStatus = {
    configured: false, profile_name: null, key_id: null, validation: null, validation_error: null, web_session: false,
  }
  if (!ascPath) return empty
  const authArgs = [ascPath, 'auth', 'status', '--output', 'json', ...(validate ? ['--validate'] : [])]
  const [auth, web] = await Promise.all([
    exec(authArgs, { timeoutMs: validate ? 30_000 : 15_000 }),
    exec([ascPath, 'web', 'auth', 'status', '--output', 'json']),
  ])
  const cred = pickCredential(parseJson<AscAuthStatusJson>(auth.stdout))
  const webJson = parseJson<{ authenticated?: boolean }>(web.stdout)
  return {
    configured: !!cred,
    profile_name: cred?.name ?? null,
    key_id: cred?.keyId ?? null,
    validation: cred?.validation ?? null,
    validation_error: cred?.validationError ?? null,
    web_session: webJson?.authenticated === true,
  }
}

async function countSigningIdentities(): Promise<number> {
  const { stdout } = await exec(['security', 'find-identity', '-v', '-p', 'codesigning'])
  const match = stdout.match(/(\d+) valid identit/)
  return match ? Number(match[1]) : 0
}

export function buildCommands(xcode: AppleXcodeStatus): AppleSetupCommands {
  const app = xcode.app_path ?? '/Applications/Xcode.app'
  const devDir = `${app}/Contents/Developer`
  const finishSteps: string[] = []
  if (xcode.installed && !xcode.selected) finishSteps.push(`sudo xcode-select -s ${shq(devDir)}`)
  if (xcode.installed && !xcode.license_accepted) finishSteps.push('sudo xcodebuild -license accept')
  if (xcode.installed && !xcode.first_launch_done) finishSteps.push('sudo xcodebuild -runFirstLaunch')

  return {
    // mas needs this Mac signed in to the App Store; it reuses sudo credentials from `sudo -v`.
    install_xcode_app_store: `(command -v mas >/dev/null || brew install mas) && sudo -v && mas get ${APP_STORE_XCODE_ID}`,
    // xcodes downloads from developer.apple.com; see buildXcodesInstallCommand() for the Apple-ID variant.
    install_xcode_xcodes: buildXcodesInstallCommand(null),
    finish_xcode: finishSteps.length ? finishSteps.join(' && ') : null,
    download_ios_platform: xcode.installed && !xcode.ios_platform_installed
      ? `DEVELOPER_DIR=${shq(devDir)} xcodebuild -downloadPlatform iOS`
      : null,
    install_asc: 'curl -fsSL https://asccli.sh/install | bash',
  }
}

/**
 * Download + install the latest Xcode from developer.apple.com with xcodes.
 * The Apple Account password and 2FA code are prompted in the terminal; the
 * trailing `xcodes signout` removes the password xcodes saves to the Keychain.
 */
export function buildXcodesInstallCommand(appleId: string | null): string {
  const user = appleId && APPLE_ID_RE.test(appleId) ? `XCODES_USERNAME=${shq(appleId)} ` : ''
  return [
    '(command -v xcodes >/dev/null || brew install xcodesorg/made/xcodes)',
    '(command -v aria2c >/dev/null || brew install aria2)',
    'sudo -v',
    // No `exit` here: this runs in the user's interactive setup shell (zsh reserves $status).
    `{ ${user}xcodes install --latest --experimental-unxip --empty-trash; rc=$?; xcodes signout >/dev/null 2>&1; [ $rc -eq 0 ]; }`,
  ].join(' && ')
}

export async function getAppleSetupStatus(options: { validate?: boolean } = {}): Promise<AppleSetupStatus> {
  const xcodeEmpty: AppleXcodeStatus = {
    installed: false, app_path: null, version: null, build: null, beta: false, selected: false,
    developer_dir: null, license_accepted: false, first_launch_done: false, ios_platform_installed: false,
  }
  if (!IS_MACOS) {
    return {
      supported: false,
      xcode: xcodeEmpty,
      asc: { installed: false, path: null, version: null, telemetry_enabled: null },
      account: { configured: false, profile_name: null, key_id: null, validation: null, validation_error: null, web_session: false },
      signing_identities: 0,
      commands: buildCommands(xcodeEmpty),
      ready: false,
    }
  }

  const ascPath = await findAsc()
  const [xcode, asc, account, signing] = await Promise.all([
    checkXcode(),
    checkAsc(ascPath),
    checkAccount(ascPath, !!options.validate),
    countSigningIdentities(),
  ])
  const xcodeReady = xcode.installed && xcode.selected && xcode.license_accepted && !xcode.beta
  return {
    supported: true,
    xcode,
    asc,
    account,
    signing_identities: signing,
    commands: buildCommands(xcode),
    ready: xcodeReady && asc.installed && account.configured && account.validation !== 'failed',
  }
}

// ─── Telemetry ──────────────────────────────────────────────────────────

export async function setAscTelemetry(enabled: boolean): Promise<AppleSetupStatus> {
  const ascPath = await findAsc()
  if (ascPath) await exec([ascPath, 'telemetry', enabled ? 'enable' : 'disable'])
  return getAppleSetupStatus()
}

// ─── Create a key via the Apple Account web session ─────────────────────

export function defaultKeyName(host = hostname()): string {
  const short = host.replace(/\.local$/i, '').replace(/[^A-Za-z0-9 ._-]/g, '').slice(0, 40) || 'Mac'
  return `PocketDev ${short}`
}

/**
 * Build the terminal command that signs in to the Apple Account and creates a
 * team API key. asc prompts for the password and 2FA code on the PTY; the
 * password is not saved (ASC_WEB_DONT_STORE_PASSWORD). stdout (the JSON result:
 * key id, issuer id, .p8 path — never the key itself) goes to a file the agent
 * reads in `finishCreatedKey()`.
 */
export async function buildCreateKeyCommand(req: AppleCreateKeyRequest): Promise<AppleCreateKeyCommand | { error: string }> {
  const appleId = req.apple_id?.trim() ?? ''
  if (!APPLE_ID_RE.test(appleId)) return { error: 'Enter the email address of your Apple Account.' }
  const role: AppleApiKeyRole = req.role && ROLES.includes(req.role) ? req.role : 'ADMIN'
  const keyName = (req.key_name?.trim() || defaultKeyName()).replace(/[^A-Za-z0-9 ._()-]/g, '').slice(0, 60)
  const ascPath = await findAsc()
  if (!ascPath) return { error: 'Install the asc CLI first.' }

  const dir = ascKeysDir()
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  chmodSync(dir, 0o700)
  rmSync(pendingCreateFile(), { force: true })
  writeFileSync(pendingAppleIdFile(), appleId, { mode: 0o600 })

  const command = [
    `ASC_WEB_DONT_STORE_PASSWORD=1 ${shq(ascPath)} web api-keys create`,
    `--apple-id ${shq(appleId)}`,
    `--name ${shq(keyName)}`,
    `--role ${role}`,
    `--output-dir ${shq(dir)}`,
    `--output json > ${shq(pendingCreateFile())}`,
    `&& echo 'PocketDev: API key created.'`,
  ].join(' ')
  return { command, key_name: keyName, role }
}

interface CreateResultJson { keyId?: string; issuerId?: string; p8Path?: string; name?: string }

async function ascLogin(ascPath: string, keyId: string, issuerId: string, p8Path: string): Promise<string | null> {
  const login = await exec([
    ascPath, 'auth', 'login',
    '--name', ASC_PROFILE_NAME,
    '--key-id', keyId,
    '--issuer-id', issuerId,
    '--private-key', p8Path,
    '--network',
  ], { timeoutMs: 45_000 })
  if (login.exitCode !== 0) return (login.stderr || login.stdout || 'asc auth login failed').split('\n').slice(-3).join(' ')
  await exec([ascPath, 'auth', 'switch', '--name', ASC_PROFILE_NAME])
  return null
}

/** After the terminal command succeeds: store the key in asc (Keychain) and end the web session. */
export async function finishCreatedKey(): Promise<AppleKeyResult> {
  const ascPath = await findAsc()
  const fail = async (error: string): Promise<AppleKeyResult> => ({
    ok: false, error, key_id: null, profile_name: null, status: await getAppleSetupStatus(),
  })
  if (!ascPath) return fail('asc is not installed.')
  let raw = ''
  try { raw = readFileSync(pendingCreateFile(), 'utf-8') } catch { /* missing */ }
  const result = parseJson<CreateResultJson>(raw)
  if (!result?.keyId || !result.issuerId || !result.p8Path) {
    return fail('No new key was found. Run the sign-in step again and check the terminal output.')
  }
  try { chmodSync(result.p8Path, 0o600) } catch { /* asc already writes 0600 */ }

  const loginError = await ascLogin(ascPath, result.keyId, result.issuerId, result.p8Path)

  // The web session was only needed to create the key; don't leave it around.
  let appleId = ''
  try { appleId = readFileSync(pendingAppleIdFile(), 'utf-8').trim() } catch { /* none */ }
  await exec([ascPath, 'web', 'auth', 'logout', ...(appleId ? ['--apple-id', appleId] : ['--all'])])
  rmSync(pendingCreateFile(), { force: true })
  rmSync(pendingAppleIdFile(), { force: true })

  if (loginError) return fail(`The key was created (${result.keyId}) but asc couldn't use it: ${loginError}`)
  return { ok: true, error: null, key_id: result.keyId, profile_name: ASC_PROFILE_NAME, status: await getAppleSetupStatus() }
}

// ─── Import an existing key ─────────────────────────────────────────────

const KEY_ID_RE = /^[A-Z0-9]{10}$/
const ISSUER_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateImport(req: AppleImportKeyRequest): string | null {
  if (!KEY_ID_RE.test(req.key_id?.trim() ?? '')) return 'The Key ID is the 10-character code in the file name (AuthKey_XXXXXXXXXX.p8).'
  if (!ISSUER_RE.test(req.issuer_id?.trim() ?? '')) return 'The Issuer ID is a UUID shown above the key list in App Store Connect → Users and Access → Integrations.'
  const pem = req.private_key?.trim() ?? ''
  if (!/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/.test(pem) || pem.length > 4096) {
    return "That doesn't look like an App Store Connect .p8 key file."
  }
  return null
}

export async function importKey(req: AppleImportKeyRequest): Promise<AppleKeyResult> {
  const invalid = validateImport(req)
  const ascPath = await findAsc()
  const fail = async (error: string): Promise<AppleKeyResult> => ({
    ok: false, error, key_id: null, profile_name: null, status: await getAppleSetupStatus(),
  })
  if (invalid) return fail(invalid)
  if (!ascPath) return fail('Install the asc CLI first.')

  const keyId = req.key_id.trim()
  const dir = ascKeysDir()
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  chmodSync(dir, 0o700)
  const p8Path = join(dir, `AuthKey_${keyId}.p8`)
  writeFileSync(p8Path, `${req.private_key.trim()}\n`, { mode: 0o600 })
  chmodSync(p8Path, 0o600)

  const loginError = await ascLogin(ascPath, keyId, req.issuer_id.trim(), p8Path)
  if (loginError) {
    rmSync(p8Path, { force: true })
    return fail(`App Store Connect rejected the key: ${loginError}`)
  }
  return { ok: true, error: null, key_id: keyId, profile_name: ASC_PROFILE_NAME, status: await getAppleSetupStatus() }
}

// ─── Verify ─────────────────────────────────────────────────────────────

interface AppsListJson { data?: Array<{ id: string; attributes?: { name?: string; bundleId?: string } }> }

export async function verifyAppleSetup(): Promise<AppleVerifyResult> {
  const status = await getAppleSetupStatus({ validate: true })
  const ascPath = status.asc.path
  if (!ascPath || !status.account.configured) {
    return { ok: false, error: 'No App Store Connect key is set up yet.', apps: [], status }
  }
  const list = await exec([ascPath, 'apps', 'list', '--limit', '50', '--output', 'json'], { timeoutMs: 45_000 })
  const json = parseJson<AppsListJson>(list.stdout)
  if (list.exitCode !== 0 || !json) {
    return { ok: false, error: (list.stderr || 'Could not list apps').split('\n').slice(-2).join(' '), apps: [], status }
  }
  const apps = (json.data ?? []).map((a) => ({ id: a.id, name: a.attributes?.name ?? a.id, bundle_id: a.attributes?.bundleId ?? null }))
  return { ok: true, error: null, apps, status }
}

// ─── Prerequisites integration ──────────────────────────────────────────

/** Xcode + asc rows for the prerequisites report (macOS only; optional, never block `ready`). */
export function appleToolChecks(status: AppleSetupStatus): ToolCheck[] {
  const { xcode, asc, account } = status
  const xcodeOk = xcode.installed && xcode.selected && xcode.license_accepted && !xcode.beta
  return [
    {
      id: 'xcode',
      name: 'Xcode',
      status: xcodeOk ? 'installed' : xcode.installed ? 'misconfigured' : 'missing',
      auth_status: 'not_applicable',
      version: xcode.version,
      path: xcode.app_path,
      required: false,
      install_command: null,
      auth_command: null,
      details: {
        developer_dir: xcode.developer_dir,
        build: xcode.build,
        beta: xcode.beta ? 'true' : 'false',
        selected: xcode.selected ? 'true' : 'false',
        ios_platform: xcode.ios_platform_installed ? 'installed' : 'missing',
      },
    },
    {
      id: 'asc_cli',
      name: 'App Store Connect CLI',
      status: asc.installed ? 'installed' : 'missing',
      auth_status: !asc.installed ? 'unauthenticated' : account.configured ? 'authenticated' : 'unauthenticated',
      version: asc.version,
      path: asc.path,
      required: false,
      install_command: status.commands.install_asc,
      auth_command: null,
      details: {
        key_id: account.key_id,
        profile: account.profile_name,
        signing_identities: String(status.signing_identities),
      },
    },
  ]
}

/** Extra CLAUDE.md lines so agents know they can ship to TestFlight from this Mac. */
export function appleClaudeMdLines(tools: ToolCheck[]): string[] {
  const asc = tools.find((t) => t.id === 'asc_cli')
  const xcode = tools.find((t) => t.id === 'xcode')
  if (asc?.status !== 'installed' || asc.auth_status !== 'authenticated') return []
  return [
    '',
    '## App Store Connect',
    '',
    `\`asc\` is signed in with an App Store Connect API key (profile \`${asc.details.profile ?? ASC_PROFILE_NAME}\`, stored in the macOS Keychain).`,
    xcode?.status === 'installed'
      ? `Xcode ${xcode.version ?? ''} is selected, so you can archive, sign (automatic signing via the API key) and upload builds.`.replace('  ', ' ')
      : 'Xcode is not fully set up yet, so builds will fail until it is.',
    '- Prefer a project\'s own deploy script (e.g. `scripts/deploy.py`, fastlane lanes) when one exists.',
    '- Otherwise: `asc xcode archive` → `asc xcode export` → `asc builds upload`; run `asc <command> --help` for flags.',
    '- Ask before submitting a build for App Review or releasing it; uploading to TestFlight is fine when the task asks for it.',
  ]
}

export const __test = {
  setExec(fn: ExecFn | null) { exec = fn ?? defaultExec },
}
