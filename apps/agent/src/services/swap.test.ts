import { describe, expect, test } from 'bun:test'
import { __test } from './swap.ts'

describe('swap helpers', () => {
  test('parses /proc/swaps entries into byte counts', () => {
    const entries = __test.parseSwapEntries([
      'Filename\t\t\t\tType\t\tSize\t\tUsed\t\tPriority',
      '/swapfile                               file\t\t2097148\t\t0\t\t-2',
      '/dev/zram0                              partition\t\t524284\t\t1024\t\t100',
    ].join('\n'))

    expect(entries).toEqual([
      {
        path: '/swapfile',
        type: 'file',
        sizeBytes: 2147479552,
        usedBytes: 0,
        priority: -2,
      },
      {
        path: '/dev/zram0',
        type: 'partition',
        sizeBytes: 536866816,
        usedBytes: 1048576,
        priority: 100,
      },
    ])
  })

  test('parses swap totals from /proc/meminfo', () => {
    const totals = __test.parseMemInfo([
      'MemTotal:       3984584 kB',
      'MemFree:         509220 kB',
      'SwapTotal:      2097148 kB',
      'SwapFree:       1572864 kB',
    ].join('\n'))

    expect(totals).toEqual({
      totalBytes: 2147479552,
      freeBytes: 1610612736,
      usedBytes: 536866816,
    })
  })

  test('returns null when swappiness is not numeric', () => {
    expect(__test.parseSwappiness('10\n')).toBe(10)
    expect(__test.parseSwappiness('abc')).toBeNull()
  })

  test('parses df output for root filesystem capacity', () => {
    expect(__test.parseDfOutput([
      'Filesystem     1024-blocks     Used Available Capacity Mounted on',
      '/dev/vda1         4000000  1000000   3000000      25% /',
    ].join('\n'))).toEqual({
      path: '/',
      totalBytes: 4096000000,
      usedBytes: 1024000000,
      availableBytes: 3072000000,
    })
  })

  test('parses du output for app footprint', () => {
    expect(__test.parseDuOutput('204800\t/opt/pocketdev\n', '/opt/pocketdev')).toEqual({
      path: '/opt/pocketdev',
      footprintBytes: 209715200,
    })
  })

  test('calculates suggested swap sizes from available storage', () => {
    expect(__test.getSwapRecommendations({
      path: '/',
      totalBytes: 128 * 1024 * 1024 * 1024,
      usedBytes: 48 * 1024 * 1024 * 1024,
      availableBytes: 80 * 1024 * 1024 * 1024,
    })).toEqual({
      suggestedGb: [6, 10, 13],
      recommendedGb: 10,
      maxRecommendedGb: 32,
      maxCustomGb: 79,
      customWarning: 'Custom sizes above 32 GB are allowed up to 79 GB, but they leave less free disk for the server and workspace data.',
    })
  })

  test('falls back to warning-only mode when storage is too tight for a recommendation', () => {
    expect(__test.getSwapRecommendations({
      path: '/',
      totalBytes: 20 * 1024 * 1024 * 1024,
      usedBytes: 15 * 1024 * 1024 * 1024,
      availableBytes: 5 * 1024 * 1024 * 1024,
    })).toEqual({
      suggestedGb: [1],
      recommendedGb: 1,
      maxRecommendedGb: 1,
      maxCustomGb: 4,
      customWarning: 'Custom sizes above 1 GB are allowed up to 4 GB, but they leave less free disk for the server and workspace data.',
    })
  })
})
