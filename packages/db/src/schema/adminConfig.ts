import { pgTable, uuid, boolean, timestamp } from 'drizzle-orm/pg-core'

export const adminConfig = pgTable('admin_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  requireSecureLogin: boolean('require_secure_login').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
