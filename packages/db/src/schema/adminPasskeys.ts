import { pgTable, uuid, text, bigint, timestamp } from 'drizzle-orm/pg-core'

export const adminPasskeys = pgTable('admin_passkeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: bigint('counter', { mode: 'number' }).notNull().default(0),
  deviceName: text('device_name').notNull(),
  transports: text('transports').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
})
