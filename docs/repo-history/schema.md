# Repo History Schema

## Agent Tables (Drizzle ORM, `apps/agent/src/db/schema/git-history.ts`)

### `git_commits`
One row per commit, scoped to a project.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | `{projectId}:{sha}` |
| project_id | TEXT NOT NULL FK | References `projects(id)` |
| sha | TEXT NOT NULL | Full 40-char SHA |
| short_sha | TEXT NOT NULL | 7-char display SHA |
| message | TEXT NOT NULL | Commit message |
| author_name | TEXT NOT NULL | |
| author_email | TEXT | |
| committed_at | TEXT NOT NULL | ISO 8601 timestamp |
| branch | TEXT | Branch name at sync time |
| additions | INTEGER | Total lines added |
| deletions | INTEGER | Total lines deleted |
| files_changed | INTEGER | Number of files in commit |
| synced_at | TEXT | When this row was created |

### `git_commit_files`
Which files changed in each commit.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK AI | |
| commit_id | TEXT NOT NULL FK | References `git_commits(id)` CASCADE |
| path | TEXT NOT NULL | File path |
| old_path | TEXT | For renames |
| kind | TEXT NOT NULL | `added` / `modified` / `deleted` / `renamed` |
| additions | INTEGER | Lines added in this file |
| deletions | INTEGER | Lines deleted in this file |

### `task_commits`
Junction table linking tasks to the commits they produced.

| Column | Type | Notes |
|--------|------|-------|
| task_id | TEXT NOT NULL FK | References `tasks(id)` |
| commit_id | TEXT NOT NULL FK | References `git_commits(id)` CASCADE |

Composite PK: `(task_id, commit_id)`

### `projects` (extended)
New column: `last_synced_sha TEXT` — watermark for incremental sync.

## Mobile Tables (raw SQL, `apps/mobile/src/db/schema.ts`)

Same structure as agent tables (`git_commits`, `git_commit_files`, `task_commits`) plus:

### `file_embeddings`
Persistent storage for on-device AI file embeddings (replaces MMKV cache).

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK AI | |
| project_id | TEXT NOT NULL | Root path used as project identifier |
| path | TEXT NOT NULL | File path within project |
| enriched_text | TEXT NOT NULL | Context-enriched path (for re-indexing) |
| embedding | BLOB NOT NULL | 384-dim float32 vector |
| built_at | INTEGER NOT NULL | Timestamp of embedding creation |

UNIQUE constraint: `(project_id, path)`

If vec0 extension is available, a virtual table `vec_file_384` mirrors the embeddings for native vector search via `distance()`.

### `file_metadata`
Lightweight file tracking for AI context.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| project_id | TEXT NOT NULL | |
| path | TEXT NOT NULL | |
| last_commit_sha | TEXT | SHA of most recent commit touching this file |
| last_change_kind | TEXT | added / modified / deleted |
| extension | TEXT | File extension |
| file_kind | TEXT | code / doc / config / other |
| updated_at | TEXT | |

### `sync_state`
Generic key-value for tracking sync watermarks.

| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | e.g. `gitHistory:{projectId}` |
| value | TEXT NOT NULL | e.g. last synced SHA |
| updated_at | TEXT | |

## API Endpoints

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/git/history/detailed?limit=&offset=` | `{ commits: GitDetailedCommitEntry[], hasMore }` |
| `GET` | `/git/history/file?path=&limit=` | `{ commits: GitDetailedCommitEntry[] }` |
| `POST` | `/git/history/sync` | `{ newCommits, latestSha }` |
| `GET` | `/git/history/status` | `{ lastSyncedSha, headSha, pendingCommits }` |
| `GET` | `/git/history/task/:taskId` | `{ commits: GitDetailedCommitEntry[] }` |

## Shared Types (`packages/shared/src/types/git.ts`)

```ts
interface GitDetailedCommitEntry extends GitCommitEntry {
  fullSha: string
  authorEmail?: string
  committedAt: string     // ISO 8601
  branch?: string
  files: GitCommitFileEntry[]
}

interface GitCommitFileEntry {
  path: string
  oldPath?: string
  kind: GitFileChangeKind
  additions: number
  deletions: number
}

interface GitHistorySyncStatus {
  lastSyncedSha: string | null
  headSha: string
  pendingCommits: number
}

interface GitHistorySyncResult {
  newCommits: number
  latestSha: string | null
}
```
