# Git UI — Mobile Workspace

> **Status**: Fully server-integrated. All operations execute against real repositories on the paired PocketDev agent via REST API.
>
> For store architecture see [docs/mobile/stores.md](../mobile/stores.md). For the component-level detail and interaction patterns see the [git component CLAUDE.md](../../apps/mobile/src/components/git/CLAUDE.md).

This document covers the mobile git workspace under `apps/mobile/src/components/git/`.

## Purpose

The git workspace lets the user inspect and act on real repository state from their phone:

- repository summary and upstream status
- working tree change list with per-file diff inspection
- commit composer
- push status and readiness
- branch browsing and checkout
- recent commit history with per-commit file breakdown

## Entry Points

- `apps/mobile/src/components/git/GitWorkspace.tsx` — top-level workspace composition and segmented views
- `apps/mobile/src/stores/git.ts` — Zustand git store (server-backed)
- `apps/mobile/src/components/git/index.ts` — barrel export for the module

## Component Map

### Shared primitives

- `apps/mobile/src/components/git/GitCard.tsx` — shared card shell (re-exports `LiquidGlassCard` variants)
- `apps/mobile/src/components/git/GitBadge.tsx` — compact status badge for git states
- `apps/mobile/src/components/git/GitSegmentedControl.tsx` — segmented control for `changes`, `history`, and `branches`

### Changes view

- `apps/mobile/src/components/git/GitRepoSummaryCard.tsx` — repo name, path, branch, and remote summary
- `apps/mobile/src/components/git/GitStatusSummary.tsx` — high-level working tree metrics
- `apps/mobile/src/components/git/GitChangeList.tsx` — staged and unstaged file changes (see **GitChangeList UX** below)
- `apps/mobile/src/components/git/GitChangeDetailSheet.tsx` — full-screen modal slide-up wrapping `GitDiffPreview`
- `apps/mobile/src/components/git/GitDiffPreview.tsx` — focused diff preview for the selected file
- `apps/mobile/src/components/git/GitCommitComposer.tsx` — commit message entry and commit action
- `apps/mobile/src/components/git/GitPushPanel.tsx` — push readiness, remote sync, and push action

### History view

- `apps/mobile/src/components/git/GitHistoryList.tsx` — recent commits with changed-file counts
- `apps/mobile/src/components/git/GitCommitDetailRow.tsx` — expandable commit row with per-file entries
- `apps/mobile/src/components/git/GitHistoryPane.tsx` — pane wrapper composing the history list

### Branches view

- `apps/mobile/src/components/git/GitBranchList.tsx` — branch selection and ahead/behind state

### Types and exports

- `apps/mobile/src/components/git/model.ts` — `GitFileChange`, `GitCommitEntry`, `GitBranchOption`, `GitRemoteState`, `GitView`
- `apps/mobile/src/components/git/index.ts` — barrel export

## GitChangeList UX

The change list uses a **two-tier interaction model** so tapping a file path never accidentally opens the diff sheet.

### Card layout

```
┌─ [v] filename.tsx    [MODIFIED] ─┬───┐
│  File changed                    │   │
│  NO LINE STATS  STAGED           │ > │
├──────────────────────────────────┤   │
│  apps/mobile/src/components/     │   │  ← accordion (when per-card chevron is tapped)
│  git/filename.tsx                │   │
└──────────────────────────────────┴───┘
```

| Control | Behaviour |
|---|---|
| `ChevronDown/Up` (left of filename) | Toggles accordion below the meta row — shows full path, word-wrapped. The filename header **never changes**. |
| Filename tap | `BauhausTooltip` shows the full path for 2.4 s. No navigation. |
| Kind badge | Static label: `modified / added / deleted / renamed` |
| `ChevronRight` right panel | Opens `GitChangeDetailSheet` via `onSelect(change.id)` |

### Header controls

- **File count badge** — `"3 files"` / `"1 file"`
- **Global expand chevron** — expands or collapses all cards at once; resets individual overrides

### Key layout implementation notes

- Card outer `View`: `flexDirection: 'row'` + `overflow: 'hidden'` — right panel clips to border radius
- Right panel: fixed-width `TouchableOpacity`, `borderLeftWidth: 1`, spans full card height
- Per-card state: `Set<string>` for individual expansion; separate `allExpanded` boolean for global toggle

## Server API

The git store calls these agent endpoints:

| Function | Endpoint |
|---|---|
| `fetchGitSummary` | `GET /git/summary` |
| `fetchGitChanges` | `GET /git/changes` |
| `fetchGitDiff` | `GET /git/diff?path=…` |
| `fetchGitHistory` | `GET /git/history` |
| `fetchGitBranches` | `GET /git/branches` |
| `postGitCheckout` | `POST /git/checkout` |
| `postGitCommit` | `POST /git/commit` |
| `postGitPush` | `POST /git/push` |

## Git Event Bus

All git store actions emit typed events through a lightweight pub/sub bus so any part of the app can react to git state changes without coupling to the store directly.

- **Location**: `apps/mobile/src/services/gitEventBus.ts`
- **Emit**: `emitGitEvent(event: GitEvent)` — called inside the git store at the end of each action
- **Subscribe**: `subscribeToGitEvents(listener)` — returns an unsubscribe function for `useEffect` cleanup

### Event types

```typescript
type GitEvent =
  | { type: 'branch_switched'; branchName: string }
  | { type: 'refresh_completed'; branchName: string }
  | { type: 'commit_made'; branchName: string }
  | { type: 'push_completed'; branchName: string }
  | { type: 'pull_completed'; branchName: string }
  | { type: 'fetch_completed'; branchName: string }
```

### Current subscribers

| Subscriber | Reacts to | Action |
|---|---|---|
| `CodeBrowseTab.tsx` | `branch_switched` | Calls `clearOfflineMode()` so the next directory open re-evaluates offline vs server |
| `offline.ts` store | `branch_switched` | Reserved for future stale-snapshot awareness |

### Where emitters live

The git store (`stores/git.ts`) calls `emitGitEvent(...)` after:
- `selectBranch` → `branch_switched`
- `refresh()` → `refresh_completed`
- `commitChanges()` → `commit_made`
- `pushChanges()` → `push_completed`
- pull → `pull_completed`

---

## Offline Repo Caching

The offline caching feature lets users download an entire project branch to the device so the code browser and search work without a server connection. Cached data lives in a **separate encrypted SQLite database** (`offline.db`) keyed by the device's Ed25519 private key.

### Architecture

```
offline.db (SQLCipher-encrypted, separate from pocketdev.db)
├── offline_snapshots  — one row per (project, branch) download
├── offline_files      — one row per file/directory in a snapshot
└── offline_files_fts  — FTS5 virtual table for full-text search
```

**Key files:**

| File | Role |
|---|---|
| `apps/mobile/src/db/offlineSchema.ts` | SQL DDL constants — tables, indexes, FTS, triggers |
| `apps/mobile/src/db/OfflineDatabaseProvider.tsx` | React context — opens `offline.db`, derives encryption key, runs schema, calls `setOfflineStoreDb()` |
| `apps/mobile/src/db/offlineOperations.ts` | Pure DB functions (no store coupling) |
| `apps/mobile/src/stores/offline.ts` | Zustand store — download state machine, snapshot index |

### Encryption key derivation

`deriveKey()` in `OfflineDatabaseProvider` takes the first 32 bytes of the stored Ed25519 private key and encodes them as a 64-character hex string — that becomes the 256-bit SQLCipher key. If the key is unavailable (pre-pairing) the DB opens without encryption. If the key mismatches on open (after re-pairing or reinstall) the DB is deleted and reopened unencrypted — all prior offline data is lost and must be re-downloaded.

### Download algorithm

`startDownload` in `offline.ts` performs a BFS traversal of the project file tree:

1. `upsertOfflineSnapshot()` — DELETEs any prior snapshot first (CASCADE cleans files + FTS triggers), then INSERTs a new one
2. BFS queue starts with `['.']`; for each directory, calls `listDirectory` then splits results into files and subdirs
3. Files are fetched in a **concurrency-5 Promise pool** via `fetchFileContent`
4. Binary files (`.png`, `.jpg`, `.gif`, `.ico`, `.woff`, `.woff2`, `.ttf`, `.pdf`, `.zip`, etc.) are stored with `content: null` — they appear in the tree but fall back to the server on open
5. Files are bulk-inserted in batches of ~200 rows inside `BEGIN TRANSACTION`
6. `downloadProgress.total` grows as new directories are discovered; this is an accepted v1 UX limitation
7. On completion: `updateSnapshotStats()` → `loadAllSnapshots()` → fires a fire-and-forget `POST /offline-snapshots` to the agent
8. Cancel: module-level `_cancelRequested` flag — the BFS loop checks it before each network call; on cancel, `deleteOfflineSnapshot()` tears down cleanly

### Offline-first access in the files store

`files.ts` checks for an active offline snapshot before every network call:

- `openDirectory` → `getOfflineDirectory()` → sets `offlineMode: true` if hit
- `selectFile` → `getOfflineFileContent()` → sets `offlineMode: true` if hit
- `runSearch` → `searchOfflineFiles()` (FTS5) → sets `offlineMode: true` if hit

The helper `getActiveOfflineSnapshot()` uses `require()` inside the function body to avoid circular imports at module load time.

### FTS snapshot isolation

The FTS query always filters by `AND f.snapshot_id = ?` via a `JOIN` on `offline_files`. Without this, searching would contaminate results across branches if multiple snapshots are stored.

### UI entry points

- **ProjectsScreen** — "Download for Offline" button, progress bar, "Offline · N files · branch" badge, "Remove Offline Data" button, `'downloaded'` filter
- **CodeBrowseTab** — "Browsing offline cache" banner (WifiOff icon) when `offlineMode === true`; clears on `branch_switched` via the git event bus

### Agent-side visibility

When a download completes, the mobile app fires `POST /PocketDev/api/console/offline-snapshots` (device auth). The agent stores this in `device_offline_snapshots` (Drizzle table). The console surfaces it in:

- **RepoInspectorPanel** — "offline on N devices" badge in the info bar
- **GitHubDiagnosticsTab** — "Mobile Offline Snapshots" panel in the left sidebar showing device name, branch, file count, size, and relative time

---

## Update Rule

If a git component, store contract, workspace entry point, or interaction pattern changes, update this document and `apps/mobile/src/components/git/CLAUDE.md` in the same change so the module map stays accurate.
