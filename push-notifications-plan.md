# Push Notifications Plan — PocketDev iOS

## Context

Users run tasks via the PocketDev mobile app but may close TaskDetailScreen mid-task. Two scenarios require a background push:

1. **Permission required** — Claude/Codex hits a tool-use gate (`task.question` WS event with `type: 'permission'`) and needs the user to Allow/Deny before the agent can continue.
2. **Task finished** — Long-running task completes or fails (`task.completed` WS event).

**Key constraints**:
- PocketDev is one-to-many: one App Store app (Kyle's APNs p8 key), many independent user VPS agents.
- The p8 key must never leave Kyle's server (pocketdev.run).
- Use **Gorush** as the APNs proxy (same pattern as fajr-medflow-emr) so Apple protocol changes don't require code changes.
- Push notifications are **opt-in and off by default**. Users enable them from SettingsScreen, triggering a consent sheet first.
- Agent provisioning is **lazy** — only happens the first time a user enables notifications, not at install time.
- No APNs config in agent console UI. No install.sh changes.

---

## Architecture

```
Mobile App (iOS)
  User enables push in Settings → consent sheet → iOS permission prompt
  → APNs token acquired → sent to local agent
  → Agent lazy-provisions relay_token (first time only): POST pocketdev.run/api/push/provision
  → Agent registers device token: POST pocketdev.run/api/push/register-device

Agent (Bun, on user's VPS) ← never holds p8 key
  On task.question or task.completed:
  POST https://pocketdev.run/api/push/send
    { relay_token, apns_token, title, message, data }

pocketdev.run Relay (apps/web)
  Validates relay_token + apns_token ownership
  → POST http://gorush:8088/api/push  (Gorush internal Docker network)

Gorush (Docker, same Coolify deployment as web)
  Holds p8 key via APNS_KEY_BASE64 env var
  → APNs HTTP/2 → Apple → device

Mobile app wakes → navigates to TaskInteractionSheet (permission) or shows banner (done)
```

---

## Phase 1 — Gorush on pocketdev.run

### 1a. Docker setup

**File**: `apps/web/docker-compose.push.yml` (or extend existing web compose in Coolify)

```yaml
services:
  gorush-init:
    image: busybox
    command: sh -c 'echo "$APNS_KEY_BASE64" | base64 -d > /keys/AuthKey.p8 && chmod 644 /keys/AuthKey.p8'
    volumes: [apns-keys:/keys]
    environment: [APNS_KEY_BASE64]

  gorush:
    image: appleboy/gorush:latest
    depends_on:
      gorush-init:
        condition: service_completed_successfully
    volumes:
      - apns-keys:/keys
      - ./gorush-config.yml:/config/gorush.yml
    # port 8088 stays internal — never exposed externally

volumes:
  apns-keys:
```

**File**: `apps/web/gorush-config.yml`

```yaml
core:
  port: "8088"
  sync_mode: false

ios:
  enabled: true
  key_path: "/keys/AuthKey.p8"
  key_type: "p8"
  key_id: "${APNS_KEY_ID}"
  team_id: "${APNS_TEAM_ID}"
  production: true       # false during sandbox testing
  max_retry: 3
```

Coolify env vars: `APNS_KEY_BASE64`, `APNS_KEY_ID`, `APNS_TEAM_ID`.

---

## Phase 2 — Relay API + Admin Dashboard (apps/web)

### 2a. DB schema additions

**File**: `packages/db/src/schema/pushRelayTokens.ts`

```typescript
export const pushRelayTokens = pgTable('push_relay_tokens', {
  id: text('id').primaryKey(),               // 32-byte random hex relay_token
  createdAt: timestamp('created_at').defaultNow(),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
})

export const pushDeviceTokens = pgTable('push_device_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  relayTokenId: text('relay_token_id')
    .references(() => pushRelayTokens.id, { onDelete: 'cascade' }),
  apnsToken: text('apns_token').notNull(),
  environment: text('environment').notNull(), // 'development' | 'production'
  registeredAt: timestamp('registered_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
}, (t) => ({ unique: unique().on(t.relayTokenId, t.apnsToken) }))

export const pushNotificationLog = pgTable('push_notification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  relayTokenId: text('relay_token_id').references(() => pushRelayTokens.id),
  apnsToken: text('apns_token').notNull(),
  type: text('type').notNull(),    // 'permission' | 'task_completed' | 'task_failed'
  title: text('title').notNull(),
  success: boolean('success').notNull(),
  gorushResponse: text('gorush_response'),
  sentAt: timestamp('sent_at').defaultNow(),
})
```

Run `pnpm db:generate && pnpm db:migrate`.

### 2b. Three relay API routes

**`POST /api/push/provision`**
- No auth required (called from agent on first opt-in)
- Generates 32-byte hex relay_token, inserts into `push_relay_tokens`
- Returns `{ token }`

**`POST /api/push/register-device`**
- Body: `{ relay_token, apns_token, environment }`
- Validates relay_token exists
- Upserts into `push_device_tokens`
- Returns 200 or error

**`POST /api/push/send`**
- Body: `{ relay_token, apns_token, title, message, data }`
- Validates relay_token + apns_token ownership (403 on mismatch)
- Updates `last_used_at`
- Calls Gorush at `http://gorush:8088/api/push`:
  ```json
  { "notifications": [{ "tokens": ["<apns_token>"], "platform": 1, "topic": "run.pocketdev.mobile", "title": "...", "message": "...", "data": {...}, "sound": "default" }] }
  ```
- Logs result to `push_notification_log`
- Returns 200 or Gorush error

### 2c. Admin dashboard route

**File**: `apps/web/src/routes/admin/push.tsx` (add alongside existing admin routes)

Dashboard shows:
- Total active relay tokens (registered agents)
- Total registered devices
- Push log table: sent_at, type, title, success/fail, truncated apns_token
- Success rate over last 7 days (simple count query)
- Filter by type (permission / task_completed / task_failed)

Use existing shadcn/ui Card, Badge, Table components.

---

## Phase 3 — Agent: Lazy Provisioning + Push Send

### 3a. Store relay_token in server config

**File**: `apps/agent/src/db/schema/server-config.ts`

Add `push_relay_token TEXT` field. At startup, read from SQLite (not env var — provisioned lazily on first opt-in, not at install time).

### 3b. Add apns_token to devices table

**File**: `apps/agent/src/db/schema/devices.ts`

```sql
apns_token TEXT,
apns_token_updated_at TEXT
```

Create migration: `apps/agent/src/db/migrations/NNN_add_apns_token.sql`

### 3c. REST endpoint to receive APNs token from mobile

```
POST /PocketDev/api/devices/:id/push-token
Auth: PocketDev-Authorization header
Body: { pushToken: string, environment: "development" | "production" }
```

Handler logic:
1. Updates `devices.apns_token` in SQLite
2. **Lazy provision**: check if `server_config.push_relay_token` is set; if not, call `pocketdev.run/api/push/provision` and store the returned token
3. Calls `pocketdev.run/api/push/register-device` with `{ relay_token, apns_token, environment }`

**File**: `apps/agent/src/routes/devices.ts` (create or extend)

Also add:

```
DELETE /PocketDev/api/devices/:id/push-token
```

To let the mobile app deregister when the user disables notifications.

### 3d. Push relay client

**File**: `apps/agent/src/services/push/relay-push.ts`

```typescript
export async function sendPush(opts: {
  apnsToken: string
  title: string
  message: string
  data: Record<string, string>
}): Promise<void>
// Reads relay_token from server config
// POST https://pocketdev.run/api/push/send
// Fire-and-forget — log failures, never throw, never block task flow
```

### 3e. Hook into task event broadcast points

**File**: `apps/agent/src/services/tasks/managed-agent-process.ts`

**Trigger 1 — Permission required** (near `registerQuestion` / `broadcastPermissionRequest`, ~line 769-776):

After `broadcast(makeMessage('task.question', ...))`:
1. Skip push if device has an active WebSocket connection (they're watching live)
2. Look up `devices.apns_token` from SQLite
3. If present, call `sendPush({ apnsToken, title: "Permission Required", message: "Task needs your approval to continue", data: { type: "permission", taskId, questionId } })`

**Trigger 2 — Task completed** (~line 798):

After existing `task.completed` broadcast, always attempt push:
- completed: title `"Task Complete"`, message = first 80 chars of task prompt
- failed: title `"Task Failed"`, message = first 80 chars of task prompt + " failed"
- data: `{ type: "task_completed", taskId, status }`

APNs payload includes `"content-available": 1` on the permission push for background wake.

---

## Phase 4 — Mobile: Opt-In Settings Flow

### 4a. PushNotificationsSection component

**File**: `apps/mobile/src/components/settings/PushNotificationsSection.tsx` (new)

Follows the `OnDeviceAISection.tsx` pattern. Uses `BauhausPanel` (accentColor: `accentGreen` or `accentBlue`).

Content:
- Status row: "Push Notifications" label + `BauhausBadge` ("Enabled" / "Disabled")
- Toggle button: "Enable Notifications" / "Disable Notifications"
- When enabling → show `PushConsentSheet` first
- When disabling → clear local pref + call `DELETE /PocketDev/api/devices/:id/push-token`

State: persisted in MMKV (`push_notifications_enabled: boolean`), default `false`.

### 4b. PushConsentSheet

**File**: `apps/mobile/src/components/settings/PushConsentSheet.tsx` (new)

Bottom sheet (use existing modal/sheet pattern in the codebase) with:

**Title**: "Enable Push Notifications"

**Body**:
> Push notifications allow PocketDev to alert you when a task needs your approval or completes — even when the app is closed.
>
> **What's shared with PocketDev servers:**
> - A push token assigned by Apple to identify your device for notification delivery
> - Whether notifications were sent successfully
>
> PocketDev servers (pocketdev.run) act as a relay between your agent and Apple's notification service. Your agent's content (task output, files, code) is never sent to PocketDev servers.
>
> You can disable notifications at any time from Settings.

**Buttons**: "Enable" (primary) | "Cancel" (quiet)

On "Enable":
1. Close sheet
2. Call `PushNotificationIOS.requestPermissions({ alert: true, badge: true, sound: true })`
3. If granted → call `getApnsToken()` (poll until available, ~5s timeout) → `registerPushToken()`
4. Set `push_notifications_enabled = true` in MMKV
5. Update section status badge

### 4c. Add section to SettingsScreen

**File**: `apps/mobile/src/screens/SettingsScreen.tsx`

Import and add `<PushNotificationsSection />` between the Security and Server Health sections (or at bottom of list — wherever feels natural given the current layout).

### 4d. iOS native setup

**Entitlements** — `apps/mobile/ios/Mobile/Mobile.entitlements` (new):
```xml
<plist version="1.0"><dict>
  <key>aps-environment</key>
  <string>development</string>
</dict></plist>
```

Wire in Xcode: Target → Signing & Capabilities → + → Push Notifications. Change to `production` for TestFlight/App Store.

**AppDelegate.swift** — add APNs registration + token storage to `UserDefaults["apnsToken"]` (see Phase 5b in previous section). Only calls `registerForRemoteNotifications()` after user grants permission (called from JS side via permission request).

**PushTokenModule.swift** + **PushTokenModule.m** — native module exposing `getToken()` promise to JS.

**`apps/mobile/src/services/push-token.ts`** — JS wrapper.

### 4e. Handle incoming pushes

**File**: `apps/mobile/src/main.tsx` (or new `apps/mobile/src/services/notifications.ts`):

```typescript
import { PushNotificationIOS } from 'react-native'

PushNotificationIOS.addEventListener('notification', (n) => {
  const data = n.getData() as { type: string; taskId: string }
  if (data.type === 'permission') navigationRef.navigate('TaskDetail', { taskId: data.taskId })
  n.finish(PushNotificationIOS.FetchResult.NoData)
})

PushNotificationIOS.getInitialNotification().then((n) => {
  if (!n) return
  const data = n.getData() as { type: string; taskId: string }
  if (data.type === 'permission' || data.type === 'task_completed')
    navigationRef.navigate('TaskDetail', { taskId: data.taskId })
})
```

### 4f. Connection store: re-register token on reconnect

**File**: `apps/mobile/src/stores/connection.ts`

On `status → connected`: if `push_notifications_enabled === true` in MMKV, call `getApnsToken()` → `registerPushToken()`. APNs tokens can rotate after iOS updates.

---

## Apple Developer Setup (One-Time, Kyle)

1. Apple Developer → Keys → "+" → APNs → Download `.p8`
2. Enable Push Notifications on App ID `run.pocketdev.mobile`
3. Get the **new push notification key from Apple Connect** (you noted this is needed)
4. `base64 -i AuthKey_XXXXXXXX.p8 | tr -d '\n'` → set as `APNS_KEY_BASE64` in Coolify
5. Set `APNS_KEY_ID` (10-char ID from filename) and `APNS_TEAM_ID` in Coolify
6. One p8 key per Apple Developer team; no annual renewal

---

## Phase 5 — Agent Console: Per-Node Push Notification Tracking

Each agent server logs its own push attempts locally in SQLite. The DiagnosticsPanel gains a "push" tab so the server admin can see what notifications were sent from their node.

### 5a. Local push log table in agent SQLite

**File**: `apps/agent/src/db/schema/push-log.ts` (new)

```typescript
export const pushLog = sqliteTable('push_log', {
  id: text('id').primaryKey(),            // uuid
  deviceId: text('device_id'),            // which device was targeted
  type: text('type').notNull(),           // 'permission' | 'task_completed' | 'task_failed'
  taskId: text('task_id'),
  title: text('title').notNull(),
  success: integer('success', { mode: 'boolean' }).notNull(),
  relayStatusCode: integer('relay_status_code'),
  sentAt: text('sent_at').notNull(),      // ISO string
})
```

Create migration: `apps/agent/src/db/migrations/NNN_add_push_log.sql`

`relay-push.ts` writes a row here after each `sendPush()` call (success or failure).

### 5b. Debug endpoint

**File**: `apps/agent/src/routes/debug.ts` (add alongside existing debug routes)

```
GET /PocketDev/api/console/debug/push
Auth: session cookie (console admin)
```

Returns:
```typescript
{
  relayToken: string | null,              // masked: first 8 chars + "..."
  registeredDevices: number,             // count of devices with apns_token
  log: Array<{
    id, deviceId, type, taskId, title, success, relayStatusCode, sentAt
  }>  // last 100 entries, newest first
}
```

### 5c. DiagnosticsPanel tab

**File**: `apps/agent/console/src/components/diagnostics/PushDiagnosticsTab.tsx` (new)

Follows the pattern of `TasksDiagnosticsTab.tsx`. Shows:
- Status row: relay registered (yes/no based on whether `relayToken` is non-null), registered device count
- Log table: sent_at, type badge (permission/completed/failed), title, device ID (truncated), success/fail badge, HTTP status code
- Color coding: green = success, red = failure

**File**: `apps/agent/console/src/components/DiagnosticsPanel.tsx` (modify)

- Add `'push'` to the `DiagnosticsTab` union type
- Add state: `const [pushDebug, setPushDebug] = useState<PushDebugInfo | null>(null)`
- Add `fetchPushDebug()` to the `Promise.allSettled` refresh array
- Add "push" button in the tab buttons row
- Add `activeTab === 'push'` render case → `<PushDiagnosticsTab data={pushDebug} />`

**File**: `apps/agent/console/src/lib/api.ts` (modify)

Add `fetchPushDebug()` function + `PushDebugInfo` type matching the endpoint response.

---

## Phase 6 — Docs (apps/docs)

### 6a. New push notifications doc page

**File**: `apps/docs/src/routes/docs/push-notifications.tsx` (new)

TanStack Router file-based route. Documents:
- How push notifications work in PocketDev (relay architecture, privacy model)
- How to enable from the mobile Settings screen
- What triggers a push (permission gates, task completion)
- Privacy disclosure (what data touches pocketdev.run servers)
- Troubleshooting (iOS permission denied, physical device required, sandbox vs production)

### 6b. Update root docs/ files

**File**: `docs/` (project-level, not apps/docs)

Add `docs/notifications/push-notifications.md` covering:
- Architecture diagram (relay flow)
- Agent-side implementation notes (relay_token lifecycle, sendPush() contract)
- Mobile-side implementation notes (consent flow, token rotation)
- Apple Developer setup steps

---

## Files To Create / Modify

| File | Action | Purpose |
|---|---|---|
| `apps/web/gorush-config.yml` | Create | Gorush APNs config |
| `apps/web/docker-compose.push.yml` | Create | Gorush + init container |
| `packages/db/src/schema/pushRelayTokens.ts` | Create | Relay tokens, device tokens, send log tables |
| `apps/web/src/routes/api/push/provision.ts` | Create | `POST /api/push/provision` |
| `apps/web/src/routes/api/push/register-device.ts` | Create | `POST /api/push/register-device` |
| `apps/web/src/routes/api/push/send.ts` | Create | `POST /api/push/send` → Gorush |
| `apps/web/src/routes/admin/push.tsx` | Create | Admin dashboard (log, stats) |
| `apps/agent/src/db/schema/devices.ts` | Modify | Add `apns_token`, `apns_token_updated_at` |
| `apps/agent/src/db/migrations/NNN_add_apns_token.sql` | Create | Migration |
| `apps/agent/src/routes/devices.ts` | Create/Modify | `POST/DELETE /devices/:id/push-token` |
| `apps/agent/src/services/push/relay-push.ts` | Create | Relay HTTP client |
| `apps/agent/src/services/tasks/managed-agent-process.ts` | Modify | Trigger pushes on question + completion |
| `apps/agent/src/db/schema/server-config.ts` | Modify | Add `push_relay_token` field |
| `apps/mobile/ios/Mobile/Mobile.entitlements` | Create | `aps-environment` entitlement |
| `apps/mobile/ios/Mobile/AppDelegate.swift` | Modify | APNs registration + token storage |
| `apps/mobile/ios/Mobile/PushTokenModule.swift` | Create | Native token module |
| `apps/mobile/ios/Mobile/PushTokenModule.m` | Create | RCT_EXTERN_MODULE bridge |
| `apps/mobile/src/services/push-token.ts` | Create | JS wrapper |
| `apps/mobile/src/services/api.ts` | Modify | `registerPushToken()` |
| `apps/mobile/src/stores/connection.ts` | Modify | Re-register token on reconnect |
| `apps/mobile/src/components/settings/PushNotificationsSection.tsx` | Create | Settings UI section |
| `apps/mobile/src/components/settings/PushConsentSheet.tsx` | Create | Opt-in consent bottom sheet |
| `apps/mobile/src/screens/SettingsScreen.tsx` | Modify | Add PushNotificationsSection |
| `apps/mobile/src/main.tsx` | Modify | PushNotificationIOS listeners |
| `apps/agent/src/db/schema/push-log.ts` | Create | Local push attempt log table |
| `apps/agent/src/db/migrations/NNN_add_push_log.sql` | Create | Migration |
| `apps/agent/src/routes/debug.ts` | Modify | Add `GET /debug/push` endpoint |
| `apps/agent/console/src/components/diagnostics/PushDiagnosticsTab.tsx` | Create | Agent console push log tab |
| `apps/agent/console/src/components/DiagnosticsPanel.tsx` | Modify | Add 'push' tab |
| `apps/agent/console/src/lib/api.ts` | Modify | Add `fetchPushDebug()` |
| `apps/docs/src/routes/docs/push-notifications.tsx` | Create | User-facing docs page |
| `docs/notifications/push-notifications.md` | Create | Internal architecture docs |

---

## Verification

1. Deploy Gorush on Coolify alongside web app; set APNs env vars
2. Build iOS app on a **physical device** (simulator can't receive pushes)
3. Open Settings → push section shows "Disabled" by default
4. Tap "Enable" → consent sheet appears with full disclosure
5. Agree → iOS permission prompt → accept → token registered (check relay DB)
6. Pair with a test agent; start a Claude task that hits a permission gate → minimize app → verify push arrives and tapping opens TaskDetailScreen
7. Start a long task → minimize → verify completion push arrives
8. Tap "Disable" in settings → verify token removed, no more pushes
9. Check admin dashboard on pocketdev.run for push log entries
10. Open agent console DiagnosticsPanel → "push" tab → verify log entries appear for each push attempt
11. Test with Gorush `production: false` (sandbox APNs) first → flip to `production: true` for TestFlight
