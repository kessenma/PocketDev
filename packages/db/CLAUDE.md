# @pocketdev/db

PostgreSQL database for the **web app** (pocketdev.run). Tracks install script downloads and analytics.

> **Note**: This is NOT the agent database. The agent uses its own SQLite DB on each target server — see `apps/agent/CLAUDE.md`.

## Tech Stack

- Drizzle ORM + PostgreSQL
- drizzle-kit for migrations

## Schema

```
src/schema/
└── installs.ts    Install tracking records (ip_address, user_agent, script_version, created_at)
```

## Commands

```bash
pnpm db:generate   # Generate migration SQL from schema changes
pnpm db:push       # Push schema directly to dev DB
pnpm db:studio     # Visual DB browser (Drizzle Studio)
pnpm db:migrate    # Run pending migrations
```

## Config

- `drizzle.config.ts` — Drizzle configuration
- `DATABASE_URL` environment variable for connection string
