import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ShellExec, ShellExecResult } from './pkg-setup.ts'
import { checkBun, checkNode, checkNvm, checkPnpm, installPkgTool } from './pkg-setup.ts'

function createExecMock(handlers: Record<string, ShellExecResult>): ShellExec {
  return async (cmd: string) => handlers[cmd] ?? { stdout: '', stderr: '', exitCode: 1 }
}

describe('pkg-setup', () => {
  const originalHome = process.env.HOME
  let tempHome = ''

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'pkg-setup-test-'))
    process.env.HOME = tempHome
  })

  afterEach(() => {
    process.env.HOME = originalHome
    rmSync(tempHome, { recursive: true, force: true })
  })

  test('detects nvm from sourced shell setup', async () => {
    mkdirSync(join(tempHome, '.nvm'), { recursive: true })

    const result = await checkNvm(createExecMock({
      'nvm --version': { stdout: '0.40.3', stderr: '', exitCode: 0 },
    }))

    expect(result).toEqual({ installed: true, version: '0.40.3' })
  })

  test('detects node, pnpm, and bun in home-managed paths', async () => {
    const exec = createExecMock({
      'command -v node': { stdout: join(tempHome, '.nvm/versions/node/v22.0.0/bin/node'), stderr: '', exitCode: 0 },
      'node --version': { stdout: 'v22.0.0', stderr: '', exitCode: 0 },
      'command -v pnpm': { stdout: join(tempHome, '.local/share/pnpm/pnpm'), stderr: '', exitCode: 0 },
      'pnpm --version': { stdout: '9.12.1', stderr: '', exitCode: 0 },
      'command -v bun': { stdout: join(tempHome, '.bun/bin/bun'), stderr: '', exitCode: 0 },
      'bun --version': { stdout: '1.2.3', stderr: '', exitCode: 0 },
    })

    await expect(checkNode(exec)).resolves.toEqual({
      installed: true,
      version: '22.0.0',
      path: join(tempHome, '.nvm/versions/node/v22.0.0/bin/node'),
    })
    await expect(checkPnpm(exec)).resolves.toEqual({
      installed: true,
      version: '9.12.1',
      path: join(tempHome, '.local/share/pnpm/pnpm'),
    })
    await expect(checkBun(exec)).resolves.toEqual({
      installed: true,
      version: '1.2.3',
      path: join(tempHome, '.bun/bin/bun'),
    })
  })

  test('returns updated status and output on successful tool install', async () => {
    const exec = createExecMock({
      'sudo npm install -g pnpm': { stdout: 'pnpm installed', stderr: '', exitCode: 0 },
      'command -v npm': { stdout: '', stderr: '', exitCode: 1 },
      'command -v pnpm': { stdout: '/usr/local/bin/pnpm', stderr: '', exitCode: 0 },
      'pnpm --version': { stdout: '9.15.0', stderr: '', exitCode: 0 },
      'command -v bun': { stdout: '', stderr: '', exitCode: 1 },
    })

    const result = await installPkgTool('pnpm', exec)

    expect(result.success).toBe(true)
    expect(result.output).toContain('pnpm installed')
    expect(result.status.pnpm).toEqual({
      installed: true,
      version: '9.15.0',
      path: '/usr/local/bin/pnpm',
    })
  })

  test('returns error details when installation fails', async () => {
    const exec = createExecMock({
      'sudo npm install -g bun': { stdout: '', stderr: 'network failed', exitCode: 1 },
      'command -v npm': { stdout: '', stderr: '', exitCode: 1 },
      'command -v pnpm': { stdout: '', stderr: '', exitCode: 1 },
      'command -v bun': { stdout: '', stderr: '', exitCode: 1 },
    })

    const result = await installPkgTool('bun', exec)

    expect(result.success).toBe(false)
    expect(result.error).toContain('network failed')
    expect(result.status.bun.installed).toBe(false)
  })
})
