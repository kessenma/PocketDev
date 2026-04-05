import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const passkeyCredentials = sqliteTable('passkey_credentials', {
  id: text('id').primaryKey(),
  adminId: integer('admin_id').notNull(),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  credentialDeviceType: text('credential_device_type'),
  credentialBackedUp: integer('credential_backed_up').default(0),
  transports: text('transports'), // JSON array string
  deviceName: text('device_name'),
  aaguid: text('aaguid'),
  isActive: integer('is_active').notNull().default(1),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
})
