import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  prompt: text('prompt').notNull(),
  agentType: text('agent_type').default('claude'),
  status: text('status').default('pending'),
  workingDirectory: text('working_directory'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  exitCode: integer('exit_code'),
})

export const taskLogs = sqliteTable('task_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id').notNull().references(() => tasks.id),
  stream: text('stream').notNull(),
  line: text('line').notNull(),
  timestamp: text('timestamp').default(sql`(datetime('now'))`),
})
