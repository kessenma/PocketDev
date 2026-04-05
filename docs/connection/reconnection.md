# Reconnection & Connection State

## WebSocket Reconnection

**Source**: `apps/mobile/src/services/websocket.ts`

### PocketDevWebSocket

The mobile app uses a custom `PocketDevWebSocket` class with automatic reconnection.

### Connection States

```
disconnected → connecting → connected
                    ↓              ↓
                  error ←──── disconnected
                    ↓
              (reconnect attempt)
                    ↓
               connecting → ...
```

### Reconnect Strategy

- **Trigger**: `onclose` or `onerror` events when `shouldReconnect === true`
- **Backoff**: Exponential — `min(1000 * 2^attempt, 30000)` ms
  - Attempt 0: 1 second
  - Attempt 1: 2 seconds
  - Attempt 2: 4 seconds
  - ...
  - Capped at 30 seconds
- **Max attempts**: 10 before giving up
- **Reset**: Attempt counter resets to 0 on successful connection

### Keepalive

- Ping interval: 30 seconds
- Sends `{ type: 'ping', id, payload: {}, timestamp }` message
- Server responds with `pong` (filtered out of message handler)
- Ping timer cleared on disconnect

### Auth Header Per Connection

Each connection attempt builds a fresh auth header:
```typescript
const authHeader = await buildPocketDevAuthorizationHeader()
// PocketDev <base64({ deviceId, timestamp, signature })>
```

The timestamp is signed with the device's Ed25519 private key. Since the server validates within a 30-second window, the auth header is fresh per connection.

## Connection Store State Machine

**Source**: `apps/mobile/src/stores/connection.ts`

### App Launch Flow

```
App mounts
  └── RootNavigator reads connection.server
      ├── null → Navigate to Connect screen
      └── exists → Navigate to Main
          └── connection.connect() called
              └── WebSocket established
                  └── On 'connected' → loadCapabilities()
```

### loadFromStorage

Called on app launch:
1. Read server from MMKV storage
2. If server exists:
   - Set `server` in state
   - Call `connect()` to establish WebSocket
3. If no server:
   - State remains `{ server: null, status: 'disconnected' }`

### Status Indicators

Connection status is shown in the app via:
- **Settings tab header**: `StatusDot` component (green/yellow/red)
- **WorkspaceNavigation sidebar**: Status dot in header (tablet)
- **SettingsScreen**: Full status display with `BauhausBadge`

| Status | Color | Meaning |
|---|---|---|
| `connected` | `#22c55e` (green) | WebSocket open, authenticated |
| `connecting` | `#facc15` (yellow) | WebSocket connecting or reconnecting |
| `disconnected` | `#ef4444` (red) | No active connection |
| `error` | `#ef4444` (red) | Connection failed |

### Disconnect Handling

When WebSocket disconnects:
1. Status changes to `'disconnected'`
2. PocketDevWebSocket auto-reconnects (up to 10 attempts)
3. Status changes to `'connecting'` during attempts
4. On success: `'connected'`, capabilities reloaded
5. On max attempts: `'disconnected'`, no further attempts

### Manual Reconnect

From SettingsScreen, user can:
- Navigate to Connect screen → tap existing server → `reconnectToExistingServer()`
- This bypasses the auto-reconnect and does a fresh connect
