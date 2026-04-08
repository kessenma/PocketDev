import type { TypeScriptSetupStatus } from '@pocketdev/shared/types'

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

export async function checkTypeScriptStatus(): Promise<TypeScriptSetupStatus> {
  // Check tsc binary
  const { stdout: tscPath, exitCode: tscWhich } = await exec('which tsc')
  const hasTsc = tscWhich === 0 && !!tscPath

  if (!hasTsc) {
    return {
      installed: false,
      version: null,
      path: null,
      ts_node_installed: false,
      ts_node_version: null,
    }
  }

  // Get version: "Version 5.4.5" → "5.4.5"
  const { stdout: versionOut } = await exec('tsc --version')
  const versionMatch = versionOut.match(/Version\s+(\d+\.\d+[\.\d]*)/)
  const version = versionMatch ? versionMatch[1] : null

  // Check ts-node
  const { stdout: tsNodePath, exitCode: tsNodeWhich } = await exec('which ts-node')
  const hasTsNode = tsNodeWhich === 0 && !!tsNodePath
  let tsNodeVersion: string | null = null
  if (hasTsNode) {
    const { stdout: tsNodeVersionOut } = await exec('ts-node --version')
    const tsNodeMatch = tsNodeVersionOut.match(/v?(\d+\.\d+[\.\d]*)/)
    tsNodeVersion = tsNodeMatch ? tsNodeMatch[1] : null
  }

  return {
    installed: true,
    version,
    path: tscPath.split('\n')[0],
    ts_node_installed: hasTsNode,
    ts_node_version: tsNodeVersion,
  }
}

export async function verifyTypeScript(): Promise<TypeScriptSetupStatus> {
  return checkTypeScriptStatus()
}
