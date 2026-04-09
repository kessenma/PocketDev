# WebSocket Connection Loop Bug — Hypothesis & Debug Plan

## Symptom

The mobile app's WebSocket enters a connect/disconnect loop:

```
[20:06:51.509Z] connected
[20:06:51.519Z] disconnected    ← 10ms later!
[20:06:52.536Z] connecting      ← 1s reconnect (backoff resets each time onopen fires)
[20:06:52.913Z] connected
[20:06:52.941Z] disconnected    ← 28ms later
... repeats forever
```

- Connection **succeeds** (server accepts upgrade, `onopen` fires, status='connected')
- 10-30ms later, `onclose` fires (status='disconnected')
- `reconnectAttempts` resets to 0 on each successful open, so backoff stays at 1s forever

## Hypothesis 1: Server stale-client race condition (MOST LIKELY)

**Location:** `apps/agent/src/services/ws.ts` — `open` handler (lines 57-68) and `close` handler (lines 259-270)

When a new WebSocket connects, the server's `open` handler:
1. Finds existing client for same deviceId → calls `existing.close()`
2. Registers new client: `clients.set(deviceId, { send, close })`

**The race:** If the old connection's `close` handler fires **after** step 2:
```
close(ws_old) → clients.delete(deviceId)  // ← deletes the NEW client entry!
```

Now the new WebSocket is alive but orphaned from the clients map. Elysia/Bun may garbage-collect it, or it simply receives no messages and eventually the framework closes it.

**What to look for in server logs:**
- `Device connected: X` immediately followed by `Device disconnected: X`
- The disconnect log should show `clientsHas=true` — meaning it's deleting an entry that belongs to a different WS instance

**Potential fix:** In the `close` handler, verify the client in the map is actually the one that's closing before deleting:
```typescript
close(ws) {
  const deviceId = (ws as any)._deviceId
  if (deviceId) {
    const current = clients.get(deviceId)
    // Only delete if this WS is still the registered client
    if (current && current === wsClientRef) {
      clients.delete(deviceId)
    }
  }
}
```

## Hypothesis 2: Double `connect()` on app startup / hot reload

**Location:** `apps/mobile/App.tsx` line 24 + `apps/mobile/src/stores/connection.ts` lines 41-69

`loadFromStorage()` calls `connect()`. If a hot reload re-mounts the component tree (the dev server compilation logs appear at the exact same timestamp as the first disconnect), `connect()` runs again:

1. Gets the in-progress WS as `existingWs`
2. Calls `existingWs.disconnect()` → sets shouldReconnect=false, closes raw WS, fires `onStatusChange('disconnected')` synchronously
3. Creates new WS, stores it, starts connecting
4. But the old raw WS's `onclose` fires asynchronously → calls the OLD `onStatusChange('disconnected')` closure → overwrites the store status

Both old and new PocketDevWebSocket instances share the same `set({ status })` via their closures. The old instance's async `onclose` can set status to 'disconnected' even after the new instance has connected.

**What to look for in mobile logs:**
- `[connection] connect() existingWs=true` appearing twice in quick succession
- Multiple `[connection] WebSocket status: disconnected` entries from different WS instances

**Potential fix:** Guard the status callback so stale instances can't update the store:
```typescript
const wsId = Date.now()
const ws = new PocketDevWebSocket(url, (status) => {
  // Only update if this WS is still the current one
  if (get().ws === ws) {
    set({ status })
  }
})
```

## Hypothesis 3: Bun/Elysia WS idle timeout (UNLIKELY)

No explicit `idleTimeout` is configured on the `.ws()` call. Bun's default is 120s which shouldn't matter, but Elysia might override this. Worth checking `bun --version` and Elysia version for known WS bugs.

## Debug Logging Added

### Server side (`apps/agent/src/services/ws.ts`)

Added console.logs and a ring buffer of connection events:
- `[ws] beforeHandle` — logs auth result
- `[ws] open` — logs deviceId, whether stale client existed
- `[ws] close` — logs deviceId, whether entry was still in clients map
- Ring buffer: last 50 events exposed via `getWsDebugInfo()` → viewable in console Network diagnostics tab

### Mobile side (`apps/mobile/src/stores/connection.ts`)

- `connect()` now logs whether existingWs was present
- Helps detect double-invocation

## How to diagnose

1. **Start the agent** and watch server logs
2. **Connect mobile app** and look for the pattern:
   - If you see `[ws] close: deviceId=X, clientsHas=true` right after `[ws] open: deviceId=X, staleClient=true` → **Hypothesis 1 confirmed**
   - If you see two `[ws] open` events in quick succession with same deviceId → **Hypothesis 2 confirmed**
   - If you see no server-side close at all → the close is happening at the network/TLS layer
3. **Check the Network diagnostics tab** in the console — it shows a live event log of all WS connect/disconnect events with timestamps
