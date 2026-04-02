# Phase 2: Agent Server

**Goal**: Build the PocketDev agent that runs on target servers. Secure device pairing, WebSocket event streaming, CLI process wrapper for AI agents (Claude, Codex), interactive terminal, file management API, and dev server preview proxy.

**Session**: Start a new Claude Code chat. Reference `CLAUDE.md` and the wire protocol types in `packages/shared/src/types/`.

---

## Prerequisites

- Phase 1 complete (web app deployed, shared types defined)
- A test Linux server (or local machine) to run the agent on
- Claude CLI installed on the test server (`claude` command available)

---

## Steps

### 1. Set up `apps/agent` with Bun + Elysia

**Install dependencies**:
```bash
cd apps/agent
pnpm add elysia
```

**Create server** (`src/index.ts`):
- Bun HTTP server with Elysia router
- Port 4387 (default, configurable via `POCKETDEV_PORT` env)
- Routes: `/health`, `/setup`, `/setup/pair`, `/files/*`, `/preview/*`, WebSocket at `/ws` and `/ws/terminal`
- SQLite database via `bun:sqlite` for local state

**SQLite schema** (`src/db/schema.sql`):
```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_seen TEXT DEFAULT (datetime('now'))
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  agent_type TEXT DEFAULT 'claude',
  status TEXT DEFAULT 'pending',
  started_at TEXT,
  completed_at TEXT,
  exit_code INTEGER
);

CREATE TABLE task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  stream TEXT NOT NULL,  -- 'stdout' or 'stderr'
  line TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now'))
);
```

### 2. Implement setup + pairing flow

**Setup mode**:
- On first boot (no devices registered), generate a 6-character alphanumeric setup code
- Store code in memory with a 15-minute expiry
- `GET /setup` — returns setup status (code display is in terminal output, not HTTP)
- `POST /setup/pair` — accepts `{ code, publicKey, deviceName }`
  - Validates setup code
  - Registers device in SQLite `devices` table
  - Returns `{ serverId, serverPublicKey }` (server also generates a keypair on first boot, stored in SQLite or a config file)
  - Disables setup mode (delete code, reject future `/setup` requests)

**After pairing**:
- `GET /setup` returns 404
- `POST /setup/pair` returns 403
- Only authenticated requests proceed

### 3. Implement authenticated WebSocket

**`/ws` upgrade handler**:
- Client sends auth header with `{ deviceId, timestamp, signature }` (signed with device private key)
- Server verifies signature using stored public key from `devices` table
- On success: upgrade to WebSocket, mark device `last_seen`
- On failure: 401

**WebSocket message format** (defined in `@pocketdev/shared/types`):
```ts
interface WsMessage {
  type: string       // e.g. 'task.start', 'task.output', 'ping'
  id: string         // unique message ID
  payload: unknown   // type-specific payload
  timestamp: number  // unix ms
}
```

**Implement handlers for**:
- `ping` / `pong` — keepalive
- `task.start` — spawn a process (see step 4)
- `task.kill` — kill a running process
- `task.list` — return active + recent tasks

**Implement emitters for**:
- `task.output` — streaming stdout/stderr lines
- `task.status_changed` — when task transitions state
- `task.completed` — when task finishes (with exit code)

### 4. Implement CLI process wrapper

**`src/services/managed-process.ts`**:

A `ManagedProcess` class that:
- Spawns a child process via `Bun.spawn()`
- Captures stdout/stderr line-by-line using readable streams
- Emits each line as a `task.output` WebSocket event
- Tracks process state: pending -> running -> completed/failed/killed
- Stores lines in SQLite `task_logs` table
- Handles `SIGTERM` gracefully (with `SIGKILL` fallback after 5s)

**Initial agent wrappers**:
- `claude` — spawns `claude --dangerously-skip-permissions` with the user's prompt
- `shell` — spawns an arbitrary shell command (with safety warnings)
- Codex support can be added later (same pattern)

### 5. Add interactive terminal

**`src/services/terminal.ts`** — PTY session manager:
- Uses `Bun.spawn(['script', ...])` to allocate a real pseudo-terminal (zero native deps)
- Platform-aware: Linux uses `script -q -c bash /dev/null`, macOS uses `script -q /dev/null bash`
- Streams raw output (not line-buffered) for terminal fidelity
- One session per WebSocket connection, killed on disconnect
- Resize support via `stty cols X rows Y` (best-effort without native ioctl)

**`src/services/terminal-ws.ts`** — WebSocket endpoint:
- `WS /ws/terminal` — separate from task WebSocket at `/ws`
- Reuses Ed25519 authentication from the task WebSocket
- Protocol: `{ type: 'terminal.input', data }` for keystrokes, `{ type: 'terminal.resize', cols, rows }` for sizing
- Server sends `{ type: 'terminal.output', data }` for raw output, `{ type: 'terminal.exited', exitCode }` on exit

### 6. Add file management API

**`src/routes/files.ts`** — REST endpoints for file operations:
- `GET /files/tree?path=&depth=2` — directory listing (skips hidden files, `node_modules`)
- `GET /files/read?path=` — file content (1MB cap)
- `PUT /files/write` — write file content `{ path, content }`
- `POST /files/mkdir` — create directory
- `DELETE /files/delete?path=` — delete file/directory
- `GET /files/search?q=&path=` — ripgrep search (falls back to grep)
- All paths validated against `POCKETDEV_PROJECT_DIR` to prevent directory traversal

### 7. Add dev server preview proxy

**`src/services/proxy.ts`** — reverse proxy:
- `ANY /preview/*` forwards to `localhost:{devPort}` on the same machine
- Auto-detects dev server port from task stdout (parses "Local: http://localhost:5173" etc.)
- Port configurable via `POCKETDEV_DEV_PORT` env (default: 5173)
- Proxies all HTTP methods and headers
- Mobile renders previews in `react-native-webview` through this single port

### 8. Update the install script

Now that the agent exists, update the install script served by the web app (`apps/web/src/routes/install.sh.ts`):

```bash
#!/bin/bash
set -euo pipefail

POCKETDEV_VERSION="0.2.0"
INSTALL_DIR="/opt/pocketdev"

echo "============================================"
echo "  PocketDev Installer v${POCKETDEV_VERSION}"
echo "============================================"

# Check requirements
command -v docker >/dev/null 2>&1 || { echo "Docker required. Install: https://get.docker.com"; exit 1; }

# Create directory
sudo mkdir -p "$INSTALL_DIR"

# Download and start agent
# (Docker pull or binary download — TBD based on distribution strategy)

# Generate setup code
SETUP_CODE=$(cat /dev/urandom | tr -dc 'A-Z0-9' | fold -w 4 | head -n 1)-$(cat /dev/urandom | tr -dc '0-9' | fold -w 4 | head -n 1)

echo ""
echo "PocketDev installed successfully."
echo ""
echo "Open on your phone:"
echo "  http://$(curl -s ifconfig.me):4387/setup"
echo ""
echo "Setup code: $SETUP_CODE"
echo ""
echo "This code expires in 15 minutes."
```

### 9. Agent Dockerfile

**`apps/agent/Dockerfile`**:
- Multi-stage Bun build
- Includes `bun:sqlite` support (built-in)
- Exposes port 4387
- Volume mount for `/opt/pocketdev/data` (SQLite DB persistence)
- Volume mount for project directory (configurable)

### 10. Docker Compose dev environment

**`docker-compose.dev.yml`** at repo root:
- `agent` — Bun with `--watch` hot reload, mounts `apps/agent/`
- `sample-app` — Vite React project for testing the edit-preview loop
- `testing-host` — Debian container simulating a remote server

### 11. Verify

1. Start agent locally: `cd apps/agent && bun run dev`
2. Agent prints setup code to terminal
3. Use curl to simulate pairing:
   ```bash
   curl -X POST http://localhost:4387/setup/pair \
     -H "Content-Type: application/json" \
     -d '{"code":"XXXX-1234","publicKey":"...","deviceName":"test"}'
   ```
4. Connect via WebSocket (use `wscat` or similar):
   ```bash
   wscat -c ws://localhost:4387/ws -H "Authorization: ..."
   ```
5. Send `task.start` message — should spawn a process and stream output
6. Send `task.kill` — should terminate the process
7. After pairing, `curl http://localhost:4387/setup` returns 404
8. Test terminal: `wscat -c ws://localhost:4387/ws/terminal -H "Authorization: ..."` — type commands, see output
9. Test files: `curl http://localhost:4387/files/tree` — returns directory listing
10. Test preview: start a Vite app on the server, `curl http://localhost:4387/preview/` — returns the app HTML

---

## CLAUDE.md Updates

After this phase:
- Add agent-specific commands to key commands section
- Document the pairing flow
- Update architecture diagram with actual ports/protocols

---

## Commit

```
phase 2: agent server with secure pairing, websocket streaming, cli wrapper, terminal, files, preview

- bun + elysia agent server on port 4387
- ed25519 device pairing with setup code (15 min expiry)
- authenticated websocket with message protocol
- managed process wrapper for claude/codex/shell
- interactive terminal via PTY (script command) at /ws/terminal
- file management REST API at /files/* with traversal protection
- dev server reverse proxy at /preview/* with auto port detection
- sqlite local state for devices, tasks, logs
- docker-compose.dev.yml for local development
- agent dockerfile
```
