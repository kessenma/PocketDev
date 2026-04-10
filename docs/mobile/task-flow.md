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
      ├── taskStore.startTask(prompt, agentType, cwd, model, mode)
      │   └── ws.send('task.start', { prompt, agentType, workingDirectory, model, mode })
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

## Task Detail Behavior

`TaskDetailPane` remains the main task surface:

1. Status bar and task controls
2. Prompt or multi-turn conversation
3. Result card from normalized `text` activities when available
4. Pending approval summary for unresolved permission-style requests
5. Unified stream output (`TaskStreamerInline`) or raw logs
6. `TaskInteractionSheet` for live agent questions

Completed-task history still relies on cached raw logs. Structured activities remain live/in-memory only.

## Historical Replay

Historical task viewing is unchanged:

- tasks and raw logs are cached locally
- `loadLogsForTask()` falls back to the server when cache is missing
- raw logs remain the durable history source

The unified structured stream is intended for live task UX first; persistence of normalized activities is still out of scope.
