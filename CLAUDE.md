# PocketDev

Mobile-first interface for controlling AI coding agents on remote servers. Install on any Linux VPS, pair your phone, control Claude/Codex from anywhere.

## Project Structure

```
apps/web/              TanStack Start + Vite (landing page, install script hosting, dashboard)
apps/agent/            Bun + Elysia server agent (installed on target servers)
apps/mobile/           React Native + Rock CLI + Re.Pack/rspack
packages/shared/       Theme tokens, Zod schemas, wire protocol types, crypto utilities
packages/db/           Drizzle ORM schema + migrations (Postgres - web app DB)
```

## Documentation

Each app/package has its own CLAUDE.md with detailed architecture:

- `apps/mobile/CLAUDE.md` — Screens, navigation, stores, services, Bauhaus design system
- `apps/agent/CLAUDE.md` — Server database, routes, build & bundle
- `apps/agent/console/CLAUDE.md` — Console SPA pages, components, API client
- `apps/web/CLAUDE.md` — Landing page routes and components
- `packages/shared/CLAUDE.md` — Wire protocol types, theme tokens, schema, crypto
- `packages/db/CLAUDE.md` — Web app PostgreSQL schema

Deep-dive documentation lives in `docs/` — see each CLAUDE.md for links to relevant deep-dives:

- `docs/mobile/` — Navigation, setup wizards, adaptive layout, design system, task flow, stores
- `docs/connection/` — Pairing flow, reconnection logic
- `docs/protocol/` — Wire types, WebSocket lifecycle
- `docs/agent/` — Task system, terminal, preview proxy, CLI providers, prerequisites
- `docs/console/` — Diagnostics panel, setup status grid
- `docs/docker/` — Container UI, server Docker setup
- `docs/git/` — Mobile git workspace, server git operations
- `docs/files/` — Mobile file browser
- `docs/plan/` — Plan review workspace
- `docs/projects/` — Project system
- `docs/testing/` — Local testing setup, testing infrastructure
- `docs/database/` — Agent migrations
- `docs/app-icon/` — Shared icon generation pipeline (iOS, Android, web)
- `docs/agent/update-system.md` — Self-update mechanism, version tracking, rollback

## Key Commands

```bash
# Dev servers
pnpm dev                                       # All apps via Turbo
pnpm dev:web                                   # Web only (port 3000)
pnpm local:testing                             # Interactive local agent testing helper (see docs/testing/local-testing-setup.md)
pnpm dev:mobile                                # Start re.pack metro for mobile
pnpm ios                                       # Launch iOS app
pnpm android                                   # Launch Android app
docker compose -f docker-compose.dev.yml up    # Full dev environment (agent + sample app)

# Database
pnpm db:generate                               # Generate migration from schema changes
pnpm db:push                                   # Push schema directly to dev DB
pnpm db:studio                                 # Visual DB browser
pnpm db:migrate                                # Run migrations

# Type checking
pnpm check-types                               # All packages via Turbo
```

## Shared Package (`@pocketdev/shared`)

All shared code lives in `packages/shared/`. Import via:

```ts
import { lightTheme, darkTheme, palette } from '@pocketdev/shared/theme'
import { taskSchema, messageTypeEnum } from '@pocketdev/shared/schema'
import type { WsMessage, Task, Device } from '@pocketdev/shared/types'
import { generateKeypair, sign, verify } from '@pocketdev/shared/crypto'
```

### Theme (`packages/shared/src/theme/`)
Cross-platform design tokens used by both web and mobile:
- `palette.ts` — color scales (primary, accent, neutral, semantic)
- `semantic.ts` — lightTheme / darkTheme token maps
- `spacing.ts` — spacing scale, border radius, typography scale
- Consumed by Tailwind (web) and StyleSheet.create (mobile)

### Types (`packages/shared/src/types/`)
Wire protocol types shared between agent, web, and mobile:
- `messages.ts` — WebSocket message envelope (type, id, payload, timestamp), command types (task.*, terminal.*, files.*, ping), event types (task.*, terminal.*, files.*, pong)
- `commands.ts` — mobile-to-server commands (task.start, task.kill, files.approve, terminal.input, terminal.resize, etc.)
- `events.ts` — server-to-mobile events (task.output, task.status_changed, terminal.output, terminal.exited, files.changed, etc.)
- `models.ts` — Device, Task, FileChange, InstallRecord types

### Schema (`packages/shared/src/schema/`)
Zod validation schemas:
- `enums.ts` — taskStatusEnum, changeTypeEnum, devicePlatformEnum, agentTypeEnum
- `tables.ts` — TABLE_NAMES constants
- Domain-specific schemas for validation at system boundaries

### Crypto (`packages/shared/src/crypto/`)
Ed25519 key operations that work in both Bun and React Native:
- Uses `@noble/ed25519` (pure JS, no native deps)
- `generateKeypair()` — returns { publicKey, privateKey }
- `sign(message, privateKey)` — signs a message
- `verify(signature, message, publicKey)` — verifies a signature

When adding a new entity: create Zod schema in `packages/shared/src/schema/`, add Drizzle table in `packages/db/src/schema/`, add types in `packages/shared/src/types/`.

## Database

PostgreSQL via Drizzle ORM (web app database — tracks installs, devices, analytics).

- **Schema**: `packages/db/src/schema/`
- **Drizzle config**: `packages/db/drizzle.config.ts`
- All tables use text primary keys, `created_at`/`updated_at` timestamps

The agent server uses **SQLite** locally on target servers (via `bun:sqlite`) for device registrations, task history, and file snapshots. This is self-contained and not part of the shared DB package.

## Architecture

```
[ Mobile App ]  ←→  HTTPS / WebSocket  ←→  [ PocketDev Agent (target server) ]
                                                    ↓
                                            [ Claude / Codex / CLI ]
                                                    ↓
                                            [ Filesystem + Dev Server ]

[ Web App (pocketdev.run) ]  ←  Landing page, install script, install tracking
```

## Agent Server (`apps/agent/`)

Bun + Elysia, single process on port 4387. All features accessible via one port:

```
Port 4387 (Elysia)
├── GET  /health                  Health check + pairing status
├── GET  /setup                   Setup status (active only before pairing)
├── POST /setup/pair              One-time device pairing with setup code
├── WS   /ws                      Task commands (start, kill, list) + events (output, status)
├── WS   /ws/terminal             Interactive PTY shell session
├── GET  /files/tree              Directory listing (depth-limited, .gitignore-aware)
├── GET  /files/read              File content (1MB cap)
├── PUT  /files/write             Write file content
├── POST /files/mkdir             Create directory
├── DELETE /files/delete          Delete file/directory
├── GET  /files/search            Ripgrep search (falls back to grep)
└── ANY  /preview/*               Reverse proxy to local dev server
```

### Key services:
- **Terminal** (`services/terminal.ts`, `services/terminal-ws.ts`) — PTY allocation via `script` command, WebSocket streaming. One session per connection, killed on disconnect.
- **Task Manager** (`services/task-manager.ts`, `services/managed-process.ts`) — Spawns Claude/Codex/shell processes, streams stdout/stderr line-by-line, auto-detects dev server port from output.
- **File API** (`routes/files.ts`) — REST endpoints for file operations. All paths validated against `POCKETDEV_PROJECT_DIR` to prevent traversal.
- **Dev Preview** (`services/proxy.ts`) — Reverse proxy forwarding `/preview/*` to `localhost:{devPort}`. Port auto-detected from task output or set via `POCKETDEV_DEV_PORT` env.
- **Setup/Pairing** (`services/setup.ts`, `routes/setup.ts`) — One-time pairing with 15-min setup code. Ed25519 keypair generated on first boot.

### Environment variables:
- `POCKETDEV_PORT` — Agent port (default: 4387)
- `POCKETDEV_DATA_DIR` — SQLite DB location (default: `./data/`)
- `POCKETDEV_PROJECT_DIR` — Base dir for file operations (default: `$HOME`)
- `POCKETDEV_DEV_PORT` — Dev server port for preview proxy (default: 5173, auto-detected)

### SQLite tables (`db/schema.sql`):
- `devices` — Paired device registrations (id, public_key, name, platform)
- `tasks` — Task history (id, prompt, agent_type, status, exit_code)
- `task_logs` — Streaming output (task_id, stream, line)
- `server_config` — Server keypair + config

## Security Model

- Setup mode is temporary (15 min expiry, one-time use)
- Device-based Ed25519 keypair authentication after pairing
- No long-term shared secrets
- Only `/setup` is exposed before pairing; disabled after
- All WebSocket frames authenticated with device signature
- File operations restricted to `POCKETDEV_PROJECT_DIR` (path traversal protection)

## Docker Compose Dev Environment

`docker-compose.dev.yml` provides a full local development setup:

- **agent** — Bun with hot reload, mounts `apps/agent/`
- **sample-app** — Vite React project for testing the edit-preview loop
- **testing-host** — Debian container simulating a remote server

```bash
docker compose -f docker-compose.dev.yml up     # Start all services
docker compose -f docker-compose.dev.yml up agent  # Agent only
```

## Deployment

- **Web app**: Coolify on Kyle's Linux server (Docker)
- **Agent**: Installed on target servers via `curl -fsSL https://pocketdev.run/install.sh | bash`

## MCP Servers

- **shadcn**: Web components (`npx shadcn@latest mcp`) — browse, search, install shadcn/ui components

## Web UI Components

Use **shadcn/ui** for all web UI components in `apps/web/`. When adding a new component:
1. Use the shadcn MCP tools to browse available components and install them (they land in `apps/web/src/components/ui/`)
2. Compose shadcn primitives into feature components — don't build raw HTML/Tailwind when a shadcn component exists
3. shadcn components are copy-pasted (not imported from a library), so they can be customized freely

## Implementation Phases

Step-by-step build guides in `phases/`:

- `phases/phase-0-repo-setup.md` - Monorepo scaffold, tooling, shared package structure
- `phases/phase-1-web-foundation.md` - Web app, landing page, install script route, Postgres tracking
- `phases/phase-2-agent-server.md` - Agent server, secure pairing, WebSocket, CLI wrapper, interactive terminal, file API, dev preview proxy
- `phases/phase-3-mobile-app.md` - React Native app, pairing flow, task streaming
- `phases/phase-4-files-review.md` - File tracking, diffs, approve/reject workflow
- `phases/phase-5-polish-deploy.md` - HTTPS, reconnection, multi-agent, git integration

Each phase = one chat session + git commit. **Web-first**: deploy and stabilize web before agent and mobile.

## Testing Docs

- `docs/testing/local-testing-setup.md` - current local agent testing flow; entry point is `pnpm local:testing` via `scripts/local-testing.js`
- `docs/testing/testing-infrastructure.md` - broader testing infrastructure plan and follow-on implementation work

## Important Conventions

- **Modular UI**: Pages/screens are thin orchestrators (~20-30 lines) that compose focused components. Each visual section gets its own component file in a feature subfolder.
- Shared Zod schemas use **snake_case** field names matching DB columns
- Drizzle maps snake_case DB columns to camelCase JS properties internally
- Package manager is **pnpm** with workspaces (bun used as runtime)
- Web-first: deploy and stabilize web before mobile
- Mobile uses bare RN + Rock CLI + Re.Pack/rspack (NOT Expo, NOT Metro)
- Mobile components use `@rn-primitives/*` for headless behavior + `StyleSheet.create()` for styling
- Wire protocol types defined once in `@pocketdev/shared/types`, consumed by agent + mobile
- Agent server is stateless except for SQLite — designed to be installed via one command
