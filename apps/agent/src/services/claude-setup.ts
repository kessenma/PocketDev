import type { ClaudeSetupStatus } from '@pocketdev/shared/types'

/** Run a command in a login shell with HOME explicitly set.
 *  Sources ~/.bashrc explicitly because `bash -l` only reads ~/.profile on Linux,
 *  but many installers (including Claude Code native) write PATH entries to ~/.bashrc. */
async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root'
  const wrappedCmd = `source ~/.bashrc 2>/dev/null; ${cmd}`
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

// Common paths where claude might be installed but not yet in PATH
const CLAUDE_PATHS = [
  '~/.claude/local/bin/claude',
  '~/.claude/bin/claude',
  '~/.local/bin/claude',
  '/usr/local/bin/claude',
  '~/.nvm/versions/node/*/bin/claude',
]

export async function checkClaudeStatus(): Promise<ClaudeSetupStatus> {
  // Check if claude binary exists via PATH
  let { stdout: path, exitCode: whichExit } = await exec('which claude')

  // If not in PATH, check common install locations
  if (whichExit !== 0 || !path) {
    const home = process.env.HOME ?? '/root'
    const expandedPaths = CLAUDE_PATHS.map((p) => p.replace('~', home))
    const { stdout: foundPath } = await exec(
      `for p in ${expandedPaths.join(' ')}; do [ -x "$p" ] && echo "$p" && break; done`,
    )
    if (foundPath) {
      path = foundPath
      whichExit = 0
    }
  }

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

  // Get version (use full path in case it's not in PATH)
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
