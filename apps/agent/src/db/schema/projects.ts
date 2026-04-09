import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  absolutePath: text('absolute_path').notNull().unique(),
  remoteUrl: text('remote_url'),
  owner: text('owner'),
  source: text('source').notNull().default('local'),
  defaultBranch: text('default_branch'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  lastUsedAt: text('last_used_at'),
  lastSyncedSha: text('last_synced_sha'),
})
