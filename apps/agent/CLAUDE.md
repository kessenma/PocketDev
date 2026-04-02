# PocketDev Agent

Bun + Elysia server installed on target Linux VPS machines. Provides the API that the mobile app and console SPA interact with.

## Database

SQLite via Drizzle ORM (`drizzle-orm/bun-sqlite`). The database file lives at `$POCKETDEV_DATA_DIR/pocketdev.db` (default: `./data/pocketdev.db`).

### Schema

Schema files are in `src/db/schema/`:
- `devices.ts` — Paired mobile devices (id, public_key, name, platform)
- `server-config.ts` — Key-value config (server keypair, session tokens)
- `tasks.ts` + `task_logs` — Task history and streaming output
- `plans.ts` + `plan_steps` + `plan_questions` + `plan_messages` — Agent plan lifecycle
- `tool-paths.ts` — Detected CLI tools (claude, codex, etc.)
- `admin-accounts.ts` — Web console admin (email + bcrypt password hash)

### Migration Workflow

Migrations are managed by `drizzle-kit` and applied automatically on server startup via `migrate()`.

```bash
# After modifying any schema file:
pnpm db:generate    # Generate migration SQL in drizzle/

# Migrations are auto-applied on startup — no manual step needed on the server
```

See [docs/database/agent-migrations.md](../../docs/database/agent-migrations.md) for the full migration guide.

## Routes

All routes are prefixed with `/PocketDev/`:

- `/PocketDev/health` — Health check
- `/PocketDev/api/console/*` — Console web UI API (setup, login, passcode, status)
- `/PocketDev/api/pair` — Mobile device pairing
- `/PocketDev/api/files/*`, `/api/git/*`, etc. — Authenticated device API
- `/PocketDev/ws` — Task WebSocket
- `/PocketDev/ws/terminal` — Interactive terminal WebSocket
- `/PocketDev/preview/*` — Dev server reverse proxy
- `/PocketDev/*` (catch-all) — Console SPA static files

## Console SPA

The web console lives at `console/` (a separate Vite + React + shadcn app). It builds to `console/dist/` and is served as static files by the agent.

```bash
cd console && pnpm dev    # Dev server for console UI
cd console && pnpm build  # Production build
```

## Build & Bundle

The agent is bundled into a tarball for distribution:

```bash
# From repo root:
pnpm build:agent-bundle
```

This runs `scripts/build-agent-bundle.sh` which:
1. Builds the console SPA (`console/dist/`)
2. Builds the agent (`dist/index.js`)
3. Packages everything + drizzle migrations into `apps/web/public/agent-bundle.tar.gz`
