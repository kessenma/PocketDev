import { pgTable, text, uuid, boolean, timestamp, unique } from 'drizzle-orm/pg-core'

// One row per agent installation that has opted into push notifications.
// The relay_token is provisioned lazily on first user opt-in.
export const pushRelayTokens = pgTable('push_relay_tokens', {
  id: text('id').primaryKey(), // 32-byte random hex
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
})

// One row per (agent, device) pair that has registered an APNs token.
export const pushDeviceTokens = pgTable('push_device_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  relayTokenId: text('relay_token_id')
    .notNull()
    .references(() => pushRelayTokens.id, { onDelete: 'cascade' }),
  apnsToken: text('apns_token').notNull(),
  environment: text('environment').notNull(), // 'development' | 'production'
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
}, (t) => ({
  uniqueTokenPerRelay: unique().on(t.relayTokenId, t.apnsToken),
}))

// Append-only log of every push send attempt (success or failure).
export const pushNotificationLog = pgTable('push_notification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  relayTokenId: text('relay_token_id').references(() => pushRelayTokens.id),
  apnsToken: text('apns_token').notNull(),
  type: text('type').notNull(), // 'permission' | 'task_completed' | 'task_failed'
  title: text('title').notNull(),
  success: boolean('success').notNull(),
  gorushResponse: text('gorush_response'),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
})
