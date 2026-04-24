import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

export const betaSignups = pgTable('beta_signups', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  jobResponsibility: varchar('job_responsibility', { length: 100 }).notNull(),
  jobResponsibilityOther: varchar('job_responsibility_other', { length: 255 }),
  useType: varchar('use_type', { length: 50 }).notNull(),
  employer: varchar('employer', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
