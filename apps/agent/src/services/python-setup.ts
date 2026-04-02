import type { PythonSetupStatus } from '@pocketdev/shared/types'

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

export async function checkPythonStatus(): Promise<PythonSetupStatus> {
  // Check if python3 binary exists
  const { stdout: path, exitCode: whichExit } = await exec('which python3')
  if (whichExit !== 0 || !path) {
    return {
      installed: false,
      version: null,
      path: null,
      pip_installed: false,
      pip_version: null,
      pip_path: null,
      venv_available: false,
    }
  }

  // Get version
  const { stdout: versionOut } = await exec('python3 --version')
  const versionMatch = versionOut.match(/(\d+\.\d+[\.\d]*)/)
  const version = versionMatch ? versionMatch[1] : null

  // Check pip (try pip3 first, fall back to pip)
  const { stdout: pipPath, exitCode: pip3Exit } = await exec('which pip3')
  let finalPipPath: string | null = null
  let pipVersion: string | null = null

  if (pip3Exit === 0 && pipPath) {
    finalPipPath = pipPath.split('\n')[0]
    const { stdout: pipVerOut } = await exec('pip3 --version')
    const pipMatch = pipVerOut.match(/(\d+\.\d+[\.\d]*)/)
    pipVersion = pipMatch ? pipMatch[1] : null
  } else {
    const { stdout: fallbackPath, exitCode: pipExit } = await exec('which pip')
    if (pipExit === 0 && fallbackPath) {
      finalPipPath = fallbackPath.split('\n')[0]
      const { stdout: pipVerOut } = await exec('pip --version')
      const pipMatch = pipVerOut.match(/(\d+\.\d+[\.\d]*)/)
      pipVersion = pipMatch ? pipMatch[1] : null
    }
  }

  // Check venv availability
  const { exitCode: venvExit } = await exec('python3 -m venv --help 2>&1')
  const venvAvailable = venvExit === 0

  return {
    installed: true,
    version,
    path: path.split('\n')[0],
    pip_installed: !!finalPipPath,
    pip_version: pipVersion,
    pip_path: finalPipPath,
    venv_available: venvAvailable,
  }
}

export async function verifyPython(): Promise<PythonSetupStatus> {
  return checkPythonStatus()
}
