import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { PkgInstallResult, PkgInstallTool, PkgManagerStatus, PkgToolInfo } from '@pocketdev/shared/types'

const DEFAULT_TIMEOUT_MS = 15_000
const INSTALL_TIMEOUT_MS = 5 * 60_000
const OUTPUT_TAIL_LIMIT = 8_000

export interface ShellExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export type ShellExec = (cmd: string, timeoutMs?: number) => Promise<ShellExecResult>

function getHomeDir() {
  return process.env.HOME ?? process.env.USERPROFILE ?? '/root'
}

function getShell() {
  return process.env.SHELL ?? '/bin/bash'
}

function buildShellCommand(cmd: string): string {
  return `
export HOME="${getHomeDir()}"
export SHELL="${getShell()}"
export NVM_DIR="$HOME/.nvm"
export PNPM_HOME="$HOME/.local/share/pnpm"
export BUN_INSTALL="$HOME/.bun"

if [ -s "$HOME/.profile" ]; then . "$HOME/.profile"; fi
if [ -s "$HOME/.bash_profile" ]; then . "$HOME/.bash_profile"; fi
if [ -s "$HOME/.bashrc" ]; then . "$HOME/.bashrc"; fi
if [ -s "$NVM_DIR/nvm.sh" ]; then . "$NVM_DIR/nvm.sh"; fi

export PATH="$HOME/.bun/bin:$PNPM_HOME:$PATH"

${cmd}
`.trim()
}

export async function execShell(cmd: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ShellExecResult> {
  const proc = Bun.spawn(['bash', '-lc', buildShellCommand(cmd)], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, HOME: getHomeDir(), SHELL: getShell() },
  })

  const timer = setTimeout(() => proc.kill(), timeoutMs)
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited
  clearTimeout(timer)

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode: proc.exitCode ?? 1,
  }
}

function capOutput(output: string): string {
  if (output.length <= OUTPUT_TAIL_LIMIT) return output
  return output.slice(-OUTPUT_TAIL_LIMIT)
}

function combineOutput(result: ShellExecResult): string {
  return capOutput([result.stdout, result.stderr].filter(Boolean).join('\n').trim())
}

async function readVersion(
  command: string,
  parse: RegExp = /(\d+\.\d+(?:\.\d+)*)/,
  exec: ShellExec = execShell,
): Promise<string | null> {
  const result = await exec(command)
  if (result.exitCode !== 0) return null

  const combined = [result.stdout, result.stderr].filter(Boolean).join('\n')
  const match = combined.match(parse)
  return match ? match[1] : combined.trim() || null
}

async function checkBinary(
  binary: string,
  exec: ShellExec = execShell,
  versionCommand?: string,
): Promise<PkgToolInfo> {
  const locate = await exec(`command -v ${binary}`)
  if (locate.exitCode !== 0 || !locate.stdout.trim()) {
    return { installed: false, version: null, path: null }
  }

  const version = await readVersion(versionCommand ?? `${binary} --version`, undefined, exec)
  return {
    installed: true,
    version,
    path: locate.stdout.trim().split('\n')[0] ?? null,
  }
}

export async function checkNvm(exec: ShellExec = execShell): Promise<{ installed: boolean; version: string | null }> {
  const nvmDir = join(getHomeDir(), '.nvm')
  if (!existsSync(nvmDir)) {
    return { installed: false, version: null }
  }

  const version = await readVersion('nvm --version', undefined, exec)
  return { installed: true, version }
}

export async function checkNode(exec: ShellExec = execShell): Promise<PkgToolInfo> {
  return checkBinary('node', exec, 'node --version')
}

export async function checkNpm(exec: ShellExec = execShell): Promise<PkgToolInfo> {
  return checkBinary('npm', exec, 'npm --version')
}

export async function checkPnpm(exec: ShellExec = execShell): Promise<PkgToolInfo> {
  return checkBinary('pnpm', exec, 'pnpm --version')
}

export async function checkBun(exec: ShellExec = execShell): Promise<PkgToolInfo> {
  return checkBinary('bun', exec, 'bun --version')
}

export async function checkPkgManagerStatus(exec: ShellExec = execShell): Promise<PkgManagerStatus> {
  const [nvm, npm, pnpm, bun] = await Promise.all([
    checkNvm(exec),
    checkNpm(exec),
    checkPnpm(exec),
    checkBun(exec),
  ])

  return { nvm, npm, pnpm, bun }
}

export async function verifyPkgManagers(exec: ShellExec = execShell): Promise<PkgManagerStatus> {
  return checkPkgManagerStatus(exec)
}

async function runInstall(
  tool: PkgInstallTool,
  command: string,
  exec: ShellExec = execShell,
): Promise<PkgInstallResult> {
  const result = await exec(command, INSTALL_TIMEOUT_MS)
  const status = await checkPkgManagerStatus(exec)
  const output = combineOutput(result)

  return {
    tool,
    success: result.exitCode === 0,
    error: result.exitCode === 0 ? null : output || `${tool} install failed`,
    output,
    status,
  }
}

export async function installNvm(exec: ShellExec = execShell): Promise<PkgInstallResult> {
  return runInstall(
    'nvm',
    'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash',
    exec,
  )
}

export async function installNodeAndNpm(exec: ShellExec = execShell): Promise<PkgInstallResult> {
  return runInstall(
    'npm',
    'nvm install --lts && nvm alias default "lts/*"',
    exec,
  )
}

export async function installPnpm(exec: ShellExec = execShell): Promise<PkgInstallResult> {
  return runInstall(
    'pnpm',
    'curl -fsSL https://get.pnpm.io/install.sh | sh -',
    exec,
  )
}

export async function installBun(exec: ShellExec = execShell): Promise<PkgInstallResult> {
  return runInstall(
    'bun',
    'curl -fsSL https://bun.sh/install | bash',
    exec,
  )
}

export async function installPkgTool(
  tool: PkgInstallTool,
  exec: ShellExec = execShell,
): Promise<PkgInstallResult> {
  switch (tool) {
    case 'nvm':
      return installNvm(exec)
    case 'npm':
      return installNodeAndNpm(exec)
    case 'pnpm':
      return installPnpm(exec)
    case 'bun':
      return installBun(exec)
  }
}
