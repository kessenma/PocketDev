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
  // Check for python binaries in order of preference: python3.13, python3, python
  const { stdout: path13, exitCode: which13 } = await exec('which python3.13')
  const { stdout: path3, exitCode: which3 } = await exec('which python3')
  const { stdout: pathPy, exitCode: whichPy } = await exec('which python')

  const hasPython13 = which13 === 0 && !!path13
  const hasPython3 = which3 === 0 && !!path3
  const hasPython = whichPy === 0 && !!pathPy

  const pythonBin = hasPython13 ? 'python3.13' : hasPython3 ? 'python3' : hasPython ? 'python' : null
  const pythonPath = hasPython13 ? path13.split('\n')[0] : hasPython3 ? path3.split('\n')[0] : hasPython ? pathPy.split('\n')[0] : null

  if (!pythonBin) {
    // Check if deadsnakes PPA is already added
    const { exitCode: ppaCheck } = await exec('grep -r "deadsnakes" /etc/apt/sources.list.d/ 2>/dev/null')
    return {
      installed: false,
      version: null,
      path: null,
      binary: null,
      pip_installed: false,
      pip_version: null,
      pip_path: null,
      venv_available: false,
      ppa_added: ppaCheck === 0,
    }
  }

  // Get version
  const { stdout: versionOut } = await exec(`${pythonBin} --version`)
  const versionMatch = versionOut.match(/(\d+\.\d+[\.\d]*)/)
  const version = versionMatch ? versionMatch[1] : null

  // Check pip — try detected binary -m pip first, then pip3, then pip
  let pipPath: string | null = null
  let pipVersion: string | null = null

  const { stdout: pipModOut, exitCode: pipModExit } = await exec(`${pythonBin} -m pip --version 2>&1`)
  if (pipModExit === 0 && pipModOut) {
    pipPath = pythonPath // pip accessible via the python binary
    const pipMatch = pipModOut.match(/pip (\d+\.\d+[\.\d]*)/)
    pipVersion = pipMatch ? pipMatch[1] : null
  } else {
    const { stdout: pip3Path, exitCode: pip3Exit } = await exec('which pip3')
    if (pip3Exit === 0 && pip3Path) {
      pipPath = pip3Path.split('\n')[0]
      const { stdout: pipVerOut } = await exec('pip3 --version')
      const pipMatch = pipVerOut.match(/pip (\d+\.\d+[\.\d]*)/)
      pipVersion = pipMatch ? pipMatch[1] : null
    }
  }

  // Check venv availability
  const { exitCode: venvExit } = await exec(`${pythonBin} -m venv --help 2>&1`)
  const venvAvailable = venvExit === 0

  // Check if deadsnakes PPA is added
  const { exitCode: ppaCheck } = await exec('grep -r "deadsnakes" /etc/apt/sources.list.d/ 2>/dev/null')

  return {
    installed: true,
    version,
    path: pythonPath,
    binary: pythonBin,
    pip_installed: !!pipPath,
    pip_version: pipVersion,
    pip_path: pipPath,
    venv_available: venvAvailable,
    ppa_added: ppaCheck === 0,
  }
}

export async function verifyPython(): Promise<PythonSetupStatus> {
  return checkPythonStatus()
}
