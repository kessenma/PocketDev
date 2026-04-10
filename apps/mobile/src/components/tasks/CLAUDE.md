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
| `activeTaskId` | `string \| null` | In-memory only |

## Wire Protocol

### Commands

| Type | Payload | Purpose |
|---|---|---|
| `task.start` | `{ prompt, agentType, workingDirectory?, model?, mode? }` | Start a task with the selected provider. |
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

## Persistence

See `db/CLAUDE.md` for local SQLite caching details. The local database stores tasks and raw logs for offline access; normalized streaming data is transient and rebuilt live from the current run.
