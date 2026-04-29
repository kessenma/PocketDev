# Agent Process Execution

## Overview

PocketDev runs AI agent CLIs in three ways depending on the provider:

| Transport | Agents | Class |
|---|---|---|
| **node-pty** | Claude | `ManagedAgentProcess` |
| **tmux** | Copilot, Opencode/Minimax | `ManagedAgentProcess` |
| **Bun.spawn stdio** | Codex, Shell | `ManagedProcess` |

This document covers `ManagedAgentProcess` in detail. For the Bun.spawn path see [task-system.md](./task-system.md).

## Why node-pty for Claude

Claude Code is an interactive terminal application — it renders TUI menus, detects terminal capabilities, and behaves differently depending on whether it has a real PTY. Running it with piped stdin/stdout breaks TUI rendering. node-pty gives it a full PTY so it behaves exactly as it does when run interactively in a terminal.

`node-pty-prebuilt-multiarch` is a required dependency (not optional) in `apps/agent/package.json`. If it fails to load, the task fails immediately with a clear error rather than silently falling back to another transport.

## Why tmux for Copilot and Opencode

Copilot and Opencode also need a PTY, but their output is consumed differently:
- **Copilot**: pane capture polling reads the visible TUI for completion detection
- **Opencode**: redirects structured JSON to a file (`--format json > outputFile`) and exits; tmux provides the PTY but output is read from the file, not the pane

## ManagedAgentProcess

**Source**: `apps/agent/src/services/tasks/managed-agent-process.ts`

### Key components (all in one file)

| Export / Function | Purpose |
|---|---|
| `ManagedAgentProcess` | Main class: process lifecycle, debounced snapshots, hooks polling |
| `ClaudePtyRunner` | Thin node-pty wrapper (`claude-pty-runner.ts`) |
| `TmuxProviderConfig` | Provider interface: `setup`, `onPaneSnapshot`, `onFinish`, `createAdapter` |
| `claudeProviderConfig()` | Claude provider: PTY, hooks file, session management |
| `copilotProviderConfig()` | Copilot provider: tmux pane mode |
| `opencodeProviderConfig()` | Opencode/Minimax provider: tmux file mode |
| `normalizePane()` | Strips ANSI, collapses whitespace for TUI snapshot comparison |
| `parseTuiPrompt()` | Parses `❯ 1. Yes  2. No` menus |
| `parseHookEvent()` | Parses Claude hook JSONL events |
| `parsePaneLineToActivity()` | Converts visible TUI lines to `TaskActivity` |

### Claude execution flow (node-pty path)

```
ManagedAgentProcess.start()
  │
  ├── claudeProviderConfig().setup(ctx)
  │     ├── writes bash script to /tmp/pocketdev-run-{taskId}.sh
  │     ├── writes hooks settings to /tmp/pocketdev-hooks-{taskId}.json
  │     ├── creates empty /tmp/pocketdev-events-{taskId}.jsonl
  │     └── returns { command: scriptPath, hooksFilePath, usePty: true, tempFiles }
  │
  ├── ClaudePtyRunner.spawn(scriptPath, { cols: 220, rows: 50, cwd, env })
  │     └── node-pty forks a PTY process running the bash script
  │         (if spawn throws → task fails immediately, no tmux fallback)
  │
  ├── onPtyData handler fires on each PTY chunk
  │     ├── marks promptSent = true on first byte
  │     ├── updates lastPtyDataMs (liveness for startup timeout)
  │     ├── appends to ptyBuffer (capped at 50 KB)
  │     └── schedules 150ms debounce → processPtySnapshot()
  │
  ├── processPtySnapshot() (debounced)
  │     ├── normalizePane(ptyBuffer) → cleaned snapshot string
  │     ├── pollHooksFile() — reads new JSONL from hooksFilePath
  │     └── provider.onPaneSnapshot(snapshot, ctx) → PaneAction
  │           ├── 'continue' — nothing to do
  │           ├── 'complete' — call finish(status)
  │           ├── 'send' — ClaudePtyRunner.writeLine(keys)
  │           └── 'question' — register question, broadcast task.question
  │
  ├── poll() fires every 250ms (PTY path: hooks file only, no pane capture)
  │     ├── pollHooksFile() — reads new JSONL lines from hooksFilePath
  │     │     └── each line → parseHookEvent → hook actions (Stop → finish)
  │     └── startup timeout: if lastPtyDataMs === 0 after startupTimeoutMs → fail
  │
  └── onPtyExit handler fires when PTY process exits
        ├── cancels debounced snapshot
        ├── pollHooksFile() one final time (catches Stop written just before exit)
        └── finish(exitCode === 0 ? 'completed' : 'failed')
```

### TmuxProviderConfig interface

```typescript
interface TmuxProviderConfig {
  pollIntervalMs: number       // ms between poll() calls
  panePollEvery: number        // poll ticks between tmux pane captures
  startupTimeoutMs: number     // fail if no data within this time
  tmuxWidth: number
  tmuxHeight: number

  // Build the launch command/script; set usePty: true for node-pty path
  setup(ctx: SetupCtx): Promise<SetupResult>

  // Optional: parse structured JSON output into TaskActivity events
  createAdapter?(taskId: string, sink: TaskStreamAdapterSink, writeStdin: (d: string) => void): TaskStreamAdapter

  // Called on each debounced PTY snapshot (or tmux pane capture)
  onPaneSnapshot(snapshot: string, ctx: PaneCtx): Promise<PaneAction> | PaneAction

  // Called after the process finishes — plan creation, turn recording, etc.
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
  command: string           // absolute path to the bash script to run
  outputFilePath?: string   // if set, poll this file for JSONL output (tmux file mode)
  hooksFilePath?: string    // if set, poll this file for Claude hook events
  usePty?: boolean          // if true, spawn via node-pty instead of tmux
  tempFiles?: string[]      // deleted 5s after finish
}
```

`setup()` always writes a bash script rather than returning a raw command string. This ensures `process.stdout.isTTY` is true inside the script, which is required for interactive TUI rendering.

### PaneCtx

```typescript
interface PaneCtx {
  taskId: string
  prompt: string
  promptSent: boolean        // true after the prompt has been delivered
  lastChangeMs: number       // ms since last PTY/pane data
  registerQuestion(q, onAnswer): void
  broadcastOutput(line: string): void
  sendLine(text: string): void      // writes text + newline to PTY or tmux
  sendRaw(bytes: string): void      // writes raw bytes (ANSI sequences, control chars)
  sendMenuSelection(n: number): void // Down × n, then Enter
}
```

## Claude Provider

**Source**: `managed-agent-process.ts` — `claudeProviderConfig()`

Claude is the most instrumented provider. Its setup writes three files:

1. **Bash script** (`/tmp/pocketdev-run-{taskId}.sh`) — sets PATH, cds to working dir, runs `claude --permission-mode <mode> --settings <hooksSettings> [--resume|--session-id] [--model] -p <prompt>`
2. **Hooks settings** (`/tmp/pocketdev-hooks-{taskId}.json`) — registers `PreToolUse`, `PostToolUse`, and `Stop` hooks that append JSONL to the hooks file
3. **Hooks file** (`/tmp/pocketdev-events-{taskId}.jsonl`) — created empty; appended to by hook commands

Returns `usePty: true` → spawned via `ClaudePtyRunner` (node-pty). If node-pty throws, the task fails immediately.

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

**Source**: `managed-agent-process.ts` — `copilotProviderConfig()`

Copilot (`gh copilot`) is an interactive TUI. Its `setup()` does not set `usePty: true`, so it runs inside a tmux session. `onPaneSnapshot` polls the visible pane content.

Completion is detected by the pane snapshot: when the ready pattern is visible and the pane has been stable for 10s, `onPaneSnapshot` returns `{ type: 'complete', status: 'completed' }`.

A trust dialog prompt is auto-accepted by sending a Down arrow + Enter if detected in the snapshot.

## Opencode / Minimax Provider

**Source**: `managed-agent-process.ts` — `opencodeProviderConfig()`

Opencode uses tmux (file mode). Its `setup()` runs:
```bash
opencode run --format json [-m <model>] <prompt> > /tmp/pocketdev-opencode-{taskId}.jsonl
```

Output is redirected to a JSONL file polled by the file-mode handler; stderr goes to a separate file. `onPaneSnapshot` always returns `{ type: 'continue' }` — completion is signalled by tmux session exit. The `OpenCodeRunAdapter` normalises events into `TaskActivity` objects.

## Bun.spawn Agents (Codex, Shell)

Codex and Shell do not need PTY support — Codex uses a clean JSON-RPC protocol over stdio, and Shell is just `sh -c`. Both go through `ManagedProcess` (Bun.spawn with piped stdin/stdout/stderr).

See [task-system.md — ManagedProcess](./task-system.md#managedprocess) for details.

## Startup Timeout

### Claude (node-pty path)
The poll loop checks `lastPtyDataMs` on every tick. If it remains zero after `startupTimeoutMs` milliseconds, the task is marked failed with `[error] Agent startup timed out`.

### Copilot / Opencode (tmux path)
- **File mode**: fail if no bytes written to the output file within `startupTimeoutMs`
- **Pane mode**: fail if `promptSent` is still false after `startupTimeoutMs`

## Temp File Cleanup

After `finish()` is called, a 5-second timer fires and deletes all paths in `SetupResult.tempFiles`. This delay ensures the hooks file has been fully read before deletion.
