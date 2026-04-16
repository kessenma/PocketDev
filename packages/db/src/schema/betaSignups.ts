import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

export const betaSignups = pgTable('beta_signups', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
