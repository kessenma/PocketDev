# Task System

PocketDev tasks run AI CLI providers on the agent server and stream a normalized event model to mobile. Claude and Codex now share the same task activity, question, and completion flow.

## Screens

| Screen | File | Purpose |
|---|---|---|
| TasksScreen | `screens/TasksScreen.tsx` | Task list with FAB to create new tasks. Phone uses `TaskListPane`; tablet uses `TaskWorkspace`. |
| NewTaskScreen | `screens/NewTaskScreen.tsx` | Thin wrapper around `NewTaskForm`. |
| TaskDetailScreen | `screens/TaskDetailScreen.tsx` | Full-screen task output view for phone navigation. |

## Components

| Component | File | Purpose |
|---|---|---|
| TaskListPane | `tasks/TaskListPane.tsx` | FlatList of task cards with pull-to-refresh and recent prompts. |
| TaskWorkspace | `tasks/TaskWorkspace.tsx` | Tablet split view with list and detail panes. |
| TaskDetailPane | `tasks/TaskDetailPane.tsx` | Status bar, prompt, result, approvals, and live stream. |
| TaskStreamer | `tasks/TaskStreamer.tsx` | Renders normalized activities or raw logs with provider-neutral tool categories. |
| TaskInteractionSheet | `tasks/TaskInteractionSheet.tsx` | Bottom sheet for approvals and structured agent questions. |
| NewTaskForm | `tasks/NewTaskForm.tsx` | Prompt input, provider selector, context picker, task mode, and AI file suggestions. |
| AISuggestions | `tasks/AISuggestions.tsx` | On-device file suggestions for the prompt. |
| FindFilesButton | `tasks/FindFilesButton.tsx` | Trigger for local file search. |
| TaskConversation | `tasks/TaskConversation.tsx` | User/assistant turn bubbles for multi-turn Claude tasks. Receives `turns: TaskTurn[]`. |
| TaskDebugSheet | `tasks/TaskDebugSheet.tsx` | Modal bottom sheet for selecting a debug issue (`auth` / `permissions`) and triggering repair (auth → CodexWizardSheet). |
| ActivityCards | `tasks/ActivityCards.tsx` | `GroupedItemRow` dispatcher + `ActivityCard` (collapsible category cards) + `ChecklistCard` (TodoWrite checklist with per-item status icons) + `ResultCard` (markdown result). Categories: researching/writing/planning/running. |

## Utilities

| File | Purpose |
|---|---|
| `tasks/task-stream-utils.ts` | `groupActivitiesIntoCards()`, `getToolPresentation()`, `parseCodexRawLogToActivity()`, `extractLatestTodos()` — shared logic between `TaskStreamer` and `ActivityCards` |
| `tasks/task-debug-utils.ts` | `inferTaskDebugSelection()` — inspects task logs/activities/report to pre-select the most likely debug issue. Types: `TaskDebugIssueKind`, `TaskDebugSelection` |

## Task Checklist and Progress Strip

When an agent calls `TodoWrite` (Claude) or `update_plan` (Codex), the activity stream renders a collapsible `ChecklistCard` instead of a plain planning card. Each item shows a status icon (Circle = pending, Loader = in progress, CheckCircle2 = completed) and strikethrough text for completed items.

`extractLatestTodos(activities)` scans the activities array backwards for the most recent plan `tool_use` with a `metadata.todos` array. `TaskDetailPane` calls this to derive `todoProgress: { done, total } | null`, which drives a slim 3px progress strip rendered between the status bar and the stream list. Neither the checklist card nor the progress strip appear for tasks that never call TodoWrite.

## Mid-Task Interaction

While a task is running, `TaskDetailPane` renders two interactive elements at the bottom of the screen:

### Quick Command Bar (Claude only)

A horizontal pill-button strip shown when `isRunning && task.agent_type === 'claude'`. Buttons: `/compact`, `/clear`, `/init`. Each tap calls `sendInput(taskId, cmd + '\n')` via the `task.input` WebSocket command, which the server routes to `proc.sendInput()` → `tmux send-keys`.

### Steering Input (all running tasks)

`BauhausChatInput` shown when `isRunning`. Placeholder: "Steer the agent…". On send, calls `sendInput(taskId, text + '\n')` — raw stdin injection for Claude (tmux) and Codex (process stdin). Mutually exclusive with the continue input (which only appears after completion).

### Context-Limit Detection (server-side, no mobile code required)

`managed-agent-process.ts` watches every pane snapshot for Claude's context-window warning text via `CONTEXT_LIMIT_PATTERN`. When matched (once per task):

1. Broadcasts `task.output` log: `[claude] Context window approaching limit`
2. Emits `task.question` (yes/no type): "Claude's context window is nearly full. Run /compact to summarise and free space?"
3. `TaskInteractionSheet` renders it automatically as a standard yes/no question
4. If the user answers "yes", the server sends `/compact\n` to the Claude tmux session

No mobile-side changes are needed for this feature — it flows through the existing question/answer infrastructure.

## TaskDetailPane Controlled Props

`TaskDetailPane` accepts controlled-mode props for parent components that own some of the UI state:

| Prop | Type | Purpose |
|---|---|---|
| `hideHeader?` | boolean | Hides the entire header/prompt area |
| `hideStatusBar?` | boolean | Hides the status bar row (parent renders its own controls) |
| `rawLogsActive?` | boolean | Parent-controlled raw log toggle state |
| `onRawLogsToggle?` | () => void | Callback when user taps the raw log toggle |
| `copyTrigger?` | number | Increment to imperatively trigger the copy menu |
| `onCopied?` | () => void | Fires after a successful clipboard copy |

## Data Flow

### Live Task Execution
```
NewTaskForm -> startTask() -> WebSocket 'task.start'
                                   |
                                   v
                     Agent runner + provider adapter
                                   |
                                   v
                    WebSocket events stream back:
                    |- task.output            raw fallback logs
                    |- task.activity          normalized activities
                    |- task.status_changed    task state updates
                    |- task.permission_request approval prompts
                    |- task.question          structured input prompts
                    '- task.completed         terminal status
                                   |
                                   v
                    TaskDetailPane / TaskStreamer render
```

### Historical Task Viewing
```
App opens -> refreshFromServer()
         |- Load cached tasks from local SQLite
         '- Fetch task list from server

Open completed task -> loadLogsForTask()
         |- Load cached raw logs from local SQLite if present
         '- Otherwise fetch /tasks/:id/logs and cache locally
```

Structured activities and pending questions stay in memory for the active session. Historical replay still uses raw logs.

## Store Model

Task state lives in `stores/tasks.ts`.

| Field | Type | Persistence |
|---|---|---|
| `tasks` | `Map<string, Task>` | Local SQLite plus server refresh |
| `taskLogs` | `Map<string, string[]>` | Local SQLite plus server |
| `taskActivities` | `Map<string, TaskActivity[]>` | In-memory only |
| `pendingPermissions` | `Map<string, PermissionDenial[]>` | In-memory only |
| `pendingQuestions` | `Map<string, TaskQuestion[]>` | In-memory only |
| `taskTurns` | `Map<string, TaskTurn[]>` | Local SQLite + server (`/tasks/:id/turns`) |
| `activeTaskId` | `string \| null` | In-memory only |

## Store Actions

Key actions beyond simple setters:

| Action | Purpose |
|---|---|
| `startTask(prompt, agentType, cwd?, model?, mode?)` | Sends `task.start`; polls server 2× (500ms/2s) to load initial task state |
| `continueTask(taskId, prompt, model?)` | Sends `task.continue`; Claude only; optimistically adds user turn to `taskTurns` |
| `killTask(id)` | Sends `task.kill` |
| `loadLogsForTask(taskId)` | Loads raw logs from SQLite cache, falls back to server |
| `loadTurnsForTask(taskId)` | Loads turn history from SQLite cache, falls back to server `/tasks/:id/turns` |
| `answerQuestion(taskId, questionId, answer)` | Sends `task.answer`; removes question from queue |
| `refreshFromServer()` | Syncs task list; upserts to SQLite; prunes to 100 tasks |

## Wire Protocol

### Commands

| Type | Payload | Purpose |
|---|---|---|
| `task.start` | `{ prompt, agentType, workingDirectory?, model?, mode? }` | Start a task with the selected provider. |
| `task.continue` | `{ taskId, prompt, model? }` | Continue a completed Claude task with a follow-up message. |
| `task.kill` | `{ taskId }` | Kill a running task. |
| `task.input` | `{ taskId, data }` | Send raw stdin to the process. |
| `task.answer` | `{ taskId, questionId, answer }` | Answer a provider prompt via the registered responder. |

### Events

| Type | Payload | Purpose |
|---|---|---|
| `task.output` | `{ taskId, stream, line }` | Raw log line fallback. |
| `task.activity` | `{ taskId, activity, timestamp }` | Normalized task activity. |
| `task.status_changed` | `{ taskId, status }` | Status transition. |
| `task.permission_request` | `{ taskId, denials[] }` | Approval request details. |
| `task.question` | `{ questionId, taskId, prompt, type, options?, fields?, toolDetails? }` | Structured agent question. |
| `task.completed` | `{ taskId, exitCode, status }` | Task finished. |
| `task.turn_started` | `{ taskId, turnNumber }` | New turn starting (multi-turn continuation). |

## Normalized Activity Model

`TaskStreamer` renders a provider-neutral activity union:

| Type | Purpose |
|---|---|
| `tool_use` | A tool call with provider metadata, normalized kind, title, and detail text. |
| `tool_result` | The result of a tool call, including error state when available. |
| `thinking` | Reasoning or planning text. |
| `text` | User-visible assistant output. |
| `status` | Status markers emitted during task execution. |

Tool presentation groups provider-specific names into shared categories such as read, search, write, create, run, plan, agent, MCP, and image work.

## Questions And Approvals

The interaction sheet renders one queue of normalized prompts:

| Type | Use |
|---|---|
| `permission` | Approval for command execution, file changes, or elevated actions. |
| `yes_no` | Simple confirmation. |
| `multiple_choice` | Single-question option selection. |
| `free_response` | Text answer. |
| `form` | Multi-field structured input, used when a provider asks several questions at once. |

Providers own how answers are sent back to the running CLI. Mobile only sends `task.answer` with `questionId` and the user response.

## Result Rendering

`TaskDetailPane` prefers normalized `text` activities when showing the task result. If no structured text exists, it falls back to raw logs.

## Debug Tools

`TaskDebugSheet` + `task-debug-utils.ts` provide a structured debug flow for failed tasks.

`inferTaskDebugSelection(opts)` inspects `{ task, logs, activities, pendingPermissions, report }` and returns the most likely `TaskDebugIssueKind`:
- `'auth'` — matched auth failure patterns in logs/activities, or `report.tools[codex_cli].auth_status === 'unauthenticated'`
- `'permissions'` — `pendingPermissions.length > 0`
- `null` — no signal found

When the debug sheet opens, it pre-selects the inferred issue. Continuing with `'auth'` opens `CodexWizardSheet` (Codex) in `auth_repair` mode for re-authentication without reinstall. The `'permissions'` path is a placeholder for future repair tooling.

The debug sheet also auto-opens when an auth error is detected in a live running task (1.5 s debounce to avoid flashing on first output lines).

## Context Limit Detection

For Claude tasks, `onPaneSnapshot` in `managed-agent-process.ts` monitors the pane for the `CONTEXT_LIMIT_PATTERN` regex. When matched (once per task, via `contextLimitWarned` flag), it broadcasts a status line and surfaces a `yes_no` question — "Run /compact?" — via the normal question flow. If the user answers yes, `/compact` + Enter is sent to the tmux session. On mobile, this appears as a standard interaction sheet prompt.

## Persistence

See `db/CLAUDE.md` for local SQLite caching details. The local database stores tasks, raw logs, and turn history for offline access; normalized activity data is transient and rebuilt live from the current run.
