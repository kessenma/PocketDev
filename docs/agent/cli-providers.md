# CLI Provider Integration

## Overview

PocketDev supports three AI CLI providers: Claude Code, OpenAI Codex, and GitHub Copilot. Each has its own setup service, detection logic, and authentication flow.

## Provider Architecture

```
Mobile Setup Wizard          Agent Server                    CLI
    │                            │                            │
    │  GET /X-setup/status       │                            │
    │────────────────────────►   │  which(binary)             │
    │   { installed, auth, ver } │  getVersion(binary)        │
    │◄────────────────────────   │  checkAuth(binary)         │
    │                            │                            │
    │  POST /X-setup/install     │                            │
    │────────────────────────►   │  Terminal: npm install -g   │
    │   { success }              │                            │
    │                            │                            │
    │  POST /X-setup/auth/start  │                            │
    │────────────────────────►   │  Spawn interactive session  │
    │   { sessionId }            │────────────────────────►   │
    │                            │  Parse PTY output           │
    │  GET /X-setup/auth/status  │  Detect prompts/URLs        │
    │────────────────────────►   │                            │
    │   { state, authUrl, ... }  │                            │
    │◄────────────────────────   │                            │
```

## Claude Code CLI

**Service**: `apps/agent/src/services/claude-setup.ts`
**Routes**: `apps/agent/src/routes/claude-setup.ts`

### Detection

```bash
which claude            # Check binary exists
claude --version        # Get version
claude auth status      # Check auth (parses output)
```

### Authentication Flow

1. Start interactive PTY session: `claude auth login`
2. Parse output for:
   - Theme selection prompt → auto-send selection
   - Login method prompt → auto-select browser
   - OAuth URL → extract and return to mobile
   - "Browser didn't open" fallback → return URL
   - Device code prompt → return code for user
   - Success patterns → mark authenticated
3. Mobile displays URL/code, user completes in browser
4. Poll status until authenticated

### Session State Machine

```
idle → authenticating → awaiting_input → complete → authenticated
```

### Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/status` | Check install + auth status |
| POST | `/verify` | Verify current auth is valid |
| POST | `/auth/start` | Start auth session |
| GET | `/auth/status/:id` | Poll session status |
| POST | `/auth/submit/:id` | Submit input to session |

## OpenAI Codex CLI

**Service**: `apps/agent/src/services/codex-setup.ts` (implied from routes)
**Routes**: `apps/agent/src/routes/codex-setup.ts`

### Detection

```bash
which codex             # Check binary exists
codex --version         # Get version
codex auth status       # Check auth
```

### Authentication Flow

Two modes:
- **Browser**: OAuth flow similar to Claude
- **Device code**: Display code for user to enter at OpenAI

### Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/status` | Check install + auth |
| POST | `/install` | Install via npm |
| POST | `/auth/start` | Start auth (browser or device_code mode) |
| GET | `/auth/status/:id` | Poll session |
| POST | `/auth/submit/:id` | Submit input |
| POST | `/auth/callback/:id` | Replay auth callback |
| POST | `/verify` | Verify auth |

## GitHub Copilot CLI

**Service**: `apps/agent/src/services/copilot-setup.ts`
**Routes**: `apps/agent/src/routes/copilot-setup.ts`

### Detection

```bash
which gh               # GitHub CLI must be installed first
gh copilot --version   # Check Copilot extension
```

### Trust Flow

Copilot requires explicit directory trust. This is unique among the providers.

1. Start PTY session for trust setup
2. Handle Bubbletea TUI terminal queries (DA1, DA2, DSR, etc.)
3. Parse output for trust prompts
4. Auto-send trust confirmation
5. Store trust marker at `{POCKETDEV_DATA_DIR}/copilot-trust.json`

### Terminal Query Handling

Copilot's Bubbletea TUI sends terminal capability queries that must be answered:

| Query | Response | Purpose |
|---|---|---|
| DA2 (secondary device attributes) | `ESC[>0;0;0c` | Report as VT100 |
| DA1 (primary device attributes) | `ESC[?62;22c` | Report capabilities |
| DSR (cursor position) | `ESC[1;1R` | Report cursor at 1,1 |

Without these responses, the TUI hangs indefinitely.

### Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/status` | Check install + trust status |
| POST | `/install` | Install Copilot CLI extension |
| POST | `/trust/start` | Start trust session |
| GET | `/trust/status/:id` | Poll trust session |
| POST | `/trust/submit/:id` | Submit input to trust session |

## Tool Path Storage

Detected CLI paths are stored in the `tool_paths` SQLite table:

| Column | Type | Notes |
|---|---|---|
| tool | text PK | 'claude_cli', 'codex_cli', 'copilot_cli' |
| path | text | Absolute path to binary |
| version | text | Detected version string |
| authenticated | boolean | Current auth status |
| updated_at | text | Last check timestamp |

Used by `TaskManager` to resolve the correct binary path when spawning tasks.

## Adding a New Provider

1. Create `services/new-provider-setup.ts` with detection, install, and auth logic
2. Create `routes/new-provider-setup.ts` with REST endpoints
3. Add tool ID to `prerequisites.ts` checker
4. Add mobile wizard: `components/setup/NewProviderWizardSheet.tsx` + step components
5. Add to model catalog: `components/model-selector/catalog.ts`
6. Add agent type mapping in `NewTaskSheet.providerToAgentType()`
7. Update `TaskManager` command building for the new agent type
