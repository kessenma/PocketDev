# Agent Process Execution

## Overview

PocketDev runs AI agent CLIs in two different ways depending on whether they are interactive TUI tools or structured stdio tools:

| Transport | Agents | Class |
|---|---|---|
| **node-pty** | Claude, Copilot, Minimax | `ManagedAgentProcess` |
| **Bun.spawn stdio** | Codex, Shell | `ManagedProcess` |

This document covers the node-pty path in detail. For the Bun.spawn path see [task-system.md](./task-system.md).

## Why node-pty for TUI Agents

Claude Code, GitHub Copilot CLI, and opencode (Minimax) are interactive terminal applications — they render TUI menus, detect terminal capabilities, and behave differently depending on whether they have a real PTY. Running them with piped stdin/stdout breaks their TUI rendering. node-pty gives them a full PTY so they behave exactly as they do when run interactively in a terminal.

## ManagedAgentProcess

**Source**: `apps/agent/src/services/tasks/managed-agent-process/`

### Key components

| File | Purpose |
|---|---|
| `managed-agent-process.ts` | Main class: PTY lifecycle, debounced snapshots, hooks polling |
| `pty-runner.ts` | Thin node-pty wrapper (`PtyRunner`) |
| `types.ts` | `AgentProviderConfig`, `SetupCtx`, `SetupResult`, `PaneCtx`, `PaneAction`, `FinishCtx` |
| `claude-provider.ts` | `claudeProviderConfig()` |
| `copilot-provider.ts` | `copilotProviderConfig()` |
| `minimax-provider.ts` | `minimaxProviderConfig()` |
| `utils.ts` | `normalizePane`, `shellEscape`, `exec`, `newUUID` |
| `hook-events.ts` | `parseHookEvent`, `extractToolDetail`, `extractToolResultPreview` |
| `pane-activity.ts` | `parsePaneLineToActivity`, `isPaneChromeOnly`, `spinnerKey` |
| `tui-prompt.ts` | `parseTuiPrompt` — parses `❯ 1. Yes  2. No` menus |

### Execution flow

```
ManagedAgentProcess.start()
  │
  ├── provider.setup(ctx)
  │     └── writes bash script to /tmp/pocketdev-run-{taskId}.sh
  │         returns { command: scriptPath, hooksFilePath?, tempFiles? }
  │
  ├── PtyRunner.spawn(scriptPath, { cols, rows, cwd, env })
  │     └── node-pty forks a PTY process running the bash script
  │
  ├── onData handler fires on each PTY chunk
  │     ├── sets receivedFirstData = true
  │     ├── if forwardRawOutput: strip ANSI, emit lines to broadcastOutput
  │     └── append to ptyBuffer; schedule debounce (150ms)
  │
  ├── debounce fires → processPtySnapshot()
  │     ├── normalizePane(ptyBuffer) → cleaned snapshot string
  │     └── provider.onPaneSnapshot(snapshot, ctx) → PaneAction
  │           ├── 'continue' — nothing to do
  │           ├── 'complete' — call finish(status)
  │           ├── 'send' — PtyRunner.writeLine(keys)
  │           └── 'question' — register question, broadcast task.question
  │
  ├── poll() fires every pollIntervalMs
  │     ├── pollHooksFile() — read new JSONL lines from hooksFilePath (Claude only)
  │     │     └── each line → parseHookEvent → hook actions (Stop → finish)
  │     └── startup timeout check: if !receivedFirstData after startupTimeoutMs → fail
  │
  └── onExit handler fires when PTY process exits
        └── finish(exitCode === 0 ? 'completed' : 'failed')
```

### AgentProviderConfig interface

```typescript
interface AgentProviderConfig {
  pollIntervalMs: number       // ms between poll() calls
  startupTimeoutMs: number     // fail if no PTY data received within this time
  ptyWidth: number
  ptyHeight: number
  forwardRawOutput?: boolean   // emit ANSI-stripped PTY lines in real-time

  // Write a bash script, return its path + optional hooks config
  setup(ctx: SetupCtx): Promise<SetupResult>

  // Optional: parse structured JSON output into TaskActivity events
  createAdapter?(taskId: string, sink: TaskStreamAdapterSink, writeStdin: (d: string) => void): TaskStreamAdapter

  // Called on each debounced PTY snapshot
  onPaneSnapshot(snapshot: string, ctx: PaneCtx): Promise<PaneAction> | PaneAction

  // Called after the PTY exits
  onFinish?(ctx: FinishCtx, taskId: string): void
}
```

### SetupCtx and SetupResult

```typescript
interface SetupCtx {
  taskId: string
  prompt: string
  cwd: string
  model: string | null
  mode: 'default' | 'plan'
  sessionId: string | null
  turnNumber: number
}

interface SetupResult {
  command: string         // absolute path to the bash script to run
  hooksFilePath?: string  // JSONL file to poll for hook events (Claude only)
  tempFiles?: string[]    // deleted 5s after finish
}
```

`setup()` always writes a bash script rather than returning a raw command string. This ensures `process.stdout.isTTY` is true inside the script (node-pty provides a real PTY), which is required for interactive TUI rendering.

### PaneCtx

```typescript
interface PaneCtx {
  taskId: string
  prompt: string
  promptSent: boolean        // true after the prompt has been delivered to the PTY
  lastChangeMs: number       // ms since last PTY data
  registerQuestion(q, onAnswer): void
  broadcastOutput(line: string): void
  sendLine(text: string): void      // writes text + newline to PTY
  sendRaw(bytes: string): void      // writes raw bytes to PTY (ANSI sequences, control chars)
  sendMenuSelection(n: number): void // Down × n, then Enter
}
```

## Claude Provider

**Source**: `managed-agent-process/claude-provider.ts`

Claude is the most instrumented provider. Its setup writes three files:

1. **Bash script** (`/tmp/pocketdev-run-{taskId}.sh`) — sets PATH, cds to working dir, runs `claude --permission-mode <mode> --settings <hooksSettings> [--resume|--session-id] [--model] -p <prompt>`
2. **Hooks settings** (`/tmp/pocketdev-hooks-{taskId}.json`) — registers `PreToolUse`, `PostToolUse`, and `Stop` hooks that append JSONL to the hooks file
3. **Hooks file** (`/tmp/pocketdev-events-{taskId}.jsonl`) — created empty; appended to by hook commands

### Hooks file polling

`poll()` reads new bytes from the hooks file every tick. Each JSONL line is parsed by `parseHookEvent()`:

| Hook event `type` | Effect |
|---|---|
| `PreToolUse` | Extracts tool name + input → emits `task.activity` (tool_use) |
| `PostToolUse` | Extracts tool result preview → emits `task.activity` (tool_result) |
| `Stop` | Calls `finish('completed')` immediately |

The `Stop` hook is the primary completion signal — it fires as soon as Claude finishes, before the 120s idle timeout would trigger.

### Completion signals (in priority order)

1. **Stop hook** — fires immediately when Claude signals done
2. **"Worked for Xm Xs"** pattern in PTY snapshot — fires before idle timeout
3. **120s idle timeout** — fallback if hooks file never receives a Stop event

### Session management

- First turn: `--session-id <uuid>` assigns a fixed session ID to the Claude process
- Subsequent turns: `--resume <uuid>` resumes the same session
- Session ID is also stored in the DB task record for cross-turn continuity

## Copilot Provider

**Source**: `managed-agent-process/copilot-provider.ts`

Copilot (`gh copilot`) is an interactive TUI. Its `setup()` writes a bash script that runs `gh copilot suggest` or similar. `forwardRawOutput: true` means every ANSI-stripped PTY line is emitted to mobile in real-time.

Completion is detected by the pane snapshot: when the ready pattern is visible and the pane has been stable for 10s, `onPaneSnapshot` returns `{ type: 'complete', status: 'completed' }`.

A trust dialog prompt is auto-accepted by sending a Down arrow + Enter if detected in the snapshot.

## Minimax Provider

**Source**: `managed-agent-process/minimax-provider.ts`

Minimax uses `opencode` as the backing CLI. Its `setup()` writes a script running:
```bash
opencode run -m <model> --prompt <prompt>
```

`forwardRawOutput: true` streams output to mobile. `onPaneSnapshot` always returns `{ type: 'continue' }` — completion is handled by `onPtyExit` (the process exits naturally when done).

No structured adapter; no turn recording.

## Bun.spawn Agents (Codex, Shell)

Codex and Shell do not need PTY support — Codex uses a clean JSON-RPC protocol over stdio, and Shell is just `sh -c`. Both go through `ManagedProcess` (Bun.spawn with piped stdin/stdout/stderr).

See [task-system.md — ManagedProcess](./task-system.md#managedprocess) for details.

## forwardRawOutput

When `forwardRawOutput: true`, the `onPtyData` handler does extra work before buffering for the debounce:

```
chunk arrives from PTY
  │
  ├── append to forwardRawBuffer
  ├── split on '\n'
  ├── for each complete line:
  │     stripped = normalizePane(line)   // strip ANSI, collapse whitespace
  │     if stripped: insertTaskLog + broadcastOutput
  └── keep partial last line in forwardRawBuffer
```

This gives mobile near-real-time TUI output for providers that don't have structured JSON hooks.

## Startup Timeout

The poll loop checks `receivedFirstData` on every tick. If it remains false after `startupTimeoutMs` milliseconds:

1. Call `kill()` on the PTY
2. Set status to `failed`
3. Broadcast `[error] Agent startup timed out`

This replaces the old tmux `has-session` polling approach with a simpler first-byte check.

## Temp File Cleanup

After `finish()` is called, a 5-second timer fires and deletes all paths in `SetupResult.tempFiles`. This delay ensures the hooks file has been fully read before deletion.
