# Repo History

Structured git history and file embeddings as an AI-accessible data layer. Tracks commits, per-commit file changes, and task-commit associations across the agent (source of truth) and mobile (offline cache).

## Architecture

```
[ Agent Server (SQLite + Drizzle) ]
├── git_commits         Full commit history per project
├── git_commit_files    Per-file changes for each commit
├── task_commits        Links tasks to commits they produced
└── projects.last_synced_sha  Watermark for incremental sync

        ↓  REST API  ↓

[ Mobile App (op-sqlite) ]
├── git_commits         Cached last 200 commits per project
├── git_commit_files    Cached file changes
├── task_commits        Cached task-commit links
├── file_embeddings     384d vectors (vec0 or BLOB fallback)
├── file_metadata       Lightweight file tracking
└── sync_state          Sync watermarks
```

## Data Ownership

| Data | Owner | Mobile Strategy |
|------|-------|-----------------|
| Git commit history | Agent (runs git commands) | Cache last 200 per project |
| Per-commit file changes | Agent | Cached with commits |
| Task-commit links | Agent (matches by timestamp) | Cached for task detail views |
| File embeddings | Mobile (ExecuTorch model) | SQLite (was MMKV) |
| File metadata | Derived from history | Updated on sync |

## Sync Flow

### Initial Sync
1. Mobile calls `POST /git/history/sync`
2. Agent runs `git log -n 100 --reverse` to seed initial history
3. For each commit: `git diff-tree` to get per-file stats and kinds
4. Inserts into `git_commits` + `git_commit_files` in a transaction
5. Sets `projects.last_synced_sha` to newest commit

### Incremental Sync
1. Agent runs `git log {lastSyncedSha}..HEAD --reverse`
2. Only new commits since last sync are processed
3. Watermark advances to HEAD

### External Changes
When someone works on the repo outside PocketDev:
1. Mobile pulls to refresh on git tab
2. `GET /git/history/status` shows `pendingCommits > 0`
3. `POST /git/history/sync` captures the new commits
4. Mobile fetches and caches the updated history

### Task-Commit Linking
After a task completes:
1. Agent syncs git history
2. `linkTaskCommits()` finds commits with `committed_at` between task's `startedAt` and `completedAt + 5s`
3. Associations stored in `task_commits` junction table

## Trigger Points

| Event | What Happens |
|-------|-------------|
| Task completion | Agent auto-syncs + links commits |
| `POST /git/commit` | Agent syncs the new commit |
| Mobile git tab refresh | Fetches detailed history, caches locally |
| Mobile `syncHistory()` | Triggers server sync + fetch + cache |
| Project switch | New project's history loads (or from cache) |

## Retention

- **Agent**: All commits kept (git is on disk anyway; DB is just an index). Cap at 500 per project.
- **Mobile**: Last 200 commits per project. `pruneOldCommits()` runs after each sync.
- **File embeddings**: Valid until file set changes. Invalidated by count mismatch.
