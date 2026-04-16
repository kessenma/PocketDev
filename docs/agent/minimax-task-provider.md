# Minimax as a Task Provider

## Overview

Minimax is currently wired only as a **setup/configuration** concern — the wizard writes an API key into OpenCode's config, and the diagnostics panel reports whether it's configured. It is not yet a selectable provider in the task creation form.

This document outlines the changes required to bring Minimax to parity with Claude and Codex as a first-class task provider, updated after inspecting OpenCode's actual CLI.

---

## OpenCode's Architecture (What We Learned)

Running `opencode --help` reveals that OpenCode is **not** a stream-json CLI like Claude Code. It is a **server-first tool**:

- Starts an HTTP server (`opencode serve`, `opencode acp`)
- Communicates via **ACP (Agent Client Protocol)** — its own HTTP/WebSocket API
- Has a `run` subcommand (`opencode run [message..]`) for non-interactive use
- Model selection uses `-m provider/model` format (e.g. `-m minimax/minimax-text-01`)
- Session continuation via `-c` (last session) or `-s <sessionId>`
- No `--output-format stream-json`, no `--provider` flag

This means **none of the Claude stream-json assumptions apply**. We cannot reuse `ClaudeTaskStreamAdapter`. The entire execution model needs its own path.

---

## Critical Open Question: What Does `opencode run` Output?

Before implementing anything, run this on a server with Minimax configured:

```bash
opencode run -m minimax/minimax-text-01 --prompt "What is 2 + 2? Reply in one sentence."
```

Also try:
```bash
opencode run -m minimax/minimax-text-01 --prompt "What is 2 + 2?" --print-logs 2>&1
```

And check what ACP exposes:
```bash
opencode acp --help
opencode serve --help
```

The output of `opencode run` is the fork in the road:

| Output shape | Approach |
|---|---|
| Plain text / ANSI | `ManagedProcess` (stdio), parse raw lines, emit `text` activity on completion |
| Structured JSON (ACP events) | `ManagedProcess` (stdio), write a `OpenCodeTaskStreamAdapter` |
| Nothing — ACP server only | `opencode serve` + HTTP polling or WebSocket from agent process |

---

## Likely Architecture: `opencode run` via ManagedProcess

Assuming `opencode run` writes output to stdout (even if plain text), the simplest approach that reaches basic parity is:

```
opencode run -m minimax/minimax-text-01 --prompt "<escaped prompt>"
```

Run as a `ManagedProcess` (stdio, same as Codex and Shell). Collect lines as raw logs. On completion, emit a single `text` activity with the full output. This gives:

- Task starts, runs, completes ✓
- Raw log view works ✓
- Result card shows final output ✓
- Tool-use activity cards: **not available** (only if ACP emits structured events)
- Continuation: **yes** via `-s <sessionId>` (need to capture sessionId from output)
- Model selection: `-m minimax/minimax-text-01` ✓

This is a shallower integration than Claude (no tool streaming, no thinking cards) but is fast to ship and gives users something real.

---

## Full ACP Integration (Richer, More Work)

OpenCode's ACP server exposes a real-time API. If we start `opencode serve --port <random>` and connect to it via HTTP:

1. POST a new session / run request to the ACP endpoint
2. Subscribe to the session event stream (SSE or WebSocket)
3. Parse ACP events into `TaskActivity` objects (tool_use, text, thinking, status)
4. Send kill/input by calling ACP endpoints

This would give **full activity streaming parity with Claude** — tool cards, thinking, permission prompts — but requires implementing an ACP client in the agent server and understanding ACP's event schema first.

**Recommendation**: Ship the `ManagedProcess` / `opencode run` approach first. Follow up with ACP integration once OpenCode's event schema is understood.

---

## Required Changes (ManagedProcess Approach)

### 1. `packages/shared/src/schema/enums.ts`

```ts
export const agentTypeEnum = z.enum(['claude', 'codex', 'copilot', 'shell', 'minimax'])
```

### 2. `apps/agent/src/services/tasks/task-manager.ts`

**`buildCommand`** — add a `minimax` case:

```ts
case 'minimax': {
  const opencodePath = getToolPath('opencode_cli') ?? 'opencode'
  const modelFlag = model ? ['-m', model] : ['-m', 'minimax/minimax-text-01']
  return [opencodePath, 'run', ...modelFlag, '--prompt', prompt]
}
```

**`startTask`** — `minimax` routes to `ManagedProcess` (same as Codex/Shell):

```ts
} else if (agentType === 'minimax') {
  const command = buildCommand('minimax', prompt, model, mode)
  console.log(`[task-manager] Starting minimax task ${taskId}`)
  const proc = new ManagedProcess({ taskId, command, cwd, mode, agentType, prompt, model, onComplete })
  proc.start()
  tasks.set(taskId, proc)
}
```

**`continueTask`** — if `opencode run -s <sessionId>` works for resuming, generate a `sessionId` for minimax tasks and add `'minimax'` to the continuation guard. The sessionId would need to be captured from the first run's output (look for a session ID in stdout or stderr when `--print-logs` is set).

### 3. `apps/agent/src/services/tasks/task-stream-adapters.ts`

Add an `OpenCodeRunAdapter` (or `MinimaxTaskStreamAdapter`) that handles plain-text lines:

```ts
export class OpenCodeRunAdapter implements TaskStreamAdapter {
  // Buffer all lines as raw output.
  // On signalComplete(), emit a single 'text' activity with the collected output.
  // If ACP-style JSON events appear on stdout, parse them similarly to CodexTaskStreamAdapter.
}
```

The exact implementation depends on what `opencode run` actually emits. If it's plain text, the simplest version buffers lines and emits one `text` activity at the end. If it emits structured events, map them to `TaskActivity`.

### 4. `apps/mobile/src/components/model-selector/catalog.ts`

```ts
{
  id: 'minimax',
  label: 'Minimax',
  models: [
    { id: 'minimax/minimax-text-01', name: 'Text-01', description: 'General-purpose text model' },
    { id: 'minimax/abab6.5s-chat',   name: 'ABAB 6.5s', description: 'Fast, efficient chat model' },
  ],
  availability: 'unknown',
}
```

Note: model IDs use the `provider/model` format that OpenCode's `-m` flag expects.

**`mergeServerAvailability`**: Map `minimax_provider` tool status → `minimax` provider availability:
- `status === 'installed'` AND `api_key_configured === true` → `'available'`
- Otherwise → `'not_installed'`
- Never `'installed_no_auth'` (key is embedded in config, not a separate auth step)

**`getCliModelId`**: Return the model ID as-is (already in `provider/model` format for the `-m` flag).

### 5. `apps/mobile/src/components/tasks/NewTaskForm.tsx`

```ts
// Provider logo map
minimax: { light: Assets.minimaxBlack, dark: Assets.minimaxWhite },

// providerToAgentType
if (providerId === 'minimax') return 'minimax'
```

### 6. `apps/mobile/src/components/tasks/TaskStreamer.tsx`

No changes needed. If `OpenCodeRunAdapter` emits standard `TaskActivity` objects, the streamer renders them as-is. A single `text` activity at completion will show a result card with markdown output.

### 7. `apps/docs/src/routes/tasks.tsx`

Add to the providers table:

```tsx
<tr>
  <td>Minimax</td>
  <td>opencode run (stdio)</td>
  <td>Minimax AI tasks via OpenCode provider config; requires OpenCode installed and Minimax API key configured</td>
</tr>
```

---

## Summary of Files to Change

| File | Change |
|---|---|
| `packages/shared/src/schema/enums.ts` | Add `'minimax'` to `agentTypeEnum` |
| `apps/agent/src/services/tasks/task-manager.ts` | Add `minimax` case to `buildCommand` + `startTask` routing |
| `apps/agent/src/services/tasks/task-stream-adapters.ts` | Add `OpenCodeRunAdapter` (shape depends on `opencode run` output) |
| `apps/mobile/src/components/model-selector/catalog.ts` | Add `minimax` provider + models + availability mapping |
| `apps/mobile/src/components/tasks/NewTaskForm.tsx` | Add logo + `providerToAgentType` case |
| `apps/docs/src/routes/tasks.tsx` | Add Minimax to providers table |

---

## Prerequisite Check (Run This First)

```bash
# On a server with Minimax configured:
opencode run -m minimax/minimax-text-01 --prompt "What is 2 + 2? Reply in one sentence."

# Does it print anything to stdout? Does it hang?
# Also try:
opencode acp --help
```

The output of these two commands determines the stream adapter design. Everything else above can be implemented now without waiting.
