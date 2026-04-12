# Server Debug Screen

> Reachable from Settings → **Server Debug** (shown only when connected to a server).

## Overview

The Server Debug screen is a dedicated debugging surface separate from the code task workflow. It combines a live interactive terminal with a live snapshot of containers, ports, and system metrics. The intent is to give you the tools to diagnose server-side problems (containers not starting, port conflicts, high memory usage, etc.) without leaving the app.

AI assistance is available directly in the terminal via the built-in **AI Assist** button — it invokes `claude --print` with your problem description and recent terminal output as context, keeping debug sessions separate from the git-backed task system.

## Screen Map

```
RootNavigator → ServerDebug
  └── ServerDebugScreen
        └── ServerDebugWorkspace
              ├── DebugProblemBanner        ← always visible
              └── [phone] SwipeablePager
                    ├── DebugContextPanel   ← Context tab
                    └── DebugTerminalPane   ← Terminal tab

              [tablet split ≥ 960px]
                    ├── DebugContextPanel   ← left pane (380px)
                    └── DebugTerminalPane   ← right pane (flex)
```

## Entry Point

**Source**: `apps/mobile/src/screens/ServerDebugScreen.tsx`

Added to the bottom of the **Workspace** section in SettingsScreen — visible only when a server is paired:

```tsx
{server && (
  <BauhausButton onPress={() => navigation.getParent()?.navigate('ServerDebug')}>
    Server Debug
  </BauhausButton>
)}
```

## Components

### ServerDebugWorkspace

**Source**: `apps/mobile/src/components/server-debug/ServerDebugWorkspace.tsx`

Orchestrator. On mount it triggers a parallel refresh of both the containers store (`refreshContainers`) and the server-actions store (`refresh`). Holds `problemDescription` state and passes it down to `DebugTerminalPane` for use in the AI assist prompt.

Layout strategy:

| Layout mode | Rendering |
|---|---|
| `phone` | `SwipeablePager` with Context / Terminal tabs |
| `tablet` | `SwipeablePager` with Context / Terminal tabs |
| `tabletSplit` (≥ 960px) | `SplitViewLayout` — context left, terminal right |

---

### DebugProblemBanner

**Source**: `apps/mobile/src/components/server-debug/DebugProblemBanner.tsx`

Multi-line `TextInput` at the top of the screen. Always visible regardless of the active tab. The text is lifted up to `ServerDebugWorkspace` and threaded into the AI assist context in `DebugTerminalPane`.

---

### DebugContextPanel

**Source**: `apps/mobile/src/components/server-debug/DebugContextPanel.tsx`

Reads directly from two existing Zustand stores — no new data fetching:

- **`useContainerStore`** — `containers`, `isRefreshing`
- **`useServerActionsStore`** — `metrics`, `ports`, `uptime`, `isRefreshing`

Displays three `BauhausPanel` sections:

| Section | Data source | Fields shown |
|---|---|---|
| System | `metrics[]` from server-actions store | label, value, detail, tone color |
| Containers | `containers[]` from container store | name, image, state badge, ports |
| Listening Ports | `ports[]` from server-actions store | port number, service/process, exposure badge |

The "Refresh" button in the header calls both `refreshContainers()` and `refresh()` in parallel.

Container state badge colors:

| State | Color |
|---|---|
| running | `#22c55e` (green) |
| exited / dead | `#ef4444` (red) |
| restarting / removing | `#facc15` (yellow) |
| paused / created / unknown | `#94a3b8` (slate) |

Port exposure badge colors: `public` → yellow (`#facc15`), `local` → green (`#22c55e`).

---

### DebugTerminalPane

**Source**: `apps/mobile/src/components/server-debug/DebugTerminalPane.tsx`

Uses `useTerminalCommand({ persistent: true })` — the WebSocket stays open until the screen unmounts. The `output` string is passed as the controlled `output` prop on `TerminalView`.

**Quick action chips** — horizontal scroll row above the terminal:

| Label | Command sent |
|---|---|
| `docker ps -a` | `docker ps -a` |
| `compose logs` | `docker compose logs --tail=50 2>&1` |
| `ports` | `lsof -i -P -n \| grep LISTEN` |
| `disk` | `df -h` |

Chips are disabled while `connected === false`.

**AI Assist** wires the `TerminalView`'s `onAiAssist(prompt, terminalOutput)` callback to construct and send a `claude --print` command to the live terminal shell:

```
claude --print '${problemDescription}
${userPrompt}

Recent terminal output:
${terminalOutput.slice(-3000)}'
```

Single quotes in the constructed prompt are escaped (`'` → `'\''`) to prevent shell injection. Claude's response streams back directly into the terminal — no task system involved.

**Sudo prompts** — `useTerminalCommand` auto-detects `[sudo] password for` in terminal output and sets `showSudoPrompt: true`. A bottom sheet modal collects the password and forwards it via `submitSudoPassword`.

## Data Flow

```
Mount
 ├── containers store → refreshContainers() → HTTP GET /api/containers
 └── server-actions store → refresh() → parallel HTTP GET:
       /api/server-actions/summary
       /api/server-actions/ports
       /api/server-actions/network
       /api/server-actions/errors
       /api/server-actions/actions

DebugContextPanel reads from both stores (no local state)

DebugTerminalPane
 └── useTerminalCommand(persistent: true)
       ├── Opens WS to /PocketDev/ws/terminal (Ed25519 auth header)
       ├── Receives terminal.ready { sessionId }
       ├── Streams terminal.output → accumulated in output state
       └── Sends terminal.input for user commands / AI assist
```

## Stores Used

| Store | Import | Used for |
|---|---|---|
| `useContainerStore` | `stores/containers` | containers list + refresh |
| `useServerActionsStore` | `stores/server-actions` | metrics, ports, uptime + refresh |

No new store was added. The screen reuses existing data infrastructure.

## Navigation

`ServerDebug` is a root stack screen (not a tab). Navigation is done via `navigation.getParent()?.navigate('ServerDebug')` from within the Settings tab, same pattern as `Containers`, `Plan`, and `Projects`.

```typescript
// types.ts
export type RootStackParamList = {
  // ...
  ServerDebug: undefined
}
```

## Update Rule

If any component, store contract, or AI assist behavior changes, update this document in the same change so the screen map and data flow stay accurate.
