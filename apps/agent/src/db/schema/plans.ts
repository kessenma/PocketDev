import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { tasks } from './tasks.ts'

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  title: text('title').notNull(),
  description: text('description'),
  agentName: text('agent_name'),
  status: text('status').default('pending'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  resolvedAt: text('resolved_at'),
})

export const planSteps = sqliteTable('plan_steps', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => plans.id),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  filePath: text('file_path'),
  completed: integer('completed').default(0),
  sortOrder: integer('sort_order').default(0),
})

export const planQuestions = sqliteTable('plan_questions', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => plans.id),
  question: text('question').notNull(),
  answer: text('answer'),
  required: integer('required').default(0),
})

export const planMessages = sqliteTable('plan_messages', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => plans.id),
  role: text('role').notNull(),
  text: text('text').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})
