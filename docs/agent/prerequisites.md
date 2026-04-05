# Agent Prerequisites System

## Overview

The prerequisites system detects the installed state and configuration of all tools required for the PocketDev workspace. It's used by both the mobile setup wizard and the console setup status grid.

**Source**: `apps/agent/src/services/prerequisites.ts`

## Tool Check Structure

```typescript
interface ToolCheck {
  id: string
  name: string
  status: 'installed' | 'missing' | 'misconfigured'
  auth_status: 'authenticated' | 'unauthenticated' | 'unknown' | 'not_applicable'
  version: string | null
  path: string | null
  required: boolean
  install_command: string | null
  auth_command: string | null
  details: Record<string, string | null | boolean>
}
```

## Checked Tools

| Tool ID | Name | Required | Auth Type | Detection |
|---|---|---|---|---|
| `git` | Git | Yes | User config (name/email) | `which git` + `git config` |
| `github_cli` | GitHub CLI | No | `gh auth status` | `which gh` |
| `node` | Node.js | Yes | N/A | `which node` |
| `npm` | npm | Yes | N/A | `which npm` |
| `pnpm` | pnpm | No | N/A | `which pnpm` |
| `bun` | Bun | No | N/A | `which bun` |
| `claude_cli` | Claude Code | Yes | `claude auth status` | `which claude` |
| `codex_cli` | Codex CLI | Yes | `codex auth status` | `which codex` |
| `copilot_cli` | Copilot CLI | No | GitHub auth + trust | `which gh` + extension check |
| `python` | Python | No | N/A | `which python3` |
| `chromium` | Chromium | No | N/A | `which chromium-browser` |
| `docker` | Docker | No | Daemon running | `which docker` + `docker info` |

## Git Details

The git checker provides extra detail fields:

| Field | Value |
|---|---|
| `user_name` | `git config user.name` |
| `user_email` | `git config user.email` |
| `ssh_key_exists` | `~/.ssh/id_ed25519` or `~/.ssh/id_rsa` exists |
| `github_connected` | `ssh -T git@github.com` succeeds |
| `private_repo_access` | Can clone private repos |

## Copilot Trust Check

Copilot has a special `trust_configured` detail field. Even if `status === 'installed'`, the mobile app and console treat it as `misconfigured` when `trust_configured !== 'true'`.

## Readiness Calculation

```typescript
const ready = gitReady && githubCliReady && nodeReady && npmReady && aiReady
```

| Condition | Requirement |
|---|---|
| `gitReady` | Git installed + user.name and user.email configured |
| `githubCliReady` | GitHub CLI installed + authenticated |
| `nodeReady` | Node.js installed |
| `npmReady` | npm installed |
| `aiReady` | Claude CLI OR Codex CLI installed and authenticated |

## Database Detection

`detectRunningDatabases()` scans Docker containers for known database images:
- PostgreSQL, MongoDB, Redis, MySQL, Supabase

Returns: `DatabaseInfo[]` with port, status, version, container name.

## Prerequisites Report

```typescript
interface PrerequisitesReport {
  os: string          // e.g., 'Linux', 'Darwin'
  arch: string        // e.g., 'x64', 'arm64'
  tools: ToolCheck[]  // All checked tools
  databases: DatabaseInfo[]
  ready: boolean      // Overall readiness
}
```

## API Endpoint

```
GET /PocketDev/prerequisites
  → Authenticate request
  → Run all tool checks in parallel
  → Calculate readiness
  → Return PrerequisitesReport
```

## Mobile Consumption

**Source**: `apps/mobile/src/components/setup/setup-tool-utils.ts`

Mobile groups tools for display:
- **Required**: Git + synthesized "Package Managers" (node/npm/pnpm/bun)
- **AI Assistants**: Claude CLI, Codex CLI, Copilot CLI
- **Language**: Python
- **Supporting**: Everything else

The `getServerSetupStatus()` function determines overall readiness for the "Continue" button.

## Console Consumption

**Source**: `apps/agent/console/src/components/SetupStatus.tsx`

Console provides 3 layout modes for the same data:
- **List**: Compact rows with status dots
- **Grid**: Card tiles with status indicators
- **Bauhaus**: Dynamic grid with varied tile sizes based on tool importance

Both consumers normalize Copilot status (treating `trust_configured !== 'true'` as misconfigured).
