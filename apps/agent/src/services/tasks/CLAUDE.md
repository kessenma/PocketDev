# Task Services

## Files

| File | Lines | Purpose |
|---|---|---|
| `task-manager.ts` | ~144 | Entry point — routes start/continue/kill to the correct process class |
| `managed-agent-process.ts` | ~1146 | tmux-based process manager for Claude + Copilot |
| `managed-process.ts` | ~552 | stdio-based process manager for Codex + Shell |
| `task-stream-adapters.ts` | ~1057 | Protocol parsers: ClaudeTaskStreamAdapter + CodexTaskStreamAdapter |
| `plan-manager.ts` | ~194 | Plan lifecycle: propose, accept, deny, step updates |

## Agent Type Dispatch

| Agent | Process class | Config |
|---|---|---|
| `claude` | ManagedAgentProcess | `claudeProviderConfig()` |
| `copilot` | ManagedAgentProcess | `copilotProviderConfig()` |
| `codex` | ManagedProcess | JSON-RPC over stdio |
| `shell` | ManagedProcess | `sh -c prompt` |

## ManagedAgentProcess

tmux-based. Claude uses FILE mode + PANE mode; Copilot uses PANE mode only.

**TmuxProviderConfig interface:**
- `pollIntervalMs` — ms between poll iterations
- `panePollEvery` — poll ticks between pane captures
- `startupTimeoutMs` — time before aborting if provider never signals ready
- `tmuxWidth / tmuxHeight` — PTY dimensions
- `setup(ctx)` — launches the CLI inside tmux; returns `SetupResult`
- `createAdapter?(ctx)` — returns a `TaskStreamAdapter` for structured output parsing
- `onPaneSnapshot(snapshot, ctx)` — called on each pane capture; returns `PaneAction`
- `onFinish?(ctx, taskId)` — called when process exits; used to create plans, insert assistant turns

**FILE MODE** (Claude):
- `setup()` returns `outputFilePath` + `hooksFilePath`
- Poll loop reads new JSONL bytes from `/tmp/pocketdev-events-{taskId}.jsonl`
- Feeds each line to `ClaudeTaskStreamAdapter`
- tmux session exit detected → calls `finish()`

**PANE MODE** (Claude + Copilot):
- `setup()` may or may not return `outputFilePath`; pane always captured
- `tmux capture-pane -p` polled every `panePollEvery` ticks
- `onPaneSnapshot()` returns a `PaneAction`:
  - `continue` — nothing to do this tick
  - `complete` — provider signalled done; call `finish('completed')`
  - `send(text)` — send text to pane via `tmux send-keys -l`
  - `question(prompt, type, options, onAnswer)` — register a question with the client

**Claude specifics:**
- 220×50 tmux, 250ms poll, pane polled every 3 ticks (750ms), 120s idle timeout, 60s startup timeout
- Ready signal: `Claude Code v\d+\.\d+` in pane
- Prompt sent as single literal keystroke sequence via `tmux send-keys -l`
- TUI menu questions detected via `parseTuiPrompt` (parses `❯ 1. Yes  2. No` patterns)
- Hooks file: `PreToolUse`, `PostToolUse`, `Stop` — each appends a JSONL line; `Stop` fires `finish('completed')`
- `onFinish`: inserts assistant turn via `insertTaskTurn`, calls `createClaudePlan` if `mode === 'plan'`

**Copilot specifics:**
- 120×40 tmux, 1500ms poll, pane polled every tick, 10s idle timeout, 45s startup timeout
- Ready signal: "describe a task to get started" patterns in pane
- Trust prompt auto-accepted (Down + Enter)
- Idle = ready pattern visible + pane stable for 10s → `finish('completed')`

**Temp file cleanup:**
`scriptPath`, `hooksSettingsPath`, `hooksFilePath` deleted 5s after finish.

**Push notifications:**
`pushToAllDevices()` called on question registration (when no WS client connected) and on task completion.

**Public API:**
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

stdio-based. Used for Codex (JSON-RPC) and Shell (plain stdout).

- `Bun.spawn()` with piped stdin/stdout/stderr, `FORCE_COLOR: '0'`
- Kill: SIGTERM → SIGKILL after 5s
- Dev server port detection on every output line (regex: localhost URLs, "listening on port N")

**Codex startup sequence:**
1. Send `initialize` RPC request (stdin)
2. Receive `initialized` notification (stdout)
3. Send `thread/start` request
4. Receive response with thread ID → stored as `sessionId`
5. Send `turn/start` request with prompt

**Plan creation on finish:**
When `mode === 'plan'` and collected tool uses exist, calls `plan-manager.proposePlan()` which broadcasts `plan.proposed` to clients.

## task-stream-adapters.ts

Normalizes provider output into `TaskActivity`, `TaskQuestion`, and `PermissionDenial` objects.

**TaskStreamAdapterSink interface** (implemented by both process classes):
```typescript
emitOutput(line: string): void
emitActivity(activity: TaskActivity): void
emitQuestion(question: TaskQuestion, onAnswer: (answer: string) => void): void
emitPermissionRequest(denials: PermissionDenial[]): void
updateSessionId(id: string): void
recordCollectedToolUse(toolUse: CollectedToolUse): void
signalComplete?(): void
```

**ClaudeTaskStreamAdapter** — parses `--output-format stream-json` JSONL:

| Message type | Handled as |
|---|---|
| `system` | Captures `sessionId`; routes sub-agent `task_started/progress/completed` |
| `assistant` | Emits `thinking`, `text`, `tool_use` activities from content blocks |
| `user` | Emits `tool_result` activities |
| `result` | Fires `signalComplete()` |
| `rate_limit_event` | Silently consumed |

Permission requests: `permission_requests[]` array field on any message, OR top-level `type: 'permission'`.
Permission denials: `permission_denials[]` array field.

**CodexTaskStreamAdapter** — parses JSON-RPC 2.0 over stdio:

| Server request method | Question type emitted |
|---|---|
| `item/commandExecution/requestApproval` | permission |
| `item/fileChange/requestApproval` | permission |
| `item/permissions/requestApproval` | permission |
| `item/tool/requestUserInput` | free_response / multiple_choice / form |
| `mcpServer/elicitation/request` | auto-accepted (sends `{ action: 'accept' }`) |

Notifications consumed: `thread/started`, `turn/started`, `item/agentMessage/delta`, `item/reasoning/textDelta`, `item/started`, `item/completed`, `turn/completed`, `error`.

**Tool classification:**
`classifyToolUse(toolName, kind?)` maps provider-specific tool names to a shared `TaskToolKind`:
`read | search | write | create | run | agent | plan | mcp | web | image | info`

## DB Functions Used

| Function | Caller | Purpose |
|---|---|---|
| `insertTask` | task-manager.startTask | New task record |
| `insertTaskTurn` | task-manager, onFinish handlers | User + assistant turns |
| `resetTaskForContinuation` | task-manager.continueTask | Bump turnCount, reset status |
| `insertTaskLog` | ManagedAgentProcess, ManagedProcess | Raw log lines |
| `insertTaskFileTouch` | recordCollectedToolUse | Files touched per turn |
| `updateTaskStatus` | setStatus (both process classes) | Status transitions |

## Context-Limit Detection (Claude)

`managed-agent-process.ts` watches every pane snapshot for Claude's built-in context-window warning via:

```
CONTEXT_LIMIT_PATTERN = /context window.*(?:full|limit|approaching|at \d{2,3}%)|use \/compact|run \/compact/i
```

Fires at most once per task (guarded by `contextLimitWarned` flag). On match:
1. Broadcasts `task.output`: `[claude] Context window approaching limit`
2. Emits `task.question` (yes/no): "Claude's context window is nearly full. Run /compact to summarise and free space?"
3. If user answers `"yes"`, sends `/compact\n` to the tmux session via `tmux send-keys`

## WebSocket Commands (ws.ts)

| Type | Handler | Notes |
|---|---|---|
| `task.start` | `startTask()` | |
| `task.kill` | `killTask()` | |
| `task.input` | `proc.sendInput()` | Claude: tmux send-keys; Codex: stdin write |
| `task.answer` | `proc.answerQuestion()` | |
| `task.continue` | `continueTask()` | Claude/Codex only (requires `sessionId`) |
| `task.list` | `getTaskList()` | |

## task-manager.ts Key Functions

**`startTask(prompt, agentType, workingDirectory, model, mode)`**
- Inserts task record; records initial user turn for Claude (has `sessionId`)
- Routes `claude/copilot` → `ManagedAgentProcess`, `codex/shell` → `ManagedProcess`
- Returns `taskId`

**`continueTask(taskId, prompt, model)`**
- Only works on `completed/failed` Claude tasks with a `sessionId`
- Calls `insertTaskTurn` for user turn, `resetTaskForContinuation` to bump `turnCount`
- Spawns new `ManagedAgentProcess` with same `taskId`, `sessionId`, incremented `turnNumber`
- Returns `boolean` (false if task not found / wrong type)

**`buildCommand(agentType, prompt, model, mode, sessionId)`**
- Only used for `codex` and `shell` agents
- Claude/Copilot use `ManagedAgentProcess.provider.setup()` instead

## State Machine

Both process classes:
```
pending → running → completed (exit 0 / Stop hook / idle complete)
                  → failed (exit != 0 / error)
                  → killed (SIGTERM/SIGKILL)
```

`task.turn_started { taskId, turnNumber }` is broadcast when `turnNumber > 1` (continuation turns).
