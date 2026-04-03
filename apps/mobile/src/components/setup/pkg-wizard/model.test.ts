import type { PkgManagerStatus } from '@pocketdev/shared/types'
import { buildInstallPlan, getNextInstallIndex } from './model'

declare const describe: (name: string, test: () => void) => void
declare const it: (name: string, test: () => void) => void
declare const expect: (value: unknown) => {
  toContain: (expected: unknown) => void
  toBe: (expected: unknown) => void
}

function createStatus(overrides?: Partial<PkgManagerStatus>): PkgManagerStatus {
  return {
    nvm: { installed: true, version: '0.40.3' },
    npm: { installed: true, version: '10.9.0', path: '/usr/bin/npm' },
    pnpm: { installed: true, version: '9.15.0', path: '/usr/bin/pnpm' },
    bun: { installed: true, version: '1.2.5', path: '/usr/bin/bun' },
    ...overrides,
  }
}

describe('pkg wizard model', () => {
  it('includes bun in the install plan when it is missing', () => {
    const plan = buildInstallPlan(createStatus({
      bun: { installed: false, version: null, path: null },
    }))

    expect(plan.map((item) => item.id)).toContain('bun')
  })

  it('retries from the first tool that is not completed', () => {
    expect(getNextInstallIndex([
      { id: 'pnpm', status: 'done' },
      { id: 'bun', status: 'failed' },
    ])).toBe(1)
  })
})
