# Phase 0: Repo Setup

**Goal**: Scaffold the monorepo with all apps/packages directories, tooling, shared package with theme + types, and MCP config.

**Session**: Start a new Claude Code chat for this phase.

---

## Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- Node.js 22+
- pnpm installed

---

## Steps

### 1. Initialize monorepo root

```bash
cd /Users/ke/ws/PocketDev
```

Create `package.json`:
- `"name": "pocketdev"`
- `"private": true`
- Add turbo scripts: `dev`, `build`, `check-types`, `lint`, `dev:web`
- Add db scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`
- Add `turbo` as devDependency

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 2. Add turbo.json

Standard config with `globalDependencies` on `.env`, tasks for build/dev/check-types.

### 3. Create all directories

```bash
mkdir -p apps/web apps/agent apps/mobile
mkdir -p packages/shared/src/{theme,schema,types,crypto}
mkdir -p packages/db/src/schema
```

### 4. Generate TanStack Start app in `apps/web`

Reference: SiteMap's `apps/web/` structure

- `package.json` with `@pocketdev/web`, `@tanstack/react-start`, `@tanstack/react-router`, vite, react, tailwindcss v4
- `vite.config.ts` with TanStack Start plugin + Tailwind + tsconfigPaths
- `tsconfig.json` with bundler module resolution and `#/*` path alias
- `src/routes/__root.tsx` — root layout with html head, Tailwind
- `src/routes/index.tsx` — placeholder home page
- `app.css` with Tailwind directives
- `server.ts` — Bun production server (copy pattern from SiteMap)
- `Dockerfile` — multi-stage Bun build (copy pattern from SiteMap)

Initialize shadcn:
```bash
cd apps/web && npx shadcn@latest init
```

### 5. Scaffold `apps/agent` (placeholder only)

- `package.json` with name `@pocketdev/agent`, `"private": true`
- `src/index.ts` — placeholder comment: "Agent server — Phase 2"
- `tsconfig.json`

This is NOT built out until Phase 2.

### 6. Scaffold `apps/mobile` (placeholder only)

Scaffold a bare RN app with Rock CLI + Re.Pack:

```bash
cd apps/mobile
npx @react-native-community/cli init PocketDev --directory .
```

Add Rock + Re.Pack:
```bash
pnpm add -d rock @rock-js/platform-ios @rock-js/platform-android @rock-js/plugin-repack @callstack/repack @rspack/core
pnpm add react-native-reanimated react-native-gesture-handler react-native-screens react-native-safe-area-context
```

Create `rock.config.mjs`, `rspack.config.mjs`, `react-native.config.js` (copy patterns from SiteMap/TrackTrades).

This is NOT built out until Phase 3.

### 7. Set up `packages/shared`

Create `packages/shared/package.json` with exports map:
- `.` -> `./src/index.ts`
- `./types` -> `./src/types/index.ts`
- `./theme` -> `./src/theme/index.ts`
- `./schema` -> `./src/schema/index.ts`
- `./crypto` -> `./src/crypto/index.ts`

Add `zod` and `@noble/ed25519` as dependencies.

**Theme files** (`src/theme/`):
- `palette.ts` — color scales (neutral, primary, accent, success, warning, error)
- `semantic.ts` — `lightTheme` / `darkTheme` mapping semantic names to palette values
- `spacing.ts` — spacing scale, borderRadius, typographyScale
- `index.ts` — barrel export

**Schema files** (`src/schema/`):
- `enums.ts` — `taskStatusEnum` (pending/running/completed/failed/killed), `changeTypeEnum` (created/modified/deleted), `devicePlatformEnum` (ios/android), `agentTypeEnum` (claude/codex/shell)
- `tables.ts` — TABLE_NAMES constants (`installs`, `devices`)
- `index.ts` — barrel export

**Type files** (`src/types/`):
- `messages.ts` — `WsMessage` envelope type, `CommandType` / `EventType` union types
- `models.ts` — `Device`, `Task`, `FileChange`, `InstallRecord` types
- `index.ts` — barrel export

**Crypto files** (`src/crypto/`):
- `ed25519.ts` — `generateKeypair()`, `sign()`, `verify()` using `@noble/ed25519`
- `index.ts` — barrel export

### 8. Set up `packages/db`

- `package.json` with name `@pocketdev/db`, exports for `.` and `./schema`
- Add `drizzle-orm` and `postgres` as dependencies, `drizzle-kit` as devDependency
- `src/index.ts` — placeholder DB connection
- `src/schema/index.ts` — placeholder barrel export
- `drizzle.config.ts` — pointing to schema, PostgreSQL

### 9. Add `.env.example`

```env
DATABASE_URL=postgres://user:password@localhost:5432/pocketdev
VITE_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 10. Add `.mcp.json`

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

### 11. Add root configs

**`tsconfig.json`**: Base config referenced by apps.

**`.gitignore`**:
```
node_modules/
dist/
.turbo/
.env
.env.local
.DS_Store
*.tsbuildinfo
```

### 12. Install and verify

```bash
pnpm install
pnpm dev:web   # Should start TanStack Start on port 3000
```

---

## CLAUDE.md Updates

The root `CLAUDE.md` should already exist. After this phase:
- Verify all paths in the project structure diagram are correct
- Confirm shared package exports match what was actually created

---

## Commit

```
phase 0: scaffold monorepo with apps, packages, and tooling

- pnpm workspace monorepo with turbo
- apps: web (TanStack Start), agent (placeholder), mobile (RN scaffold)
- packages: shared (theme, schema, types, crypto), db (Drizzle scaffold)
- shadcn MCP configured
- shared theme tokens, Zod enums, wire protocol types
```
