# Phase 3: Mobile App

**Goal**: Build the React Native app for pairing with a PocketDev agent, launching tasks, and streaming live output.

**Session**: Start a new Claude Code chat. Reference `CLAUDE.md` and the wire protocol in `packages/shared/src/types/`.

---

## Prerequisites

- Phase 2 complete (agent server running, pairing works, WebSocket streaming works)
- Xcode installed (for iOS simulator)
- `apps/mobile` scaffolded from Phase 0

---

## Steps

### 1. Add dependencies

```bash
cd apps/mobile
pnpm add @noble/ed25519 react-native-mmkv @react-navigation/native @react-navigation/native-stack zustand
pnpm add @pocketdev/shared
```

- `@noble/ed25519` — keypair generation (same lib as agent/shared)
- `react-native-mmkv` — secure local storage for private key + server info
- `@react-navigation/*` — navigation
- `zustand` — lightweight state management for WebSocket state

### 2. Create core services

**`src/services/crypto.ts`**:
- `generateDeviceKeypair()` — generates Ed25519 keypair, stores private key in MMKV
- `getStoredKeypair()` — retrieves keypair from MMKV
- `signMessage(message)` — signs with stored private key

**`src/services/storage.ts`**:
- `saveServer(ip, port, serverId)` — persists paired server info in MMKV
- `getServer()` — retrieves server info
- `clearServer()` — unpairs

**`src/services/websocket.ts`**:
- WebSocket client class with:
  - Authenticated connection (signs auth header with device key)
  - Auto-reconnect with exponential backoff
  - Message dispatching to Zustand stores
  - Ping/pong keepalive
  - `send(type, payload)` helper
  - Connection state: connecting / connected / disconnected / error

**`src/services/api.ts`**:
- `pairWithServer(ip, port, code)` — calls `POST /setup/pair`, stores result
- HTTP client for non-WebSocket calls

### 3. Create Zustand stores

**`src/stores/connection.ts`**:
- `status`: connecting / connected / disconnected
- `server`: { ip, port, serverId } | null
- `connect()`, `disconnect()`, `setPaired()`

**`src/stores/tasks.ts`**:
- `tasks`: Map<id, Task>
- `activeTaskId`: string | null
- `taskLogs`: Map<taskId, string[]> (streaming log lines)
- Actions: `startTask(prompt)`, `killTask(id)`, `appendLog(taskId, line)`

### 4. Build screens

**Navigation structure**:
```
Stack Navigator
  ├── ConnectScreen (shown when not paired)
  ├── MainTabs (shown when paired)
  │   ├── TasksScreen (task list)
  │   ├── NewTaskScreen (prompt input)
  │   └── SettingsScreen (server info, unpair)
  └── TaskDetailScreen (live log view)
```

**`src/screens/ConnectScreen.tsx`**:
- Text inputs for server IP and setup code
- "Connect" button
- On submit: generates keypair, calls `pairWithServer()`, navigates to MainTabs
- Error display for invalid code / unreachable server
- Clean, focused UI — this is the first impression

**`src/screens/TasksScreen.tsx`**:
- List of tasks with status badges (running = blue, completed = green, failed = red, killed = gray)
- Tap a task -> navigate to TaskDetailScreen
- FAB or button to navigate to NewTaskScreen
- Pull-to-refresh (sends `task.list` command)
- Empty state with instructions

**`src/screens/NewTaskScreen.tsx`**:
- Multi-line text input for the prompt/command
- Model selector prototype (provider first, then model) — mobile-only and not yet transport-backed
- "Save Draft" button — persists prompt + provider/model locally until server wiring lands
- Recent prompts list (stored in MMKV)

**`src/screens/TaskDetailScreen.tsx`**:
- **This is the core screen**. Live-scrolling log view.
- Renders `taskLogs[taskId]` lines as they arrive via WebSocket
- Auto-scrolls to bottom (with "scroll to bottom" button if user scrolls up)
- Status bar at top showing task state + elapsed time
- Kill button (red) for running tasks
- Monospace font for log output
- Color coding: stdout = default, stderr = red/orange

**`src/screens/SettingsScreen.tsx`**:
- Server info display (IP, port, device name, paired since)
- Connection status indicator
- "Unpair" button (clears MMKV, navigates to ConnectScreen)
- App version

### 5. Wire up WebSocket lifecycle

In the app root / navigation container:
- On app launch: check MMKV for paired server
  - If paired: auto-connect WebSocket, show MainTabs
  - If not paired: show ConnectScreen
- On WebSocket message: dispatch to appropriate Zustand store
- On WebSocket disconnect: show reconnecting indicator
- On app background: keep WebSocket alive (or reconnect on foreground)

### 6. Verify

1. Start agent on a local machine or test server
2. Open app in iOS simulator
3. Enter server IP + setup code -> pair succeeds
4. Navigate to NewTaskScreen, type "create a hello world express app"
5. Task appears in TasksScreen with "running" status
6. Tap task -> TaskDetailScreen shows Claude output streaming in real time
7. Kill button terminates the task
8. Close and reopen app -> auto-reconnects, shows task history
9. Settings -> Unpair -> returns to ConnectScreen

---

## CLAUDE.md Updates

After this phase:
- Add mobile-specific commands (`pnpm dev:mobile`, iOS build)
- Document the pairing flow from the mobile perspective
- Note any adjustments to the wire protocol

---

## Commit

```
phase 3: react native app with pairing, task control, live streaming

- connect screen with server pairing flow
- ed25519 keypair generation + mmkv secure storage
- authenticated websocket client with auto-reconnect
- zustand stores for connection state + task management
- task list, new task, and live log streaming screens
- agent type selection (claude / shell)
```
