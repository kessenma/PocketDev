# Agent Database Migrations

The PocketDev agent uses SQLite via Drizzle ORM for local data storage on target servers.

## How It Works

1. **Schema definition**: Drizzle schema files live in `apps/agent/src/db/schema/`
2. **Migration generation**: `drizzle-kit generate` creates SQL migration files in `apps/agent/drizzle/`
3. **Auto-apply on startup**: When the agent boots, `migrate()` runs all pending migrations against the SQLite database
4. **Bundled for distribution**: Migration files are included in the `agent-bundle.tar.gz` tarball

## Workflow: Making Schema Changes

```bash
cd apps/agent

# 1. Edit the schema file (e.g., src/db/schema/devices.ts)

# 2. Generate migration
pnpm db:generate

# 3. Review the generated SQL in drizzle/
cat drizzle/XXXX_*.sql

# 4. Test locally
pnpm dev
# The agent will auto-apply the migration on startup

# 5. Rebuild the bundle for distribution
cd ../..
pnpm build:agent-bundle
```

## Key Details

- **Runtime**: Bun's built-in SQLite (`bun:sqlite`) via `drizzle-orm/bun-sqlite`
- **Database location**: `$POCKETDEV_DATA_DIR/pocketdev.db` (default: `./data/pocketdev.db`)
- **WAL mode**: Enabled for better concurrent read performance
- **Foreign keys**: Enabled via PRAGMA

## Migration Files

Migrations are stored in `apps/agent/drizzle/` with metadata in `drizzle/meta/_journal.json`. These files are:
- **Checked into git** — part of the source tree
- **Included in the tarball** — bundled alongside `index.js` and `console/`
- **Auto-applied** — no manual migration step needed on target servers

## Tables

| Table | Purpose |
|-------|---------|
| `devices` | Paired mobile devices |
| `server_config` | Server keypair, session tokens, custom settings |
| `tasks` | Task history (prompts, status, exit codes) |
| `task_logs` | Streaming output lines from tasks |
| `plans` | Agent-proposed plans |
| `plan_steps`, `plan_questions`, `plan_messages` | Plan details |
| `tool_paths` | Detected CLI tools and their paths |
| `admin_accounts` | Web console admin (email + hashed password) |

## Future: Mobile SQLite Migrations

The mobile app may also need SQLite migrations in the future (e.g., for offline caching or local task history). When that time comes, a similar Drizzle setup can be created in `apps/mobile/` following the same pattern documented here.
