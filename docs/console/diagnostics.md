# Console Diagnostics Panel

## Overview

The DiagnosticsPanel provides real-time debugging information about the agent server's subsystems. It lives on the ConsolePage and offers 8 tabbed debug views.

**Source**: `apps/agent/console/src/components/DiagnosticsPanel.tsx`

## Architecture

```
DiagnosticsPanel
├── Tab bar (8 tabs)
├── Live polling toggle + refresh button
├── Last updated timestamp
└── Tab content area
    ├── Terminal tab (inline)
    ├── Setup tab → SetupDiagnosticsTab
    ├── Tasks tab → TasksDiagnosticsTab
    ├── Registry tab (inline)
    ├── Codex tab → CodexDiagnosticsTab
    ├── Claude tab → ClaudeDiagnosticsTab
    ├── GitHub tab (inline)
    └── Copilot tab (inline)
```

## Debug Tabs

### Terminal

Displays terminal debug log (ring buffer of 100 entries). Shows auth attempts, session events with timestamps.

**Endpoint**: `GET /PocketDev/api/console/debug/terminal`

### Setup (SetupDiagnosticsTab)

**Source**: `apps/agent/console/src/components/diagnostics/SetupDiagnosticsTab.tsx`

Shows prerequisites report + provider install/auth state:
- OS and architecture
- Per-tool status (installed, version, auth)
- Claude and Codex provider details (path, version, authenticated, last updated)

**Endpoint**: `GET /PocketDev/api/console/debug/setup`

### Tasks (TasksDiagnosticsTab)

**Source**: `apps/agent/console/src/components/diagnostics/TasksDiagnosticsTab.tsx`

Shows task history and active processes:
- Task list with ID, prompt excerpt, agent type, model, status, timestamps
- Active process details (has process handle, current status)
- Per-task log viewer (expandable)
- Total task count

**Endpoint**: `GET /PocketDev/api/console/debug/tasks`

### Registry

Displays paired device registry:
- Device ID, name, platform
- Public key prefix (for verification)
- Last seen timestamp
- Server time for clock-skew debugging

**Endpoint**: `GET /PocketDev/api/console/debug/auth`

### Codex (CodexDiagnosticsTab)

**Source**: `apps/agent/console/src/components/diagnostics/CodexDiagnosticsTab.tsx`

Shows Codex auth sessions:
- Active session count
- Per-session: ID, state, authenticated, auth URL, verification code, output excerpt
- Last replay debug info (callback replay attempts)
- Persisted state (tool path, version, auth status)

**Endpoint**: `GET /PocketDev/api/console/debug/codex-auth`

### Claude (ClaudeDiagnosticsTab)

**Source**: `apps/agent/console/src/components/diagnostics/ClaudeDiagnosticsTab.tsx`

Shows Claude auth sessions:
- Active session count
- Per-session: state, auth URL, prompt text, theme/method handled flags, output excerpt
- Persisted state

**Endpoint**: `GET /PocketDev/api/console/debug/claude-auth`

### GitHub

Shows GitHub CLI auth sessions:
- Per-session: state, auth URL, verification code, GitHub username, private repo access
- Persisted state

**Endpoint**: `GET /PocketDev/api/console/debug/github-auth`

### Copilot

Shows Copilot trust sessions:
- Per-session: state, trust target, trust handled, fallback attempted, UI ready
- Trust markers list
- Debug events log (timestamped messages)
- Live trust status

**Endpoint**: `GET /PocketDev/api/console/debug/copilot-auth`

## Live Polling

- Toggle: live/paused mode
- Configurable interval (default varies)
- Fetches all debug endpoints in parallel via `Promise.allSettled`
- Handles individual endpoint failures gracefully (shows partial data)
- Last updated timestamp shown in header

## Open Terminal Button

The panel includes a button to open the full-screen terminal modal (delegates to parent ConsolePage via `onOpenTerminal` prop).
