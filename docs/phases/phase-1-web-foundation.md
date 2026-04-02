# Phase 1: Web Foundation

**Goal**: Build the PocketDev web app with an about/landing page, a dynamic `/install.sh` route that tracks downloads, and Postgres schema for install analytics. Deploy to Coolify.

**Session**: Start a new Claude Code chat. Reference `CLAUDE.md`.

---

## Prerequisites

- Phase 0 complete (monorepo scaffolded, `pnpm install` works)
- Postgres running locally (`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=pocketdev postgres:16-alpine`)
- `.env` created from `.env.example` with `DATABASE_URL` filled in

---

## Steps

### 1. Set up Postgres + Drizzle in `packages/db`

**Create schema** (`src/schema/installs.ts`):

```ts
import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const installs = pgTable('installs', {
  id: serial('id').primaryKey(),
  ip_address: varchar('ip_address', { length: 45 }).notNull(),  // IPv4 or IPv6
  user_agent: text('user_agent'),
  script_version: varchar('script_version', { length: 20 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
})
```

**Create DB connection** (`src/index.ts`):
```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
```

**Run migration**:
```bash
pnpm db:generate
pnpm db:push
```

**Verify**: `pnpm db:studio` — should show empty `installs` table.

### 2. Build the root layout

Reference: SiteMap's `__root.tsx`

**`apps/web/src/routes/__root.tsx`**:
- HTML head with meta tags, title "PocketDev", favicon
- Tailwind CSS import
- Dark/light theme support
- Clean, minimal layout wrapper

### 3. Build the landing/about page

**`apps/web/src/routes/index.tsx`**:

A clean, single-page landing page. Thin route file that composes components from `src/components/landing/`.

**Components to create** (`src/components/landing/`):
- `Hero.tsx` — headline ("Run your dev environment from your pocket"), subtitle, CTA
- `InstallCommand.tsx` — the curl command in a styled code block with copy-to-clipboard button: `curl -fsSL https://pocketdev.run/install.sh | bash`
- `HowItWorks.tsx` — 3-step visual: Install -> Pair -> Control
- `Features.tsx` — feature grid (mobile UI, live streaming, file diffs, secure pairing)
- `Architecture.tsx` — simple diagram showing Mobile -> Agent -> AI -> Filesystem
- `Footer.tsx` — minimal footer with author credit

**Use shadcn MCP** for: Button, Card, Badge components.

**Styling**: Tailwind v4, dark mode, clean monospace/modern aesthetic. Think Vercel/Linear landing page.

### 4. Build the `/install.sh` dynamic route

**`apps/web/src/routes/install.sh.ts`** (API route, no UI):

This is a TanStack Start server route that:
1. Extracts the requester's IP address from headers (`x-forwarded-for` or `x-real-ip`, fallback to connection IP)
2. Extracts `User-Agent` header
3. Inserts a row into the `installs` table via Drizzle
4. Returns the install script as `text/plain` with headers:
   - `Content-Type: text/plain; charset=utf-8`
   - `Content-Disposition: attachment; filename="install.sh"`

**The install script content** (placeholder for Phase 1):
```bash
#!/bin/bash
set -euo pipefail

echo "============================================"
echo "  PocketDev Installer v0.1.0"
echo "============================================"
echo ""
echo "PocketDev is not yet available for installation."
echo "Follow the project at: https://github.com/kessenma/PocketDev"
echo ""
echo "Coming soon:"
echo "  - Secure device pairing"
echo "  - AI agent control from your phone"
echo "  - Live task streaming"
echo ""
```

The actual installer will be built in Phase 2 when the agent server exists.

### 5. Docker + Coolify deployment

**`apps/web/Dockerfile`** — multi-stage Bun build (mirror SiteMap pattern):
- Stage 1: install deps (`bun install --frozen-lockfile`)
- Stage 2: build (`bun run build`)
- Stage 3: production (`bun run start`)

**`docker-compose.web.yml`** (root level):
```yaml
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "${WEB_PORT:-3000}:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - VITE_APP_URL=${VITE_APP_URL}
      - NODE_ENV=production
```

### 6. Verify

1. `pnpm dev:web` — dev server on localhost:3000
2. Visit `http://localhost:3000` — landing page renders
3. `curl http://localhost:3000/install.sh` — returns the install script as plain text
4. `pnpm db:studio` — verify a row was inserted into `installs` with the curl request's IP
5. `pnpm build` — production build succeeds
6. `docker build -t pocketdev-web -f apps/web/Dockerfile .` — Docker build works

---

## CLAUDE.md Updates

After this phase:
- Verify deployment section reflects Coolify config
- Update key commands if any changed
- Note the install script route pattern for future phases

---

## Commit

```
phase 1: web app with landing page, install script route, postgres tracking

- landing page with hero, install command, features, architecture
- dynamic /install.sh route serving placeholder script
- install tracking in postgres (ip, user agent, version, timestamp)
- docker + coolify deployment config
- drizzle schema and migrations for installs table
```
