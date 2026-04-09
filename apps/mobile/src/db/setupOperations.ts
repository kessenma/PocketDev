import type { DB } from '@op-engineering/op-sqlite'
import type { PrerequisitesReport } from '@pocketdev/shared/types'

type SetupSnapshotRow = {
  device_id: string
  report_json: string
  updated_at: string
}

export async function upsertCachedSetupReport(
  db: DB,
  deviceId: string,
  report: PrerequisitesReport,
): Promise<void> {
  await db.execute(
    `INSERT OR REPLACE INTO setup_snapshots (device_id, report_json, updated_at)
     VALUES (?, ?, ?)`,
    [deviceId, JSON.stringify(report), new Date().toISOString()],
  )
}

export async function getCachedSetupReport(
  db: DB,
  deviceId: string,
): Promise<PrerequisitesReport | null> {
  const result = await db.execute(
    'SELECT report_json FROM setup_snapshots WHERE device_id = ? LIMIT 1',
    [deviceId],
  )
  const row = result.rows?.[0] as Pick<SetupSnapshotRow, 'report_json'> | undefined
  if (!row?.report_json) return null

  try {
    return JSON.parse(row.report_json) as PrerequisitesReport
  } catch {
    return null
  }
}

export async function deleteCachedSetupReport(db: DB, deviceId: string): Promise<void> {
  await db.execute('DELETE FROM setup_snapshots WHERE device_id = ?', [deviceId])
}
