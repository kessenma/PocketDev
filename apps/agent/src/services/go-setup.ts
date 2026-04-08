import type { GoSetupStatus } from '@pocketdev/shared/types'

/** Run a command in a login shell */
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

export async function checkGoStatus(): Promise<GoSetupStatus> {
  // Check go binary
  const { stdout: goPath, exitCode: goWhich } = await exec('which go')
  const hasGo = goWhich === 0 && !!goPath

  if (!hasGo) {
    return {
      installed: false,
      version: null,
      path: null,
      gopath: null,
      goroot: null,
    }
  }

  // Get version: "go version go1.22.0 linux/amd64" → "1.22.0"
  const { stdout: versionOut } = await exec('go version')
  const versionMatch = versionOut.match(/go(\d+\.\d+[\.\d]*)/)
  const version = versionMatch ? versionMatch[1] : null

  // Get GOPATH and GOROOT
  const { stdout: gopath } = await exec('go env GOPATH')
  const { stdout: goroot } = await exec('go env GOROOT')

  return {
    installed: true,
    version,
    path: goPath.split('\n')[0],
    gopath: gopath || null,
    goroot: goroot || null,
  }
}

export async function verifyGo(): Promise<GoSetupStatus> {
  return checkGoStatus()
}
