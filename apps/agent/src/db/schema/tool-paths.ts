import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const toolPaths = sqliteTable('tool_paths', {
  toolId: text('tool_id').primaryKey(),
  path: text('path').notNull(),
  version: text('version'),
  installed: integer('installed').default(1),
  authenticated: integer('authenticated').default(0),
  detectedAt: text('detected_at').default(sql`(datetime('now'))`),
  manuallySet: integer('manually_set').default(0),
})
