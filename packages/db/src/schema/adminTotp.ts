import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const adminTotp = pgTable('admin_totp', {
  id: uuid('id').primaryKey().defaultRandom(),
  encryptedSecret: text('encrypted_secret').notNull(),
  encryptionIv: text('encryption_iv').notNull(),
  encryptionTag: text('encryption_tag').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
})
