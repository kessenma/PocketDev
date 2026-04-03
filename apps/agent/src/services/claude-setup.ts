import type { ClaudeSetupStatus } from '@pocketdev/shared/types'

/** Run a command in a login shell with HOME explicitly set.
 *  Sources ~/.bashrc explicitly because `bash -l` only reads ~/.profile on Linux,
 *  but many installers (including Claude Code native) write PATH entries to ~/.bashrc. */
async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const wrappedCmd = `export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"; source ~/.bashrc 2>/dev/null; ${cmd}`
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

export async function checkClaudeStatus(): Promise<ClaudeSetupStatus> {
  // Only report installed if `which claude` succeeds — meaning it's on the standard PATH
  // and usable from a normal terminal session (including the WS terminal).
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

  const claudeBin = path.split('\n')[0]

  // Get version
  const { stdout: versionOut } = await exec(`"${claudeBin}" --version`)
  const versionMatch = versionOut.match(/(\d+\.\d+[\.\d]*)/)
  const version = versionMatch ? versionMatch[1] : null

  // Check auth status
  const { stdout: authOut, exitCode: authExit } = await exec(`"${claudeBin}" auth status 2>&1`)
  const authenticated = authExit === 0 && !authOut.toLowerCase().includes('not logged in')

  return {
    installed: true,
    version,
    path: claudeBin,
    authenticated,
    auth_output: authOut || null,
  }
}

export async function verifyClaudeAuth(): Promise<ClaudeSetupStatus> {
  return checkClaudeStatus()
}
