# Mobile Task Flow

## Overview

PocketDev task execution is now provider-agnostic at the streaming layer. Mobile still starts tasks the same way, but the agent server normalizes Claude and Codex output into one shared task activity and question model before anything reaches the UI.

## Flow Diagram

```
NewTaskForm
  ├── Select provider + model
  ├── Pin repo context
  ├── Choose task mode
  └── Submit
      │
      ├── taskStore.startTask(prompt, agentType, cwd, model, mode)     [new task]
      │   └── ws.send('task.start', { prompt, agentType, workingDirectory, model, mode })
      │
      ├── taskStore.continueTask(taskId, prompt, model?)               [continuation]
      │   └── ws.send('task.continue', { taskId, prompt, model? })
      │
      └── Agent server spawns ManagedProcess
          │
          ├── Provider adapter parses CLI output
          │   ├── Claude: stream-json
          │   └── Codex: exec --json JSONL / JSON-RPC events
          │
          ├── Broadcast normalized events:
          │   ├── task.output
          │   ├── task.activity
          │   ├── task.question
          │   ├── task.permission_request
          │   ├── task.status_changed
          │   └── task.completed
          │
          └── Mobile renders one unified stream / interaction flow
```

## Agent Adapter Layer

Provider-specific parsing and response handling live on the server, not in mobile UI code.

- `ManagedProcess` owns process lifecycle, raw log capture, websocket broadcasting, and question responder registration.
- `task-stream-adapters.ts` maps provider output into:
  - normalized `TaskActivity` items
  - normalized `TaskQuestion` prompts
  - readable fallback log lines for raw output/history
- `task.answer` stays the mobile command, but the server now routes it through the correct registered responder instead of blindly writing stdin.

## Normalized Mobile Model

### Activities

Mobile consumes a shared `TaskActivity` union:

- `tool_use` — reads, searches, writes, shell commands, sub-agents, planning tools, MCP tools, web/image tools
- `tool_result` — summarized tool output or errors
- `thinking` — reasoning preview
- `text` — assistant text/content
- `status` — run/turn status markers

`TaskStreamer` uses provider-neutral `kind/title/detail` metadata when present and falls back to tool-name heuristics otherwise.

### Questions

Mobile consumes a shared `TaskQuestion` model:

- `permission`
- `yes_no`
- `multiple_choice`
- `free_response`
- `form`

This lets Claude permission prompts and Codex structured user-input requests render through the same `TaskInteractionSheet`.

## Mid-Task Interaction

While a task is running, `TaskDetailPane` exposes two input areas at the bottom of the screen:

```
TaskDetailPane (running)
  ├── [Quick Command Bar]  /compact | /clear | /init   ← Claude only
  └── [BauhausChatInput]  "Steer the agent..."         ← all running tasks
```

**Quick Command Bar** — Pill buttons for `/compact`, `/clear`, `/init`. Each tap sends the command string + newline via `sendInput(taskId, cmd + '\n')` → `task.input` WebSocket → `proc.sendInput()` → `tmux send-keys` (Claude) or stdin (Codex). Only shown for Claude tasks.

**Steering Input** — Free-text field. Submitted text is sent via `sendInput(taskId, text + '\n')`. Works for Claude (tmux) and Codex (stdin). Hidden once the task completes; the continuation input (`task.continue`) appears in its place for eligible tasks.

**Context-Limit Auto-Prompt** — Handled entirely server-side in `managed-agent-process.ts`. When Claude's pane output matches the context-window warning pattern, the server emits a `task.question` (yes/no: "Run /compact?"). `TaskInteractionSheet` surfaces it automatically; answering "yes" triggers `/compact` in the tmux session. No mobile-side changes required.

## Task Detail Behavior

`TaskDetailPane` remains the main task surface:

1. Status bar and task controls (kill button, raw-logs toggle, copy button, debug button on failure)
2. Prompt card (single-turn) or `TaskConversation` bubbles (multi-turn Claude)
3. Result card from normalized `text` activities when available
4. Pending approval summary for unresolved permission-style requests
5. Unified stream output (`TaskStreamerInline`) or raw logs
6. `TaskInteractionSheet` for live agent questions and context-limit prompts
7. Quick command bar + steering input while running; continue input after completion
8. `TaskDebugSheet` for auth/permission repair (failed tasks)

`TaskDetailPane` supports controlled-mode props for parent components (e.g. tablet workspace):
- `hideHeader?` / `hideStatusBar?` — layout control; parent renders its own header/controls
- `rawLogsActive?` / `onRawLogsToggle?` — parent-controlled raw log view toggle
- `copyTrigger?` / `onCopied?` — increment to imperatively trigger the copy menu

Completed-task history still relies on cached raw logs. Structured activities remain live/in-memory only.

## Multi-Turn Conversations

Completed Claude tasks can be continued with a follow-up message:

```
TaskDetailPane
  └── "Continue" input → continueTask(taskId, prompt, model?)
                              │
                              └── ws.send('task.continue', { taskId, prompt, model? })
                                        │
                                        ▼
                              Agent server: resetTaskForContinuation()
                              Spawns new ManagedAgentProcess (same taskId + sessionId)
                                        │
                              task.turn_started { taskId, turnNumber } ──► Mobile
                              ... task.activity / task.output stream ...
                              task.completed ──────────────────────────► Mobile
```

- `continueTask(taskId, prompt, model?)` in the store sends `task.continue` and optimistically appends the user's message to `taskTurns`
- `task.turn_started { taskId, turnNumber }` is broadcast at the start of each new turn when `turnNumber > 1`
- `taskTurns: Map<string, TaskTurn[]>` stores conversation history — loaded lazily via `loadTurnsForTask()` (SQLite cache → server `/tasks/:id/turns`)
- When `turn_count > 1`, `TaskDetailPane` renders `TaskConversation` (user/assistant bubble pairs) instead of the single prompt card
- Continuation is only available for Claude tasks — Codex, Copilot, and Shell are single-turn

## Debug Tools

Failed tasks surface a debug button in the `TaskDetailPane` status bar. Tapping it opens `TaskDebugSheet`.

**Automatic issue detection:**

`inferTaskDebugSelection(opts)` from `task-debug-utils.ts` inspects the task's logs, activities, and the workspace `PrerequisitesReport` to pre-select the most likely issue:

| Signal | Selection |
|---|---|
| Auth error patterns in logs/activities (401, token_expired, etc.) | `'auth'` |
| `report.tools[codex_cli].auth_status === 'unauthenticated'` | `'auth'` |
| `pendingPermissions.length > 0` | `'permissions'` |
| No signal | `null` (sheet opens without pre-selection) |

**Repair flows:**
- **Auth**: opens `CodexWizardSheet` in `auth_repair` mode — walks through re-authentication without reinstalling the CLI tool
- **Permissions**: placeholder; future repair tooling will live here

## Historical Replay

Historical task viewing is unchanged:

- tasks and raw logs are cached locally
- `loadLogsForTask()` falls back to the server when cache is missing
- raw logs remain the durable history source

The unified structured stream is intended for live task UX first; persistence of normalized activities is still out of scope.
