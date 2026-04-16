# Agent Task System

## Overview

The task system spawns AI agent processes, streams their output to connected clients, and tracks status in SQLite. Two process managers handle different agent types: `ManagedAgentProcess` (tmux-based, Claude and Copilot) and `ManagedProcess` (stdio-based, Codex and Shell). Both normalize output through a `TaskStreamAdapterSink` interface and broadcast events to all connected WebSocket clients.

## Architecture

```
Mobile App                  Agent Server
    │                            │
    │  task.start / task.continue│
    │───────────────────────────►│
    │                            │
    │                     TaskManager.startTask()
    │                     ├── Insert task record (DB)
    │                     ├── Insert user turn (Claude)
    │                     └── Route by agent type
    │                            │
    │              ┌─────────────┴──────────────────┐
    │       claude/copilot                     codex/shell
    │       ManagedAgentProcess              ManagedProcess
    │       (tmux session)                  (Bun.spawn)
    │              │                              │
    │    ┌─────────┴──────────┐         piped stdout/stderr
    │  FILE MODE          PANE MODE
    │  hooks JSONL        tmux capture-pane
    │  polling            polling
    │              │                              │
    │              └──────────┬───────────────────┘
    │                         │
    │                 TaskStreamAdapterSink
    │                 (emitActivity / emitOutput /
    │                  emitQuestion / emitPermissionRequest)
    │                         │
    │                  Broadcast to WS clients:
    │   task.output       ◄───┤
    │   task.activity     ◄───┤
    │   task.question     ◄───┤
    │   task.permission_request ◄─┤
    │   task.status_changed ◄──┤
    │   task.completed    ◄───┤
    │   task.turn_started ◄───┘  (continuation turns only)
```

## Agent Types

| Agent | Process class | Output capture | Poll interval | Session resumption |
|---|---|---|---|---|
| `claude` | ManagedAgentProcess | FILE + PANE | 250ms | Yes (`--resume` / `--session-id`) |
| `copilot` | ManagedAgentProcess | PANE only | 1500ms | No |
| `codex` | ManagedProcess | stdio JSON-RPC | N/A | No |
| `shell` | ManagedProcess | stdin/stdout | N/A | No |

## ManagedAgentProcess

**Source**: `apps/agent/src/services/tasks/managed-agent-process.ts`

Manages Claude and Copilot CLI processes via a tmux session. Provides real PTY support for interactive TUI behavior while still capturing structured output.

### TmuxProviderConfig Interface

Each provider supplies a config object at startup:

```typescript
interface TmuxProviderConfig {
  pollIntervalMs: number
  panePollEvery: number          // pane captured every N poll ticks
  startupTimeoutMs: number
  tmuxWidth: number
  tmuxHeight: number
  setup(ctx: SetupCtx): Promise<SetupResult>
  createAdapter?(ctx: SetupCtx): TaskStreamAdapter | null
  onPaneSnapshot(snapshot: string, ctx: PaneCtx): PaneAction
  onFinish?(ctx: FinishCtx, taskId: string): void
}
```

`PaneAction` return values:
- `{ type: 'continue' }` — nothing to do this tick
- `{ type: 'complete' }` — provider signalled done; transition to completed
- `{ type: 'send', text: string }` — send keystrokes to pane via `tmux send-keys -l`
- `{ type: 'question', ... }` — register a question with the client queue

### FILE MODE (Claude)

`setup()` returns an `outputFilePath` pointing to `/tmp/pocketdev-events-{taskId}.jsonl`. The poll loop reads new JSONL bytes from this file and passes each line to `ClaudeTaskStreamAdapter`. The tmux session exit (detected by `tmux has-session`) signals process completion.

### PANE MODE (Claude + Copilot)

`tmux capture-pane -p` is called every `panePollEvery` ticks (default: every 3 ticks for Claude, every tick for Copilot). The full pane snapshot is passed to `onPaneSnapshot()`, which returns a `PaneAction` controlling what happens next. Claude uses pane mode in parallel with FILE mode to handle TUI permission menus and question prompts.

### Claude Specifics

- **tmux dimensions**: 220×50
- **Poll interval**: 250ms; pane polled every 3 ticks (~750ms)
- **Idle timeout**: 120s of pane stability → `finish('completed')`
- **Startup timeout**: 60s waiting for ready signal
- **Ready signal**: `Claude Code v\d+\.\d+` in pane
- **Prompt delivery**: sent as literal keystroke sequence via `tmux send-keys -l`
- **TUI detection**: `parseTuiPrompt()` parses `❯ 1. Yes  2. No` style menus into `TaskQuestion` objects
- **Trust dialog**: auto-accepted on startup

**Hooks system**: Claude is launched with a `--settings` file that wires three hooks:

| Hook | Trigger | Effect |
|---|---|---|
| `PreToolUse` | Before each tool | Appends JSONL to hooks file |
| `PostToolUse` | After each tool | Appends JSONL to hooks file |
| `Stop` | Task complete | Appends JSONL + fires `finish('completed')` |

Hooks file path: `/tmp/pocketdev-events-{taskId}.jsonl`

**`onFinish`**: inserts the collected text as an assistant turn via `insertTaskTurn`; calls `createClaudePlan()` if `mode === 'plan'`.

### Copilot Specifics

- **tmux dimensions**: 120×40
- **Poll interval**: 1500ms; pane polled every tick
- **Idle timeout**: 10s of pane stability + ready pattern visible → `finish('completed')`
- **Startup timeout**: 45s
- **Ready signals**: "describe a task to get started", "type @ to mention files", etc.
- **Trust prompt**: auto-accepted (Down arrow + Enter)

### Context-Limit Detection

Claude's built-in context-window warnings are detected by pattern-matching every pane snapshot:

```
/context window.*(?:full|limit|approaching|at \d{2,3}%)|use \/compact|run \/compact/i
```

Fires at most once per task (`contextLimitWarned` flag). On match:
1. Broadcasts `task.output`: `[claude] Context window approaching limit`
2. Emits a `task.question` (yes/no): "Claude's context window is nearly full. Run /compact to summarise and free space?"
3. If the user answers `"yes"`, the server sends `/compact\n` to the Claude tmux session

The mobile `TaskInteractionSheet` surfaces this automatically through the standard yes/no question path — no extra client code required.

### Temp File Lifecycle

Files created per task:
- `scriptPath` — tmux launch script
- `hooksSettingsPath` — Claude settings JSON with hook definitions
- `hooksFilePath` — output JSONL for hook events

All three are deleted 5 seconds after `finish()` is called.

### Push Notifications

`pushToAllDevices()` is called in two cases:
1. A question is registered and no WebSocket client is currently connected
2. The task reaches a terminal state (completed/failed/killed)

### State Machine

```
pending → running → completed (Stop hook / idle / session exit)
                  → failed    (exit != 0 / error state)
                  → killed    (SIGTERM / SIGKILL)
```

### Public API

```typescript
constructor(opts: ManagedAgentProcessOptions)
async start(): Promise<void>
kill(): void
async answerQuestion(questionId: string, answer: string): Promise<void>
sendInput(data: string): void
getPendingQuestions(): TaskQuestion[]
get status(): TaskStatus
```

## ManagedProcess

**Source**: `apps/agent/src/services/tasks/managed-process.ts`

Manages Codex and Shell processes via direct `Bun.spawn()`.

### Process Spawning

- `Bun.spawn()` with piped stdin, stdout, stderr
- `FORCE_COLOR: '0'` to suppress ANSI terminal colors
- Working directory from task config

### Codex Startup Sequence

Codex uses a JSON-RPC 2.0 protocol over stdio. On spawn, the process sends the handshake:

1. Send `initialize` request (stdin)
2. Receive `initialized` notification (stdout)
3. Send `thread/start` request
4. Receive response with `threadId` → stored as `sessionId` in DB
5. Send `turn/start` request with the user prompt

### Line Streaming

For each stdout/stderr line:
1. Insert into `task_logs` table
2. Broadcast `task.output` to all WebSocket clients
3. Check for dev server port patterns

### Dev Server Port Detection

Patterns scanned on every output line:
```
https?://(?:localhost|127.0.0.1|0.0.0.0):(\d+)
/listening on (?:port )?(\d+)/i
/server (?:running|started) (?:at|on) .*?:(\d+)/i
```

When matched, updates the preview proxy service's target port.

### Kill Process

1. Send `SIGTERM`
2. Schedule `SIGKILL` after 5 seconds
3. Status transitions to `killed`

### Plan Creation on Finish

When `mode === 'plan'` and collected tool uses exist, `plan-manager.proposePlan()` is called, which broadcasts `plan.proposed` to clients.

## task-stream-adapters.ts

**Source**: `apps/agent/src/services/tasks/task-stream-adapters.ts`

Normalizes provider-specific output into the shared event model.

### TaskStreamAdapterSink Interface

Implemented by both process classes and passed to adapters:

```typescript
interface TaskStreamAdapterSink {
  emitOutput(line: string): void
  emitActivity(activity: TaskActivity): void
  emitQuestion(question: TaskQuestion, onAnswer: (answer: string) => void): void
  emitPermissionRequest(denials: PermissionDenial[]): void
  updateSessionId(id: string): void
  recordCollectedToolUse(toolUse: CollectedToolUse): void
  signalComplete?(): void
}
```

### ClaudeTaskStreamAdapter

Parses `--output-format stream-json` JSONL messages:

| Message type | Handled as |
|---|---|
| `system` | Captures `sessionId`; routes sub-agent `task_started/progress/completed` |
| `assistant` | Emits `thinking`, `text`, `tool_use` activities from content blocks |
| `user` | Emits `tool_result` activities |
| `result` | Calls `signalComplete()` |
| `rate_limit_event` | Silently consumed |

Permission handling (two formats):
- `permission_requests[]` array on any message — forwarded before tool execution (default mode)
- `permission_denials[]` array on any message — forwarded after denial (plan mode)
- Top-level `type: 'permission'` message — forwarded directly

### CodexTaskStreamAdapter

Parses JSON-RPC 2.0 messages. Requests (have `id`) require a response over stdin:

| Method | Question type emitted |
|---|---|
| `item/commandExecution/requestApproval` | `permission` |
| `item/fileChange/requestApproval` | `permission` |
| `item/permissions/requestApproval` | `permission` |
| `item/tool/requestUserInput` | `free_response`, `multiple_choice`, or `form` |
| `mcpServer/elicitation/request` | auto-accepted (no question emitted) |

Notifications (no `id`) consumed: `thread/started`, `turn/started`, `item/agentMessage/delta`, `item/reasoning/textDelta`, `item/started`, `item/completed`, `turn/completed`, `error`.

### Tool Classification

`classifyToolUse(toolName, kind?)` maps provider-specific tool names to a shared `TaskToolKind`:

```
read | search | write | create | run | agent | plan | mcp | web | image | info
```

The `kind` field from structured hook events takes precedence when present.

## task-manager.ts

**Source**: `apps/agent/src/services/tasks/task-manager.ts`

### startTask

```typescript
startTask(
  prompt: string,
  agentType: string,
  workingDirectory: string | null,
  model: string | null,
  mode: 'default' | 'plan',
): string  // returns taskId
```

1. Generate `taskId` (UUID); generate `sessionId` for Claude
2. Resolve working directory: provided → active project → `POCKETDEV_PROJECT_DIR` → `HOME`
3. Insert task record into SQLite
4. Insert initial user turn (Claude only, because Claude tracks session turns)
5. Route by agent type:
   - `claude/copilot` → `new ManagedAgentProcess(... provider: claudeProviderConfig() / copilotProviderConfig())`
   - `codex/shell` → `new ManagedProcess(... command: buildCommand(...))`
6. Store process in `processes` Map
7. Return `taskId`

### continueTask

```typescript
continueTask(taskId: string, prompt: string, model: string | null): boolean
```

Only works for `completed` or `failed` Claude tasks with a `sessionId`:
1. Insert user turn record via `insertTaskTurn`
2. Call `resetTaskForContinuation(taskId, newTurnCount)` — resets status to `pending`, bumps `turnCount`
3. Spawn new `ManagedAgentProcess` with same `taskId`, `sessionId`, incremented `turnNumber`
4. When `turnNumber > 1`, the process broadcasts `task.turn_started { taskId, turnNumber }` before starting

### buildCommand

Only used for `codex` and `shell` agents. Claude and Copilot build their commands inside `ManagedAgentProcess.provider.setup()`.

| Agent | Command |
|---|---|
| `codex` | `[codexPath, 'app-server', '--listen', 'stdio://']` |
| `shell` | `['sh', '-c', prompt]` |

### killTask / getTaskList / getProcess

- `killTask(taskId)` — retrieves process from Map, calls `proc.kill()`
- `getTaskList()` — returns 50 most recent tasks from SQLite
- `getProcess(taskId)` — returns active process (used by WS handler for `task.answer`)

## plan-manager.ts

**Source**: `apps/agent/src/services/tasks/plan-manager.ts`

Called from `onFinish` when `mode === 'plan'`:
- `proposePlan(taskId, title, description, agentName, steps, questions)` — inserts a plan record into SQLite, broadcasts `plan.proposed`
- When the user accepts the plan in the mobile UI → `acceptPlan(planId)` re-runs the task in `'default'` mode

## Database Operations

| Function | Caller | Purpose |
|---|---|---|
| `insertTask` | task-manager.startTask | New task record |
| `insertTaskTurn` | task-manager, ManagedAgentProcess.onFinish, ManagedProcess exited handler | User and assistant turns |
| `resetTaskForContinuation` | task-manager.continueTask | Reset status, bump turnCount |
| `insertTaskLog` | ManagedAgentProcess.handleLine, pollPane | Raw log lines |
| `insertTaskFileTouch` | recordCollectedToolUse (both process classes) | Files touched per turn |
| `updateTaskStatus` | setStatus (both process classes) | Status transitions with timestamps |

## WebSocket Handler

**Source**: `apps/agent/src/services/terminal/ws.ts`

### Commands Handled

| Type | Payload | Handler |
|---|---|---|
| `task.start` | `{ prompt, agentType, workingDirectory?, model?, mode? }` | `startTask()` |
| `task.continue` | `{ taskId, prompt, model? }` | `continueTask()` |
| `task.kill` | `{ taskId }` | `killTask()` |
| `task.input` | `{ taskId, data }` | `proc.sendInput()` |
| `task.answer` | `{ taskId, questionId, answer }` | `proc.answerQuestion()` |
| `task.list` | — | `getTaskList()` |

`task.continue` error-replies with `task.status_changed { status: 'failed' }` when `continueTask()` returns `false` (wrong agent type, task not found, wrong status).

### Client Management

- `clients` Map: `Map<deviceId, WsClient>` — one active connection per device ID
- Stale connections replaced when device reconnects (500ms delay to avoid frame ordering issues)
- Auto-lock timer: locks port after N minutes with no clients and no running tasks

## Wire Protocol

### Commands (Mobile → Server)

| Type | Payload | Purpose |
|---|---|---|
| `task.start` | `{ prompt, agentType, workingDirectory?, model?, mode? }` | Start a new task |
| `task.continue` | `{ taskId, prompt, model? }` | Continue a completed Claude task |
| `task.kill` | `{ taskId }` | Kill a running task |
| `task.input` | `{ taskId, data }` | Send raw stdin to process |
| `task.answer` | `{ taskId, questionId, answer }` | Answer an agent prompt |
| `task.list` | — | Request recent task list |

### Events (Server → Mobile)

| Type | Payload | Purpose |
|---|---|---|
| `task.output` | `{ taskId, stream, line }` | Raw log line (fallback display) |
| `task.activity` | `{ taskId, activity, timestamp }` | Normalized task activity |
| `task.question` | `{ questionId, taskId, prompt, type, options?, fields? }` | Structured agent question |
| `task.permission_request` | `{ taskId, denials[] }` | Permission denial details |
| `task.status_changed` | `{ taskId, status }` | Status transition |
| `task.completed` | `{ taskId, exitCode, status }` | Task finished |
| `task.turn_started` | `{ taskId, turnNumber }` | New turn starting (continuation only) |
| `task.list` | `{ tasks[] }` | Task list response |

## Database Schema

### tasks table

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| prompt | text | Full prompt text |
| agent_type | text | claude / copilot / codex / shell |
| mode | text | default / plan |
| working_directory | text | Resolved CWD |
| status | text | pending / running / completed / failed / killed |
| exit_code | integer | Process exit code |
| project_id | text | Associated project |
| project_name | text | |
| model | text | CLI model identifier |
| session_id | text | Claude session UUID; Codex thread ID |
| turn_count | integer | Number of turns (multi-turn Claude tasks) |
| created_at | text | ISO timestamp |
| started_at | text | When process started |
| completed_at | text | When process exited |

### task_logs table

| Column | Type | Notes |
|---|---|---|
| id | integer PK | Auto-increment |
| task_id | text FK | References tasks.id |
| stream | text | stdout / stderr |
| line | text | Single output line |
| timestamp | text | ISO timestamp |

### task_turns table

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| task_id | text FK | References tasks.id |
| turn_number | integer | 1-based turn index |
| role | text | user / assistant |
| content | text | Turn text content |
| created_at | text | ISO timestamp |

## REST Endpoint

```
GET /PocketDev/api/tasks
  → Authenticate request
  → Return 50 most recent tasks

GET /PocketDev/api/tasks/:id/logs
  → Return raw log lines for a task

GET /PocketDev/api/tasks/:id/turns
  → Return turn history for a task
```
