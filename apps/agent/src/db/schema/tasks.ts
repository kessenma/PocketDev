import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  prompt: text('prompt').notNull(),
  agentType: text('agent_type').default('claude'),
  mode: text('mode').default('default'),
  model: text('model'),
  status: text('status').default('pending'),
  projectId: text('project_id'),
  projectName: text('project_name'),
  workingDirectory: text('working_directory'),
  sessionId: text('session_id'),
  turnCount: integer('turn_count').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  exitCode: integer('exit_code'),
})

export const taskTurns = sqliteTable('task_turns', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  turnNumber: integer('turn_number').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const taskFileTouches = sqliteTable('task_file_touches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id').notNull().references(() => tasks.id),
  filePath: text('file_path').notNull(),
  action: text('action').notNull(),
  turnNumber: integer('turn_number').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const taskLogs = sqliteTable('task_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: text('task_id').notNull().references(() => tasks.id),
  stream: text('stream').notNull(),
  line: text('line').notNull(),
  timestamp: text('timestamp').default(sql`(datetime('now'))`),
})
