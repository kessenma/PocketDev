const {
  upsertCachedSetupReport,
  getCachedSetupReport,
  deleteCachedSetupReport,
} = require('./setupOperations')

describe('setupOperations', () => {
  const report = {
    os: 'darwin',
    arch: 'arm64',
    ready: true,
    databases: [],
    tools: [
      {
        id: 'git',
        name: 'Git',
        status: 'installed',
        auth_status: 'authenticated',
        version: '2.0.0',
        path: '/usr/bin/git',
        required: true,
        install_command: null,
        auth_command: null,
        details: {},
      },
    ],
  }

  it('stores a setup snapshot keyed by device id', async () => {
    const db = { execute: jest.fn().mockResolvedValue({ rows: [] }) }

    await upsertCachedSetupReport(db, 'device-1', report)

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO setup_snapshots'),
      ['device-1', JSON.stringify(report), expect.any(String)],
    )
  })

  it('loads and parses a cached snapshot', async () => {
    const db = {
      execute: jest.fn().mockResolvedValue({
        rows: [{ report_json: JSON.stringify(report) }],
      }),
    }

    await expect(getCachedSetupReport(db, 'device-1')).resolves.toEqual(report)
  })

  it('returns null for invalid cached JSON', async () => {
    const db = {
      execute: jest.fn().mockResolvedValue({
        rows: [{ report_json: '{bad json' }],
      }),
    }

    await expect(getCachedSetupReport(db, 'device-1')).resolves.toBeNull()
  })

  it('deletes a cached snapshot for a device', async () => {
    const db = { execute: jest.fn().mockResolvedValue({ rows: [] }) }

    await deleteCachedSetupReport(db, 'device-1')

    expect(db.execute).toHaveBeenCalledWith(
      'DELETE FROM setup_snapshots WHERE device_id = ?',
      ['device-1'],
    )
  })
})
