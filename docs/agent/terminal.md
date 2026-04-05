# Agent Terminal Service

## Overview

The terminal service provides interactive PTY-backed shell sessions accessible via WebSocket. Used by both the mobile app and console SPA for real-time terminal access.

## Architecture

```
Client (Mobile/Console)          Agent Server                    Shell
    │                                │                             │
    │  WS /PocketDev/ws/terminal     │                             │
    │────────────────────────────►   │                             │
    │                                │  createTerminalSession()    │
    │                                │  ├── Resolve shell          │
    │                                │  └── script -q -c 'bash -il' /dev/null
    │                                │         │                    │
    │   terminal.ready               │         │  PTY allocated     │
    │◄───────────────────────────    │◄────────│                    │
    │   { sessionId }                │         │                    │
    │                                │         │                    │
    │  terminal.input                │         │                    │
    │  { sessionId, data }           │         │                    │
    │────────────────────────────►   │────────►│  stdin write       │
    │                                │         │                    │
    │   terminal.output              │         │  stdout bytes      │
    │◄───────────────────────────    │◄────────│                    │
    │   { data }                     │         │                    │
    │                                │         │                    │
    │  terminal.resize               │         │                    │
    │  { sessionId, cols, rows }     │         │                    │
    │────────────────────────────►   │  stty cols X rows Y          │
    │                                │                              │
```

## PTY Allocation

**Source**: `apps/agent/src/services/terminal.ts`

Uses the `script` command for PTY allocation — zero native dependencies, works on Linux and macOS.

### Platform-Specific Commands

| Platform | Command |
|---|---|
| Linux | `script -q -c 'bash -il' /dev/null` |
| macOS | `script -q /dev/null 'bash -il'` |

The `-il` flags ensure an interactive login shell, preserving `.bashrc`, aliases, PATH, and prompt customization.

### Environment

```
SHELL: resolved shell path
TERM: xterm-256color
COLUMNS: 80
LINES: 24
PATH: prepended with system tool paths
```

### Session Interface

```typescript
interface TerminalSession {
  id: string
  proc: Subprocess
  send(data: string): void      // Write to stdin
  resize(cols: number, rows: number): void  // Best-effort via stty
  kill(): void                  // SIGTERM + SIGKILL after 3s
}
```

## WebSocket Handler

**Source**: `apps/agent/src/services/terminal-ws.ts`

### Message Protocol

| Direction | Type | Payload |
|---|---|---|
| Server → Client | `terminal.ready` | `{ sessionId }` |
| Server → Client | `terminal.output` | `{ data }` |
| Server → Client | `terminal.exited` | `{ exitCode }` |
| Client → Server | `terminal.input` | `{ sessionId, data }` |
| Client → Server | `terminal.resize` | `{ sessionId, cols, rows }` |
| Client → Server | `ping` | `{}` |
| Server → Client | `pong` | `{}` |

### Lifecycle

1. **beforeHandle**: Authenticate via PocketDev header (or bypass in dev mode)
2. **open**: Create terminal session, send `terminal.ready`
3. **message**: Route by type (input → stdin, resize → stty, ping → pong)
4. **close**: Kill session, cleanup

### Output Streaming

Terminal output is **raw byte-to-byte** (not line-buffered like tasks). This preserves terminal control sequences, cursor movement, and colors for authentic terminal rendering.

### Resize Limitations

The `script` command doesn't support PTY resize natively. Resize is attempted via `stty cols X rows Y` command injection, which has limited fidelity.

## Debug Logging

Ring buffer of 100 entries tracking auth attempts and session events. Accessible via `getTerminalDebugLog()` and exposed through the console diagnostics panel.

## Mobile Integration

**Source**: `apps/mobile/src/hooks/useTerminalCommand.ts`

The `useTerminalCommand` hook provides a higher-level interface:

- Sends initial command on connection
- Detects sudo password prompts automatically
- Caches sudo passwords via OS keychain
- Pattern-matches errors for UI feedback
- Returns: `output`, `hasError`, `done`, `connected`, `showSudoPrompt`
