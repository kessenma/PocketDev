import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { devices } from './devices.ts'

export const deviceOfflineSnapshots = sqliteTable(
  'device_offline_snapshots',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    projectId: text('project_id').notNull(),
    branch: text('branch').notNull(),
    fileCount: integer('file_count').notNull().default(0),
    totalBytes: integer('total_bytes').notNull().default(0),
    downloadedAt: text('downloaded_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex('device_offline_snapshots_device_project_branch').on(table.deviceId, table.projectId, table.branch)],
)
