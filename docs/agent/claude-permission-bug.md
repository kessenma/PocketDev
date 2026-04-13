# Claude Permission Prompt Bug — Investigation

## Symptom

When Claude asks for permission to write a file, the mobile permission sheet appears but the task fails ~300ms later — long before the user can tap Allow. Even tapping Allow after 30 seconds has no effect because the task is already dead.

Mobile logs:
```
[ws] task.question received | type=permission t=1776044751054
[ws] task.status_changed → failed | pendingQuestions=1 t=1776044751357
```
303ms between question and failure. The process did not wait.

---

## Root Cause

### How Claude is launched today

The `claudeProviderConfig.setup()` writes a bash script like:

```bash
#!/bin/bash
export POCKETDEV_PROMPT=$(cat '/tmp/pocketdev-prompt-{taskId}.txt')
cd '/path/to/project'
claude --output-format stream-json --permission-mode default --verbose -p "$POCKETDEV_PROMPT" \
  >> '/tmp/pocketdev-out-{taskId}.jsonl' 2>&1
```

The critical flag is `-p "$POCKETDEV_PROMPT"`. The `-p` flag activates **non-interactive mode** in Claude Code.

### What `-p` mode does to permissions

From the Claude Code docs:

> "In non-interactive mode with the -p flag, repeated blocks abort the session since there is no user to prompt."

In `-p` mode, Claude Code cannot wait for a human to approve a permission. It has no interactive session. So when a `--permission-mode default` tool use hits a permission gate, Claude Code **immediately denies it** rather than waiting.

The JSONL stream reflects this: instead of a `permission_requests` event (which means "I am waiting for your answer"), Claude emits `permission_denials` (which means "I already denied this, just notifying you"). Both look like questions to our stream adapter, but `permission_denials` are post-hoc notifications — the tool was already blocked.

### Why the question appears on mobile anyway

`task-stream-adapters.ts` has two handlers:

```typescript
// Format: Claude IS waiting → send y/n via stdin
handlePermissionRequests(message)   // permission_requests field

// Format: Claude ALREADY denied → stdin write does nothing
handlePermissionDenials(message)    // permission_denials field
```

Both call `emitQuestion` and register an `onAnswer` that writes to Claude's stdin. But for `permission_denials`, Claude has already moved on — writing stdin does nothing.

The mobile user sees the permission sheet and taps Allow, but there is no Claude process listening for that answer.

---

## What Needs to Change

The fix is to stop using `-p` and run Claude **interactively inside tmux**, like Copilot. In interactive mode:

- Claude Code starts and shows its TUI
- We send the prompt via `tmux send-keys -l "prompt" Enter` once Claude is ready
- When Claude hits a permission gate, it **pauses in the TUI** with a numbered menu (❯ 1. Yes  2. No ...)
- `parseTuiPrompt()` detects this, sends the question to mobile
- User taps Allow → we send `1 Enter` via `tmux send-keys`
- Claude resumes

This is already how `copilotProviderConfig` works (wait for TUI ready, send prompt, poll pane).

### Key differences for interactive Claude mode

| Concern | Current (-p mode) | New (interactive mode) |
|---|---|---|
| Prompt delivery | `-p "$PROMPT"` arg | `tmux send-keys -l "$PROMPT" Enter` after TUI ready |
| Structured output | JSONL to file (stdout redirected) | JSONL still works — stdout can still be redirected; TTY is separate |
| Permission handling | `permission_denials` (post-hoc) | TUI ❯ menu → `parseTuiPrompt` detects and waits |
| Completion signal | Session exit | Session exit (same) |

### Stdout redirect is still possible in interactive mode

tmux gives Claude a real PTY. Claude's `--output-format stream-json` writes JSONL to stdout. We can still redirect stdout to the JSONL file in the bash wrapper while keeping the PTY (and thus the TUI) on the tmux terminal:

```bash
#!/bin/bash
# Stdout → JSONL file; stderr → TTY (TUI renders on PTY)
exec claude --output-format stream-json --permission-mode default --verbose \
  --session-id '...' --model 'haiku' \
  >> '/tmp/pocketdev-out-{taskId}.jsonl'
# Note: NO -p flag. Prompt will be sent via tmux send-keys.
```

Then in `onPaneSnapshot`, add a "Claude ready" detection (similar to Copilot's `isCopilotReady`) to know when to send the prompt. Claude Code's TUI shows something like `>` or a prompt indicator when ready for input.

### Plan mode note

Plan mode (`--permission-mode plan`) has the same root problem: it uses `ExitPlanMode` which also requires interactive mode. If we switch to interactive mode, plan mode should also work correctly through the TUI (Claude shows a numbered menu after planning, user picks "approve and execute" or "exit without executing").

---

## Files to Change

| File | Change |
|---|---|
| `apps/agent/src/services/tasks/managed-agent-process.ts` | `claudeProviderConfig.setup()` — remove `-p` flag, keep stdout redirect; add Claude-ready detection in `onPaneSnapshot`; send prompt via tmux after ready |
| `apps/agent/src/services/tasks/task-stream-adapters.ts` | `handlePermissionDenials` can be removed or simplified — in interactive mode, permissions go through TUI, not JSONL stream |

`ManagedAgentProcess` class itself needs no changes — the provider config handles the difference.

---

## Evidence Summary

1. Task question emitted at T, task failed at T+303ms — Claude did not wait
2. Output line: `[error] Claude requested permissions to write to ... but you haven't granted it yet.` — this error comes from Claude immediately, not from a timeout
3. The `handlePermissionDenials` path in `task-stream-adapters.ts` confirms Claude is emitting denials (not requests) — the gate was already closed before mobile rendered
4. The `-p` flag in the bash script is the proximate cause — it puts Claude in non-interactive mode where it cannot pause for permission

---

## References

- Claude Code permission modes: https://code.claude.com/docs/en/permission-modes
- `apps/agent/src/services/tasks/managed-agent-process.ts` — `claudeProviderConfig` (lines 239–336)
- `apps/agent/src/services/tasks/task-stream-adapters.ts` — `handlePermissionRequests` / `handlePermissionDenials` (lines 217–290)
