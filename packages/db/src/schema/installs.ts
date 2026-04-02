import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const installs = pgTable('installs', {
  id: serial('id').primaryKey(),
  ip_address: varchar('ip_address', { length: 45 }).notNull(),
  user_agent: text('user_agent'),
  script_version: varchar('script_version', { length: 20 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
})
