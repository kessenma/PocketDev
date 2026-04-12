import type { RustSetupStatus } from '@pocketdev/shared/types'

/** Run a command in a login shell, also sourcing cargo env if it exists */
async function exec(cmd: string, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const wrappedCmd = `[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"; ${cmd}`
  const proc = Bun.spawn(['bash', '-lc', wrappedCmd], {
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

export async function checkRustStatus(): Promise<RustSetupStatus> {
  // Check rustc
  const { stdout: rustcPath, exitCode: rustcWhich } = await exec('which rustc')
  const hasRustc = rustcWhich === 0 && !!rustcPath

  if (!hasRustc) {
    // Check if rustup exists even without rustc (partial install)
    const { stdout: rustupPath, exitCode: rustupWhich } = await exec('which rustup')
    return {
      installed: false,
      version: null,
      path: null,
      cargo_installed: false,
      cargo_version: null,
      cargo_path: null,
      rustup_installed: rustupWhich === 0 && !!rustupPath,
      rustup_version: null,
    }
  }

  // Get rustc version
  const { stdout: rustcVersionOut } = await exec('rustc --version')
  const rustcVersionMatch = rustcVersionOut.match(/rustc (\d+\.\d+[\.\d]*)/)
  const version = rustcVersionMatch ? rustcVersionMatch[1] : null

  // Check cargo
  const { stdout: cargoPath, exitCode: cargoWhich } = await exec('which cargo')
  const hasCargo = cargoWhich === 0 && !!cargoPath
  let cargoVersion: string | null = null

  if (hasCargo) {
    const { stdout: cargoVersionOut } = await exec('cargo --version')
    const cargoMatch = cargoVersionOut.match(/cargo (\d+\.\d+[\.\d]*)/)
    cargoVersion = cargoMatch ? cargoMatch[1] : null
  }

  // Check rustup
  const { stdout: rustupPath, exitCode: rustupWhich } = await exec('which rustup')
  const hasRustup = rustupWhich === 0 && !!rustupPath
  let rustupVersion: string | null = null

  if (hasRustup) {
    const { stdout: rustupVersionOut } = await exec('rustup --version 2>&1')
    const rustupMatch = rustupVersionOut.match(/rustup (\d+\.\d+[\.\d]*)/)
    rustupVersion = rustupMatch ? rustupMatch[1] : null
  }

  return {
    installed: true,
    version,
    path: rustcPath.split('\n')[0],
    cargo_installed: hasCargo,
    cargo_version: cargoVersion,
    cargo_path: hasCargo ? cargoPath.split('\n')[0] : null,
    rustup_installed: hasRustup,
    rustup_version: rustupVersion,
  }
}

export async function verifyRust(): Promise<RustSetupStatus> {
  return checkRustStatus()
}
