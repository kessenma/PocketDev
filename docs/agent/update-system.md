# Agent Update System

Self-update mechanism that lets users upgrade (or rollback) the PocketDev agent from the console UI without SSH access.

## How It Works

```
pocketdev.run                          User's Linux Server
┌─────────────────────┐               ┌──────────────────────────────┐
│ GET /agent/version   │◄──────────────│ Agent version.ts             │
│ → { version, versions│  (cached 6h)  │   reads version.json (local) │
│    changelog_url }   │               │   fetches latest from .run   │
├─────────────────────┤               ├──────────────────────────────┤
│ GET /agent/bundle    │               │ GET /api/console/health      │
│  → latest tarball    │               │ → includes version + update  │
│ GET /agent/bundle/   │               ├──────────────────────────────┤
│     {version}        │               │ POST /api/console/update     │
│  → pinned tarball    │               │ → download, extract, restart │
└─────────────────────┘               └──────────────────────────────┘
```

## Version Tracking

The agent's version is embedded in `version.json` at the bundle root during the build process. The build script (`scripts/build-agent-bundle.sh`) extracts the version from `apps/web/install.sh` (`POCKETDEV_VERSION`) and writes it into the bundle.

Each build also archives a copy to `apps/web/public/agent-versions/{version}.tar.gz` so previous versions are always available for rollback.

## Key Files

| File | Role |
|---|---|
| `apps/agent/src/services/version.ts` | Reads local version, checks pocketdev.run for updates (6h cache) |
| `apps/web/src/server/agent-version.ts` | Serves `/agent/version` (JSON) and `/agent/bundle/{version}` (tarball) |
| `apps/agent/src/routes/console.ts` | `GET /health` includes version/update; `POST /update` triggers upgrade |
| `apps/agent/console/src/components/UpdateBanner.tsx` | Console UI banner with update + rollback controls |
| `scripts/build-agent-bundle.sh` | Generates `version.json` + archives versioned bundles |

## Update Flow

1. Console loads → `GET /health` returns `version` and `update` (with `updateAvailable` flag)
2. If update available, yellow banner appears between header and main grid
3. User clicks "Update Now" (or selects a version from the rollback dropdown)
4. `POST /api/console/update` with optional `{ version }` body
5. Agent downloads the bundle from pocketdev.run, validates the tarball, extracts over the current install
6. Agent schedules `systemctl restart pocketdev-agent` after 500ms (so the response reaches the client)
7. Console polls `/health` every 3s until the agent comes back with the new version
8. Success toast + page reload

## Rollback

The rollback dropdown lists all versions available in `agent-versions/` on pocketdev.run (excluding the current version). Selecting a version triggers the same update flow but downloads that specific pinned tarball instead of latest.

## Non-Interactive Updates

When the agent triggers an update, `install.sh` would normally prompt "Reset admin account? [y/N]". The `POCKETDEV_UPDATE=1` environment variable skips this prompt so the script can run non-interactively.

## Version API Response

```json
GET https://pocketdev.run/agent/version

{
  "version": "0.3.0",
  "versions": ["0.1.0", "0.2.0", "0.3.0"],
  "changelog_url": "https://pocketdev.run/changelog"
}
```
