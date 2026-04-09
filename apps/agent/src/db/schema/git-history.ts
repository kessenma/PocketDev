import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { projects } from './projects.ts'
import { tasks } from './tasks.ts'

export const gitCommits = sqliteTable('git_commits', {
  id: text('id').primaryKey(), // "{projectId}:{sha}"
  projectId: text('project_id').notNull().references(() => projects.id),
  sha: text('sha').notNull(),
  shortSha: text('short_sha').notNull(),
  message: text('message').notNull(),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email'),
  committedAt: text('committed_at').notNull(),
  branch: text('branch'),
  additions: integer('additions').default(0),
  deletions: integer('deletions').default(0),
  filesChanged: integer('files_changed').default(0),
  origin: text('origin').default('external'), // 'app' | 'task' | 'external'
  syncedAt: text('synced_at').default(sql`(datetime('now'))`),
})

export const gitCommitFiles = sqliteTable('git_commit_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commitId: text('commit_id').notNull().references(() => gitCommits.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  oldPath: text('old_path'),
  kind: text('kind').notNull(), // added | modified | deleted | renamed
  additions: integer('additions').default(0),
  deletions: integer('deletions').default(0),
})

export const taskCommits = sqliteTable('task_commits', {
  taskId: text('task_id').notNull().references(() => tasks.id),
  commitId: text('commit_id').notNull().references(() => gitCommits.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.commitId] }),
])
