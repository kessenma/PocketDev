import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const envVars = sqliteTable(
  'env_vars',
  {
    id: text('id').primaryKey(),
    projectPath: text('project_path').notNull(),
    key: text('key').notNull(),
    value: text('value'),
    comment: text('comment'),
    isSecret: integer('is_secret').default(0),
    isMultiline: integer('is_multiline').default(0),
    order: integer('order').default(0),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('env_vars_project_key_unique').on(table.projectPath, table.key),
  ],
)
