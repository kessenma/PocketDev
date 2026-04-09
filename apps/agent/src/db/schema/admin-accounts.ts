import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const adminAccounts = sqliteTable('admin_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('pending'),
  reviewedByUserId: integer('reviewed_by_user_id'),
  reviewedAt: text('reviewed_at'),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})
