import type { DockerSetupStatus } from '@pocketdev/shared/types'

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

export async function checkDockerStatus(): Promise<DockerSetupStatus> {
  const { stdout: path, exitCode: whichExit } = await exec('which docker')

  if (whichExit !== 0 || !path) {
    return {
      installed: false,
      version: null,
      path: null,
      daemon_running: false,
      has_compose: false,
      compose_version: null,
      user_in_docker_group: false,
    }
  }

  const dockerPath = path.split('\n')[0] ?? null

  // Get version
  const { stdout: versionOut } = await exec('docker --version')
  const versionMatch = versionOut.match(/(\d+\.\d+[\.\d]*)/)
  const version = versionMatch ? versionMatch[1]! : null

  // Check daemon — if docker info succeeds, daemon is running AND user has permission
  const { exitCode: infoExit } = await exec('docker info 2>&1')
  const daemonRunning = infoExit === 0
  const userInDockerGroup = infoExit === 0 // If it works without sudo, user is in docker group

  // If docker info failed, check if it's a permission issue (daemon running but user not in group)
  let daemonActuallyRunning = daemonRunning
  if (!daemonRunning) {
    // Check if daemon is running via systemctl (doesn't require docker group)
    const { exitCode: systemctlExit } = await exec('systemctl is-active docker 2>/dev/null')
    if (systemctlExit === 0) {
      daemonActuallyRunning = true
    }
  }

  // Check compose
  const { stdout: composeOut, exitCode: composeExit } = await exec('docker compose version 2>/dev/null')
  const hasCompose = composeExit === 0
  const composeMatch = composeOut.match(/(\d+\.\d+[\.\d]*)/)
  const composeVersion = composeMatch ? composeMatch[1]! : null

  return {
    installed: true,
    version,
    path: dockerPath,
    daemon_running: daemonActuallyRunning,
    has_compose: hasCompose,
    compose_version: composeVersion,
    user_in_docker_group: userInDockerGroup,
  }
}

export async function verifyDocker(): Promise<DockerSetupStatus> {
  return checkDockerStatus()
}
