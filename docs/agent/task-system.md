# Agent Task System

## Overview

The task system spawns AI agent processes (Claude, Codex, or shell), streams their output line-by-line to connected clients, and tracks status in SQLite.

## Architecture

```
Mobile App                Agent Server                    CLI Process
    │                         │                              │
    │  task.start             │                              │
    │  { prompt, agent,       │                              │
    │    cwd, model }         │                              │
    │────────────────────►    │                              │
    │                         │  TaskManager.startTask()     │
    │                         │  ├── Insert task record (DB) │
    │                         │  ├── Build command array      │
    │                         │  └── Spawn ManagedProcess     │
    │                         │         │                     │
    │                         │         │  Bun.spawn()        │
    │                         │         │────────────────►    │
    │                         │         │                     │
    │   task.status_changed   │         │  stdout/stderr      │
    │◄────────────────────    │◄────────│  (line by line)     │
    │   { status: 'running' } │         │                     │
    │                         │         │                     │
    │   task.output           │         │  output lines       │
    │◄────────────────────    │◄────────│────────────────     │
    │   { data: "..." }       │  Insert task_log (DB)        │
    │                         │  Broadcast to clients         │
    │                         │         │                     │
    │   task.completed        │         │  Process exit       │
    │◄────────────────────    │◄────────│────────────────     │
    │   { exit_code: 0 }      │  Update task status (DB)     │
```

## TaskManager

**Source**: `apps/agent/src/services/task-manager.ts`

### startTask

```typescript
startTask(
  prompt: string,
  agentType: 'claude' | 'codex' | 'shell',
  workingDirectory: string | null,
  model: string | null
): string  // returns taskId
```

1. Generate task ID (UUID)
2. Resolve working directory:
   - Use `workingDirectory` if provided
   - Fall back to active project path
   - Fall back to `POCKETDEV_PROJECT_DIR` env
3. Insert task record into SQLite
4. Build command array (see below)
5. Create `ManagedProcess` and store in `processes` Map
6. Return `taskId`

### Command Building

| Agent Type | Command |
|---|---|
| `claude` | `[claudePath, '--output-format', 'stream-json', '--permission-mode', mode, '--verbose', ...[--model M], '-p', prompt]` |
| `codex` | `[codexPath, ...[--model M], '--prompt', prompt]` |
| `shell` | `['sh', '-c', prompt]` |

Permission modes: `acceptEdits` (default) auto-approves file edits; `plan` blocks all tools and emits `permission_denials` in stream-json output.

Tool paths resolved from SQLite `tool_paths` table via `getToolPath()`, with fallback to bare CLI names.

### killTask

Retrieves process from `processes` Map, calls `proc.kill()`.

### getTaskList

Returns 50 most recent tasks from SQLite, ordered by `created_at DESC`.

## ManagedProcess

**Source**: `apps/agent/src/services/managed-process.ts`

### State Machine

```
pending → running → completed (exit 0)
                  → failed (exit != 0)
                  → killed (SIGTERM/SIGKILL)
```

### Process Spawning

Uses `Bun.spawn()` with:
- Piped stdout and stderr
- `FORCE_COLOR: '0'` to disable ANSI terminal colors
- Working directory from task config

### Line Streaming

`streamLines()` reads raw UTF-8 bytes, splits on `\n`:

For each line:
1. Insert into `task_logs` table: `(task_id, stream, line)`
2. Broadcast `task.output` to all connected WebSocket clients
3. Check for dev server port patterns (see below)

### Dev Server Port Detection

Regex patterns scanned on each output line:

```
https?://(?:localhost|127.0.0.1|0.0.0.0):(\d+)
/listening on (?:port )?(\d+)/i
/server (?:running|started) (?:at|on) .*?:(\d+)/i
```

When detected, updates the preview proxy service's target port.

### Kill Process

1. Send `SIGTERM`
2. Schedule `SIGKILL` after 5 seconds (force kill)
3. Status transitions to `killed`

## Database Schema

### tasks table

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| prompt | text | Full prompt text |
| agent_type | text | 'claude' / 'codex' / 'shell' |
| working_directory | text | Resolved CWD |
| status | text | pending/running/completed/failed/killed |
| exit_code | integer | Process exit code |
| project_id | text | Associated project |
| model | text | CLI model identifier |
| created_at | text | ISO timestamp |
| started_at | text | When process started |
| completed_at | text | When process exited |

### task_logs table

| Column | Type | Notes |
|---|---|---|
| id | integer PK | Auto-increment |
| task_id | text FK | References tasks.id |
| stream | text | 'stdout' / 'stderr' |
| line | text | Single output line |
| timestamp | text | ISO timestamp |

## REST Endpoint

```
GET /PocketDev/tasks
  → Authenticate request
  → Return 50 most recent tasks
```
