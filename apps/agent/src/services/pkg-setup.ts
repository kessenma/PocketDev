import type { PkgManagerStatus, PkgToolInfo } from '@pocketdev/shared/types'

/** Run a command in a login shell so PATH entries (nvm, pnpm, bun) are visible */
async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bash', '-lc', cmd], {
    stdout: 'pipe',
    stderr: 'pipe',
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

async function checkBinary(binary: string): Promise<PkgToolInfo> {
  const { stdout: path, exitCode: whichExit } = await exec(`which ${binary}`)
  if (whichExit !== 0 || !path) {
    return { installed: false, version: null, path: null }
  }

  const { stdout: versionOut } = await exec(`${binary} --version`)
  const versionMatch = versionOut.match(/(\d+\.\d+[\.\d]*)/)

  return {
    installed: true,
    version: versionMatch ? versionMatch[1] : null,
    path: path.split('\n')[0],
  }
}

async function checkNvm(): Promise<{ installed: boolean; version: string | null }> {
  const { exitCode: dirExists } = await exec('test -d "$HOME/.nvm"')
  if (dirExists !== 0) {
    return { installed: false, version: null }
  }

  const { stdout: versionOut, exitCode } = await exec('nvm --version')
  if (exitCode !== 0) {
    return { installed: true, version: null }
  }

  const versionMatch = versionOut.match(/(\d+\.\d+[\.\d]*)/)
  return { installed: true, version: versionMatch ? versionMatch[1] : null }
}

export async function checkPkgManagerStatus(): Promise<PkgManagerStatus> {
  const [nvm, npm, pnpm, bun] = await Promise.all([
    checkNvm(),
    checkBinary('npm'),
    checkBinary('pnpm'),
    checkBinary('bun'),
  ])

  return { nvm, npm, pnpm, bun }
}

export async function verifyPkgManagers(): Promise<PkgManagerStatus> {
  return checkPkgManagerStatus()
}
