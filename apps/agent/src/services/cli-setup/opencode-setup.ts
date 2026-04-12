import { deleteToolRecord, upsertToolPath } from '../../db/index.ts'
import type { OpenCodeInstallResult, OpenCodeSetupStatus } from '@pocketdev/shared/types'

const OPENCODE_INSTALL_COMMAND = 'curl -fsSL https://opencode.ai/install | bash'
const PATH_PREFIX = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/opt/homebrew/bin'
const CANDIDATE_PATHS = [
  `${process.env.HOME ?? process.env.USERPROFILE ?? '/root'}/.opencode/bin/opencode`,
  `${process.env.HOME ?? process.env.USERPROFILE ?? '/root'}/.local/bin/opencode`,
  '/root/.opencode/bin/opencode',
  '/root/.local/bin/opencode',
  '/home/ubuntu/.opencode/bin/opencode',
  '/home/ubuntu/.local/bin/opencode',
  '/home/linuxbrew/.linuxbrew/bin/opencode',
  '/usr/local/bin/opencode',
  '/opt/homebrew/bin/opencode',
]
const VERIFY_OUTPUT_MAX = 1200

export function getOpenCodeInstallCommand(): string {
  return OPENCODE_INSTALL_COMMAND
}

async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const wrappedCmd = `export PATH="${PATH_PREFIX}:$HOME/.opencode/bin:$HOME/.local/bin:$PATH"; source ~/.bashrc 2>/dev/null; source ~/.profile 2>/dev/null; ${cmd}`
  const proc = Bun.spawn(['bash', '-lc', wrappedCmd], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, HOME: home },
  })

  const timer = setTimeout(() => proc.kill(), timeoutMs)
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited
  clearTimeout(timer)

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1 }
}

async function which(binary: string): Promise<string | null> {
  const { stdout, exitCode } = await exec(`which ${binary}`)
  return exitCode === 0 && stdout ? stdout.split('\n')[0] : null
}

async function pathExists(path: string): Promise<boolean> {
  const { exitCode } = await exec(`test -x '${path.replace(/'/g, `'\\''`)}'`)
  return exitCode === 0
}

async function scanForOpenCodeBinary(): Promise<string | null> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const { stdout, exitCode } = await exec(
    `find '${home.replace(/'/g, `'\\''`)}' /root /home \\( -path '*/.opencode/bin/opencode' -o -path '*/.local/bin/opencode' \\) -type f -perm -111 2>/dev/null | head -n 1`,
    20_000,
  )

  if (exitCode !== 0 || !stdout) return null
  return stdout.split('\n').map((line) => line.trim()).find(Boolean) ?? null
}

async function findOpenCodeBinary(): Promise<string | null> {
  const fromPath = await which('opencode')
  if (fromPath) return fromPath

  for (const candidate of CANDIDATE_PATHS) {
    if (await pathExists(candidate)) return candidate
  }

  const scanned = await scanForOpenCodeBinary()
  if (scanned) return scanned

  return null
}

function parseVersion(output: string): string | null {
  const line = output.split('\n').find(Boolean) ?? ''
  const match = line.match(/(\d+\.\d+[\.\d-]*)/)
  return match?.[1] ?? null
}

function trimOutput(output: string | null): string | null {
  if (!output) return null
  const trimmed = output.trim()
  if (!trimmed) return null
  return trimmed.length > VERIFY_OUTPUT_MAX ? `${trimmed.slice(0, VERIFY_OUTPUT_MAX)}...` : trimmed
}

function syncPersistedOpenCodeStatus(status: OpenCodeSetupStatus) {
  if (status.installed && status.path) {
    upsertToolPath('opencode_cli', status.path, status.version)
  } else {
    deleteToolRecord('opencode_cli')
  }
}

export async function checkOpenCodeStatus(): Promise<OpenCodeSetupStatus> {
  const path = await findOpenCodeBinary()
  if (!path) {
    const status = {
      installed: false,
      version: null,
      path: null,
      verified: false,
      verify_output: null,
    } satisfies OpenCodeSetupStatus
    syncPersistedOpenCodeStatus(status)
    return status
  }

  const { stdout: versionOut, stderr: versionErr } = await exec(`${path} --version`)
  const version = parseVersion([versionOut, versionErr].filter(Boolean).join('\n'))

  const verify = await exec(`${path} run --help`)
  const verifyOutput = trimOutput([verify.stdout, verify.stderr].filter(Boolean).join('\n'))
  const status = {
    installed: true,
    version,
    path,
    verified: verify.exitCode === 0,
    verify_output: verifyOutput,
  } satisfies OpenCodeSetupStatus

  syncPersistedOpenCodeStatus(status)
  return status
}

export async function installOpenCode(): Promise<OpenCodeInstallResult> {
  const result = await exec(OPENCODE_INSTALL_COMMAND, 240_000)
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim() || null

  if (result.exitCode !== 0) {
    return {
      success: false,
      installed: false,
      version: null,
      path: null,
      output,
      error: output ?? 'Failed to install OpenCode CLI.',
    }
  }

  const status = await checkOpenCodeStatus()
  return {
    success: status.installed,
    installed: status.installed,
    version: status.version,
    path: status.path,
    output,
    error: status.installed ? null : 'OpenCode install completed but the binary was not detected.',
  }
}

export async function verifyOpenCode(): Promise<OpenCodeSetupStatus> {
  return checkOpenCodeStatus()
}

export const __test = {
  parseVersion,
  trimOutput,
}
