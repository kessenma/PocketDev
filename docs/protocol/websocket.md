# WebSocket Protocol

## Overview

PocketDev uses two WebSocket endpoints on the agent server:
- `/PocketDev/ws` — Main app WebSocket (tasks, containers, plans, setup)
- `/PocketDev/ws/terminal` — Interactive terminal sessions

Both require authentication via the `PocketDev` authorization header.

## Connection Lifecycle

### Main WebSocket (`/PocketDev/ws`)

```
Client                              Server
  │                                    │
  │  WS upgrade request                │
  │  Header: PocketDev <auth>          │
  │────────────────────────────────►   │
  │                                    │  Validate auth
  │                                    │  Register connection
  │         Connection established     │
  │◄───────────────────────────────    │
  │                                    │
  │  ping (every 30s)                  │
  │────────────────────────────────►   │
  │          pong                      │
  │◄───────────────────────────────    │
  │                                    │
  │  Commands (task.start, etc.)       │
  │────────────────────────────────►   │
  │                                    │
  │         Events (task.output, etc.) │
  │◄───────────────────────────────    │
  │                                    │
```

### Terminal WebSocket (`/PocketDev/ws/terminal`)

```
Client                              Server
  │                                    │
  │  WS upgrade request                │
  │  Header: PocketDev <auth>          │
  │────────────────────────────────►   │
  │                                    │  Validate auth
  │                                    │  Create PTY session
  │         terminal.ready             │
  │◄───────────────────────────────    │
  │         { sessionId }              │
  │                                    │
  │  terminal.input                    │
  │  { sessionId, data }               │
  │────────────────────────────────►   │
  │                                    │  Write to PTY stdin
  │                                    │
  │         terminal.output            │
  │◄───────────────────────────────    │  PTY stdout bytes
  │         { data }                   │
  │                                    │
  │  terminal.resize                   │
  │  { sessionId, cols, rows }         │
  │────────────────────────────────►   │
  │                                    │
  │         terminal.exited            │
  │◄───────────────────────────────    │  PTY process exit
  │         { exitCode }               │
  │                                    │
```

## Authentication

### Header Format

```
Authorization: PocketDev <base64-encoded-json>
```

Decoded JSON:
```json
{
  "deviceId": "a1b2c3...",
  "timestamp": 1712345678000,
  "signature": "hex-encoded-ed25519-signature"
}
```

### Validation Steps

1. Parse `PocketDev <data>` format
2. Base64 decode → JSON parse
3. Validate `|server_time - timestamp| < 30_000ms`
4. Look up device by `deviceId` in SQLite
5. Verify Ed25519 signature of timestamp string using stored public key
6. Update device `lastSeen`

### Dev Mode Bypass

When `POCKETDEV_DEV_MODE=1`, authentication is bypassed entirely.

## Message Routing (Mobile Side)

**Source**: `apps/mobile/src/stores/connection.ts`

The connection store's `handleWsMessage` function routes incoming events:

```typescript
switch (message.type) {
  case 'task.output':
    taskStore.appendLog(payload.task_id, payload.data)
  case 'task.status_changed':
    taskStore.updateTaskStatus(payload.task_id, payload.status)
  case 'container.logs.chunk':
    containerStore.appendLogChunk(payload)
  case 'container.logs.stopped':
    containerStore.handleLogsStopped(payload)
  case 'setup.prerequisites_result':
    setupStore.setState({ report })
    newTaskDraftStore.loadCapabilities()
  case 'plan.proposed':
    planStore.handlePlanProposed(payload)
  case 'plan.agent_message':
    planStore.handleAgentMessage(payload)
  case 'plan.step_updated':
    planStore.handleStepUpdated(payload)
  case 'plan.resolved':
    planStore.handlePlanResolved(payload)
}
```

## Message Broadcasting (Server Side)

The agent broadcasts events to all connected WebSocket clients. Key broadcast points:

- **Task output**: Each line from `ManagedProcess` stdout/stderr broadcasts `task.output`
- **Task status**: Status transitions broadcast `task.status_changed`
- **Container logs**: Docker log streaming broadcasts `container.logs.chunk`
- **Plan events**: Plan lifecycle changes broadcast `plan.*` events
- **Prerequisites**: Check results broadcast `setup.prerequisites_result`

## Reconnection & Stale Connection Handling

### Mobile Side (`PocketDevWebSocket`)

- Auto-reconnects up to 10 times with exponential backoff (1s, 2s, 4s, ..., 30s cap)
- `reconnectAttempts` resets to 0 on each successful `onopen`
- On `connect()`, **old raw WebSocket event handlers are detached** before creating a new one. Without this, the old WS's async `onclose` can fire after the new WS is created, nuking the new connection's timers and status
- The connection store guards status updates: only the **current** `PocketDevWebSocket` instance can update the store (stale instance callbacks are ignored)

### Server Side (stale client eviction)

- When a new WS opens for a device that already has a connection, the old entry is replaced in the `clients` map immediately
- The old WS is **closed after a 500ms delay** (via `setTimeout`). Closing synchronously inside another WS's `open` handler can interfere with the new connection in Bun/Elysia
- The `close` handler only removes a client from the map if the closing WS **is the currently registered client** (identity check via `current.ws === ws`), preventing a stale close from evicting a newer connection

### Known Pitfalls

- **Stale raw WebSocket handlers**: If `PocketDevWebSocket.connect()` creates a new raw WS without detaching the old one's handlers, the old `onclose` fires asynchronously and calls `cleanup()` + `scheduleReconnect()` on the shared instance, creating a connect/disconnect loop
- **Synchronous stale close in open handler**: Calling `existing.close()` synchronously inside the server's `open` handler can cause Bun to drop the new connection. Always defer stale closes
- **Backoff reset**: Since `reconnectAttempts` resets on each successful `onopen`, a connect/disconnect loop stays at 1s backoff forever (never backs off). The above fixes prevent the loop from starting

## Error Handling

- Invalid auth → WebSocket connection rejected (HTTP 401 before upgrade)
- Message parse failure → Silently dropped (logged server-side)
- Unknown message type → Ignored
- WebSocket close → Terminal sessions killed, connection removed from broadcast list
