# Mobile Task Flow

## Overview

The task lifecycle flows from prompt creation through model selection, WebSocket dispatch, real-time streaming, and finally task completion display.

## Flow Diagram

```
NewTaskSheet (modal)
  ├── Select model provider (Claude/Codex)
  ├── Select model variant
  ├── Pin file context (from files store)
  ├── Write prompt
  └── Submit
      │
      ├── taskStore.startTask(prompt, agentType, cwd, model)
      │   └── ws.send('task.start', { prompt, agentType, workingDirectory, model })
      │
      └── Server spawns ManagedProcess
          │
          ├── task.output events → taskStore.appendLog()
          ├── task.status_changed events → taskStore.updateTaskStatus()
          └── task.completed event → final status
              │
              └── TaskDetailScreen / TaskDetailPane displays logs
```

## NewTaskSheet

**Source**: `src/components/tasks/NewTaskSheet.tsx`

Full-screen modal with sections:

1. **Model Provider** — `ModelSelector` component with provider chips + model list
2. **Pinned Files** — Badges showing context paths from files store
3. **Prompt** — Multiline TextInput (120-360px)
4. **Recent Prompts** — Pressable list from MMKV storage

### Prompt Construction

The submitted prompt includes full repo context:

```
You are working in the active PocketDev repository context.
Repository: {project name}
Workspace path: {root path}
Current folder: {current path}
Current file focus: {selected file}
Pinned file context:
- path/to/file1.ts
- path/to/file2.ts

User request:
{user's prompt text}
```

### Submit Logic

1. Trim prompt, validate non-empty
2. Save to recent prompts (MMKV, max 10)
3. Map provider to agent type (`'claude'` | `'codex'`)
4. Get CLI model ID from catalog
5. Call `taskStore.startTask(taskPrompt, agentType, rootPath, cliModelId)`
6. Call `submitDraft()` to reset draft
7. Close modal

### Availability Gating

Submit button disabled when:
- Prompt is empty
- Provider is `not_installed` or `installed_no_auth`

Button text changes to show the blocking reason.

## Model Selector

**Source**: `src/components/model-selector/`

### Provider Catalog

```
Claude:
  - Claude Opus 4.6 (200K context) → cli: 'opus'
  - Claude Opus 4.6 (1M context) → cli: 'claude-opus-4-6[1m]'
  - Claude Sonnet 4.6 (200K) → cli: 'sonnet'
  - Claude Sonnet 4.6 (1M) → cli: 'claude-sonnet-4-6[1m]'
  - Claude Haiku 4.5 (200K) → cli: 'haiku'

Codex:
  - GPT-5.4 → cli: 'gpt-5.4'
  - GPT-5.3 → cli: 'gpt-5.3'
  - GPT-5.3 Codex → cli: 'gpt-5.3-codex'
  - GPT-5.2 Codex → cli: 'gpt-5.2-codex'
  - GPT-5.2 → cli: 'gpt-5.2'
  - GPT-5.1 Codex Mini → cli: 'gpt-5.1-codex-mini'
```

### Capability Merging

On load, `NewTaskDraftStore.loadCapabilities()` fetches server capabilities and merges availability:

- `'available'` — Provider installed and authenticated
- `'not_installed'` — CLI not found on server
- `'installed_no_auth'` — CLI found but not authenticated

If current selection is unavailable, auto-selects first available provider.

## Task Store

**Source**: `src/stores/tasks.ts`

### State

```typescript
{
  tasks: Map<string, Task>        // By taskId
  activeTaskId: string | null
  taskLogs: Map<string, string[]> // By taskId
}
```

### startTask

1. Gets WebSocket from connection store: `useConnectionStore.getState().ws`
2. Sends typed message: `ws.send('task.start', { prompt, agent_type, working_directory, model })`
3. After 250ms delay, calls `refreshFromServer()` to get the new task record

### WebSocket Event Handling

Events routed by connection store's `handleWsMessage`:

| Event | Handler |
|---|---|
| `task.output` | `appendLog(task_id, data)` — appends line to `taskLogs` Map |
| `task.status_changed` | `updateTaskStatus(task_id, status)` — updates task in Map |
| `task.completed` | (handled via status_changed) |

### refreshFromServer

Fetches task list via REST API (`fetchTaskList`), rebuilds the tasks Map, validates activeTaskId still exists.

## New Task Draft Store

**Source**: `src/stores/new-task-draft.ts`

Persists draft to MMKV so it survives modal close/reopen:

- `prompt` — Current prompt text
- `selectedProviderId` — Default: `'claude'`
- `selectedModelId` — Default: `'claude-opus'`
- `providers` — Server-merged provider list (null until loaded)

## TaskDetailScreen / TaskDetailPane

**Source**: `src/screens/TaskDetailScreen.tsx`, `src/components/tasks/TaskDetailPane.tsx`

### Display

- Status badge with color (pending: gray, running: blue, completed: green, failed: red, killed: gray)
- Elapsed time counter
- Kill button (danger variant) for running tasks
- FlatList of log lines with auto-scroll

### Auto-Scroll Behavior

- Maintains auto-scroll when user is near bottom (within 50px)
- Disables auto-scroll when user scrolls up manually
- "Scroll to bottom" button re-enables auto-scroll

### Task Detail in Tablet Split

On `tabletSplit` layout, `TaskWorkspace` renders task list and detail side-by-side. Selecting a task in the list updates `activeTaskId`, which the detail pane reads.
