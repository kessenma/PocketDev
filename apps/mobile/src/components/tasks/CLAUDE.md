# Task System

Core feature of PocketDev — launching AI coding tasks (Claude, Codex, Copilot) on remote servers and streaming their output to mobile.

## Screens

| Screen | File | Purpose |
|---|---|---|
| TasksScreen | `screens/TasksScreen.tsx` | Task list with FAB to create new tasks. Phone: `TaskListPane`, tablet: `TaskWorkspace` (split view) |
| NewTaskScreen | `screens/NewTaskScreen.tsx` | Thin wrapper around `NewTaskForm` |
| TaskDetailScreen | `screens/TaskDetailScreen.tsx` | Full-screen task output view (phone stack route) |

## Components

| Component | File | Purpose |
|---|---|---|
| TaskListPane | `tasks/TaskListPane.tsx` | FlatList of task cards with pull-to-refresh, recent prompts header |
| TaskWorkspace | `tasks/TaskWorkspace.tsx` | Tablet split view — TaskListPane (leading) + TaskDetailPane (trailing) |
| TaskDetailPane | `tasks/TaskDetailPane.tsx` | Main task view: status bar, prompt card, result card, permissions, stream output |
| TaskStreamer | `tasks/TaskStreamer.tsx` | Renders structured activities or raw logs as icon-coded rows. Has `TaskStreamerInline` for embedding in ScrollView |
| TaskInteractionSheet | `tasks/TaskInteractionSheet.tsx` | Bottom sheet for AI CLI questions: permission grant, yes/no, multiple choice, free response |
| NewTaskForm | `tasks/NewTaskForm.tsx` | Prompt input, model selector, file context picker, task mode, AI file suggestions |
| AISuggestions | `tasks/AISuggestions.tsx` | On-device AI file suggestions for the prompt |
| FindFilesButton | `tasks/FindFilesButton.tsx` | Button to trigger on-device file search |

## Data Flow

### Live Task Execution
```
NewTaskForm → startTask() → WebSocket 'task.start'
                                    ↓
                          Agent spawns CLI process
                                    ↓
                    WebSocket events stream back:
                    ├── task.output    → appendLog() → raw logs
                    ├── task.activity  → appendActivity() → structured activities
                    ├── task.status_changed → updateTaskStatus()
                    ├── task.permission_request → addPermissionRequest()
                    ├── task.question  → addQuestion() → TaskInteractionSheet
                    └── task.completed → final status
                                    ↓
                    TaskDetailPane / TaskStreamer renders
```

### Historical Task Viewing
```
App opens → refreshFromServer()
         ├── Load cached tasks from local SQLite (instant)
         └── Fetch from server API (background update)
                    ↓
Tap into completed task → loadLogsForTask()
         ├── Check local SQLite for cached logs
         ├── If cached → populate taskLogs map → render
         └── If not → GET /tasks/:id/logs → cache to SQLite → render
```

## Task Store (`stores/tasks.ts`)

### State
| Field | Type | Persistence |
|---|---|---|
| tasks | `Map<string, Task>` | SQLite (local DB) + server |
| taskLogs | `Map<string, string[]>` | SQLite (on completion) + server |
| taskActivities | `Map<string, TaskActivity[]>` | In-memory only (live streaming) |
| pendingPermissions | `Map<string, PermissionDenial[]>` | In-memory only |
| pendingQuestions | `Map<string, TaskQuestion[]>` | In-memory only |
| activeTaskId | `string \| null` | In-memory only |

### Key Actions
- `refreshFromServer()` — fetch task list, cache to SQLite, update in-memory
- `loadLogsForTask(taskId)` — load logs from SQLite cache or fetch from server
- `startTask(prompt, agentType, ...)` — send via WebSocket, refresh after delay
- `appendLog / appendActivity` — called by WebSocket handler during streaming
- `updateTaskStatus` — on terminal state, caches logs to SQLite

## Wire Protocol

### Commands (mobile → server)
| Type | Payload | Purpose |
|---|---|---|
| task.start | `{ prompt, agentType, workingDirectory?, model?, mode? }` | Start a new task |
| task.kill | `{ taskId }` | Kill running task |
| task.input | `{ taskId, data }` | Send stdin to process |
| task.answer | `{ taskId, questionId, answer }` | Answer an AI CLI question |

### Events (server → mobile)
| Type | Payload | Purpose |
|---|---|---|
| task.output | `{ taskId, stream, line }` | Raw log line |
| task.activity | `{ taskId, activity, timestamp }` | Structured activity event |
| task.status_changed | `{ taskId, status }` | Status update |
| task.permission_request | `{ taskId, denials[] }` | Tool permission denied |
| task.question | `{ questionId, taskId, prompt, type, options?, toolDetails? }` | AI CLI asking a question |
| task.completed | `{ taskId, exitCode, status }` | Task finished |

## TaskActivity Types

Discriminated union — each type renders differently in TaskStreamer:

| Type | Icon | Display |
|---|---|---|
| tool_use (Edit/Write) | FileEdit/FilePlus | Yellow accent, file path |
| tool_use (Read/Glob/Grep) | FileSearch/Search | Blue accent, path/pattern |
| tool_use (Bash) | Terminal | Green accent, command preview |
| tool_use (Agent) | Users | Purple accent, description |
| tool_result | (indented) | Error: red tint, otherwise dimmed |
| thinking | Brain | Italic, dimmed preview |
| text | MessageSquare | Full body text (AI's response) |
| status | BauhausBadge | Status pill |

## TaskDetailPane Layout

Everything inside a single ScrollView for unified scrolling:
1. **Status bar** (fixed top): status badge, elapsed time, copy button, raw log toggle, kill button
2. **Prompt card**: extracted user request (strips PocketDev context preamble)
3. **Result card** (completed tasks only): AI's text response prominently displayed
4. **Permission card** (if denied): tool list + re-run with auto-approve
5. **Stream output**: TaskStreamerInline (activities or raw logs)
6. **TaskInteractionSheet**: auto-shows as modal when AI asks questions

## Persistence

See `db/CLAUDE.md` for the local SQLite database architecture. Tasks and logs are cached locally for offline access, with server as source of truth.
