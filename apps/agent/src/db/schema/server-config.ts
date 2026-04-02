import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const serverConfig = sqliteTable('server_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
