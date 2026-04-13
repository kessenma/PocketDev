import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  name: text('name'),
  platform: text('platform'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  lastSeenAt: text('last_seen_at').default(sql`(datetime('now'))`),
  apnsToken: text('apns_token'),
  apnsTokenUpdatedAt: text('apns_token_updated_at'),
})
