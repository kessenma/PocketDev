# Mobile Local Database

Local SQLite database for offline caching and persistence on device. Uses `@op-engineering/op-sqlite` (bare React Native, no Expo).

## Tech Stack

- **Driver**: `@op-engineering/op-sqlite` — native C SQLite binding for React Native
- **Schema**: Raw SQL strings (`CREATE TABLE IF NOT EXISTS`) — no ORM
- **Migrations**: Additive only — `ALTER TABLE` wrapped in try/catch for idempotency
- **File**: `pocketdev.db` in `${DocumentDirectoryPath}/databases/`
- **Mode**: WAL (Write-Ahead Logging) + foreign keys enabled

## Architecture

```
TaskDatabaseProvider (React Context)
├── Opens pocketdev.db on mount
├── Runs CREATE TABLE + CREATE INDEX
├── Exposes { db, isReady } via context
└── Sets module-level DB ref in tasks store via setTaskStoreDb()

taskOperations.ts (pure functions)
├── upsertTasks(db, tasks)        — cache task list from server
├── getCachedTasks(db, limit)     — load cached tasks for instant display
├── getTask(db, id)               — single task lookup
├── updateCachedTaskStatus(db, id, status)
├── saveTaskLogs(db, taskId, logs) — persist log lines
├── getCachedTaskLogs(db, taskId)  — fetch cached logs
├── hasTaskLogs(db, taskId)        — quick existence check
└── deleteOldTasks(db, keepCount)  — prune old data
```

## Tables

### `tasks`
Mirrors the agent server's `tasks` table. Caches task metadata fetched via `GET /PocketDev/api/tasks`.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID from server |
| prompt | TEXT | User's task prompt |
| agent_type | TEXT | claude, codex, copilot, shell |
| mode | TEXT | default, plan |
| model | TEXT | Model identifier |
| status | TEXT | pending, running, completed, failed, killed |
| project_id | TEXT | |
| project_name | TEXT | |
| working_directory | TEXT | |
| created_at | TEXT | ISO timestamp |
| started_at | TEXT | |
| completed_at | TEXT | |
| exit_code | INTEGER | |

### `task_logs`
Caches task output lines. Populated from server endpoint `GET /PocketDev/api/tasks/:id/logs` or saved from in-memory logs on task completion.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| task_id | TEXT FK | References tasks(id) ON DELETE CASCADE |
| stream | TEXT | stdout or stderr |
| line | TEXT | Log line content |
| timestamp | TEXT | |

## Cache Strategy

1. **Task list**: On `refreshFromServer()`, tasks are fetched from the server API and `upsertTasks()` caches them locally. On next app open, `getCachedTasks()` loads instantly before the server responds.

2. **Task logs**: When a task completes, in-memory logs are saved to local DB via `saveTaskLogs()`. When viewing a historical task with no in-memory logs, `loadLogsForTask()` checks local DB first, then falls back to server endpoint.

3. **Pruning**: `deleteOldTasks(db, 100)` runs after each server refresh to keep the DB lean.

## Integration with Zustand Store

The Zustand task store (`stores/tasks.ts`) can't use React hooks, so it uses a module-level DB reference:
- `setTaskStoreDb(db)` — called by `TaskDatabaseProvider` when DB is ready
- Store functions use the `_db` reference directly for async operations

## Adding New Tables

1. Add `CREATE TABLE IF NOT EXISTS` to `schema.ts` `CREATE_TABLES_SQL`
2. Add indexes to `CREATE_INDEXES_SQL`
3. Create an operations file (e.g., `planOperations.ts`) with typed CRUD functions
4. For additive migrations on existing tables, use `ALTER TABLE` in try/catch (same pattern as rag-mobile)

## Future Expansion

This DB will grow beyond tasks. Potential additions:
- Plan cache (plan steps, questions, chat messages)
- File snapshots (directory tree cache)
- Settings / preferences
- Offline queue for actions taken while disconnected
