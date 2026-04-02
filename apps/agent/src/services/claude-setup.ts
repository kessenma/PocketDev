import type { ClaudeSetupStatus } from '@pocketdev/shared/types'

/** Run a command in a login shell so PATH entries are visible */
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

export async function checkClaudeStatus(): Promise<ClaudeSetupStatus> {
  // Check if claude binary exists
  const { stdout: path, exitCode: whichExit } = await exec('which claude')
  if (whichExit !== 0 || !path) {
    return {
      installed: false,
      version: null,
      path: null,
      authenticated: false,
      auth_output: null,
    }
  }

  // Get version
  const { stdout: versionOut } = await exec('claude --version')
  const versionMatch = versionOut.match(/(\d+\.\d+[\.\d]*)/)
  const version = versionMatch ? versionMatch[1] : null

  // Check auth status
  const { stdout: authOut, exitCode: authExit } = await exec('claude auth status 2>&1')
  const authenticated = authExit === 0 && !authOut.toLowerCase().includes('not logged in')

  return {
    installed: true,
    version,
    path: path.split('\n')[0],
    authenticated,
    auth_output: authOut || null,
  }
}

export async function verifyClaudeAuth(): Promise<ClaudeSetupStatus> {
  return checkClaudeStatus()
}
