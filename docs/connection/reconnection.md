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

## Port Security & Wake Flow

**Sources**:
- Agent: `apps/agent/src/services/firewall.ts`, `apps/agent/src/services/wake-server.ts`
- Mobile: `apps/mobile/src/stores/connection.ts`, `apps/mobile/src/screens/SettingsScreen.tsx`

When port security is enabled (`POCKETDEV_FIREWALL_LOCK_ENABLED=true` or toggled from the console), the agent can block the main port at the iptables level — making the server invisible to scanners when not in use.

### Two-Port Model

```
:4387  Main agent port — blocked when locked, open when active
:4388  Wake server — always open, accepts signed POST /wake requests only
```

The wake server solves the catch-22: even when port 4387 is blocked by iptables, the mobile app can reach port 4388 to re-authenticate and unblock the main port.

### Server Lock States

```
unlocked → (manual lock or auto-lock timer fires) → locked
locked   → (mobile sends POST /wake on :4388)      → unlocked
locked   → (agent restarts)                         → unlocked (always boot unlocked)
```

### Auto-Lock

When `POCKETDEV_AUTO_LOCK_MINUTES > 0` (default: 0, disabled):
- Timer starts when the last WebSocket client disconnects
- If no new client connects within that window **and** no task is running, `lockPort()` is called
- Timer is cancelled when a new client connects
- Broadcasts `server.locked` event to any remaining clients before closing connections

### Manual Lock (Mobile)

From the Security panel in SettingsScreen:
1. Mobile calls `POST /PocketDev/api/lock/lock` (requires active WS / device auth)
2. Agent broadcasts `server.locked` event to all WS clients
3. After 200 ms, all WebSocket connections are closed
4. `lockPort()` applies iptables DROP rule on port 4387

### Wake & Reconnect Flow

When the server is locked and the mobile wants to reconnect:
1. `wakeAndConnect()` in connection store is called (e.g., via "Wake & Unlock Server" button)
2. Fetches `GET /PocketDev/api/lock/status` (unauthenticated) to discover the wake port
3. Sends `POST http://<ip>:4388/wake` with a signed `PocketDev` authorization header
4. Wake server verifies Ed25519 signature and calls `unlockPort()` (flushes the iptables chain)
5. Waits 1.5 seconds for the iptables rule to clear
6. Calls `connect()` to establish the main WebSocket

### WS Event: `server.locked`

When the server is locked while a mobile client is connected, the agent sends this event:
```json
{ "type": "server.locked", "id": "...", "payload": {}, "timestamp": 1712000000 }
```
Mobile response:
- Sets `serverLocked = true` in connection store
- Calls `ws.suppressReconnect()` — stops the reconnect loop
- SettingsScreen shows "Wake & Unlock Server" button instead of the normal lock button

### Rate Limiting on Wake Port

The wake server enforces per-IP rate limiting: 3 attempts per 60 seconds. On the 4th attempt from the same IP, the server returns `429 Too Many Requests`. The window resets after 60 seconds.

### Opt-In Default

Port security is **disabled by default** (`POCKETDEV_FIREWALL_LOCK_ENABLED=false`).
- During development, the port stays always open — no mobile interaction needed
- End users enable it from the console's Network → Port Security section
- The setting is persisted to `server_config` in SQLite, overriding the env var
- Docker containers should keep it disabled (iptables requires `NET_ADMIN` capability or `--privileged`)
