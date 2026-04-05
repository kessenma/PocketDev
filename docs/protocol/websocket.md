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

## Error Handling

- Invalid auth → WebSocket connection rejected (HTTP 401 before upgrade)
- Message parse failure → Silently dropped (logged server-side)
- Unknown message type → Ignored
- WebSocket close → Terminal sessions killed, connection removed from broadcast list
