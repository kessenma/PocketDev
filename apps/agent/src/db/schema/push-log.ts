import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const pushLog = sqliteTable('push_log', {
  id: text('id').primaryKey(),
  deviceId: text('device_id'),
  type: text('type').notNull(), // 'permission' | 'task_completed' | 'task_failed'
  taskId: text('task_id'),
  title: text('title').notNull(),
  success: integer('success', { mode: 'boolean' }).notNull(),
  relayStatusCode: integer('relay_status_code'),
  sentAt: text('sent_at').notNull().default(sql`(datetime('now'))`),
})
