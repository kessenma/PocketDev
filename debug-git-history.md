# Debug: git_commits table not populating

## Problem
The `git_commits` table exists but has 0 rows. The `projects.last_synced_sha` column contains the literal string `"last_synced_sha"` instead of an actual git SHA. The git history sync runs but produces no commits.

## Investigation steps

Run these queries against the live SQLite database at `$POCKETDEV_DATA_DIR/pocketdev.db` (default: `./data/pocketdev.db` or `/opt/pocketdev/data/pocketdev.db`):

### 1. Check migration state
```sql
SELECT * FROM __drizzle_migrations ORDER BY created_at;
```
We expect entries with `created_at` values like `1775155268676`, `1775429725360`, `1775745487970`, etc. If there's a row with `created_at = 9999999999999`, the far-future stamp was blocking migrations. It should have been replaced on the latest restart.

### 2. Check if git history tables exist
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'git%' OR name = 'task_commits';
```
We expect: `git_commits`, `git_commit_files`, `task_commits`

### 3. Check git_commits schema
```sql
PRAGMA table_info(git_commits);
```
Verify the `origin` column exists. If not, migration 0005 didn't run.

### 4. Check the bad watermark
```sql
SELECT id, name, absolute_path, last_synced_sha FROM projects;
```
**This is the key query.** If `last_synced_sha` contains the literal text `"last_synced_sha"` (the column name) instead of a 40-char hex SHA or NULL, that's the bug. The sync function uses this value in `git log <sha>..HEAD` which fails silently when it's not a valid ref.

### 5. Fix the bad watermark
If `last_synced_sha` has a bad value:
```sql
UPDATE projects SET last_synced_sha = NULL;
```
This will cause the next sync to do a fresh initial seed (100 most recent commits).

### 6. Check git_commits data
```sql
SELECT COUNT(*) FROM git_commits;
SELECT id, sha, short_sha, message, origin, committed_at FROM git_commits ORDER BY committed_at DESC LIMIT 5;
```

### 7. Verify git works from the project path
```sql
SELECT absolute_path FROM projects WHERE id = (SELECT value FROM server_config WHERE key = 'active_project_id');
```
Then from that directory:
```bash
git rev-parse --show-toplevel
git log -n 3 --oneline
```

### 8. Test a manual sync
After fixing the watermark, restart the agent or call:
```bash
curl -X POST http://localhost:4387/PocketDev/api/console/debug/git-history-sync
```
Or just restart the agent process — the console diagnostics panel will auto-trigger a sync on the next poll.

## Root cause hypothesis
The `last_synced_sha` column was added by migration 0002 (`ALTER TABLE projects ADD last_synced_sha text`). On a legacy DB where migrations were blocked by the far-future stamp, this ALTER never ran. When it finally ran (after the stamp fix), SQLite may have defaulted existing rows to something unexpected, or there was a Drizzle ORM issue where the column reference was serialized as its name.

## Files involved
- `apps/agent/src/db/index.ts` — DB init, migration logic, legacy bootstrap
- `apps/agent/src/services/git-history-sync.ts` — `syncGitHistory()`, uses `project.lastSyncedSha`
- `apps/agent/src/db/schema/projects.ts` — schema definition with `lastSyncedSha` column
- `apps/agent/drizzle/0002_cold_winter_soldier.sql` — migration that adds `last_synced_sha` and creates git tables
