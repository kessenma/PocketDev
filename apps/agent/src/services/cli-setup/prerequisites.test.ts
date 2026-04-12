import { describe, expect, test } from 'bun:test'
import type { PrerequisitesReport } from '@pocketdev/shared/types'
import { __test } from './prerequisites.ts'

function makeReport(os: string): PrerequisitesReport {
  return {
    os,
    arch: 'x64',
    tools: [],
    databases: [],
    ready: true,
  }
}

describe('prerequisites helpers', () => {
  test('runChecksWithLimit caps concurrency and preserves result order', async () => {
    let active = 0
    let maxActive = 0

    const checks = ['git', 'node', 'npm', 'claude', 'codex'].map((toolId, index) => async () => {
      active += 1
      maxActive = Math.max(maxActive, active)

      await Bun.sleep(15 + (index % 2) * 5)

      active -= 1
      return toolId
    })

    const result = await __test.runChecksWithLimit(checks, 2)

    expect(result).toEqual(['git', 'node', 'npm', 'claude', 'codex'])
    expect(maxActive).toBe(2)
    expect(active).toBe(0)
  })

  test('createCachedAsyncValue shares in-flight work and refreshes after ttl', async () => {
    let now = 1_000
    let buildCount = 0
    const pending: Array<(value: PrerequisitesReport) => void> = []
    const reports = [makeReport('first'), makeReport('second')]

    const cachedValue = __test.createCachedAsyncValue(
      () => new Promise<PrerequisitesReport>((resolve) => {
        buildCount += 1
        pending.push(resolve)
      }),
      50,
      () => now,
    )

    const firstPromise = cachedValue.get()
    const secondPromise = cachedValue.get()

    expect(buildCount).toBe(1)
    expect(pending).toHaveLength(1)

    pending.shift()?.(reports[0])

    const [first, second] = await Promise.all([firstPromise, secondPromise])
    expect(first).toBe(reports[0])
    expect(second).toBe(reports[0])

    const cached = await cachedValue.get()
    expect(cached).toBe(reports[0])
    expect(buildCount).toBe(1)

    now += 51

    const refreshedPromise = cachedValue.get()
    expect(buildCount).toBe(2)
    expect(pending).toHaveLength(1)

    pending.shift()?.(reports[1])

    await expect(refreshedPromise).resolves.toBe(reports[1])
  })
})
