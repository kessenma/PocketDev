// Local SQLite schema for PocketDev mobile.
// Tables mirror the agent server's schema for offline caching.

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  agent_type TEXT NOT NULL DEFAULT 'claude',
  mode TEXT NOT NULL DEFAULT 'default',
  model TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  project_id TEXT,
  project_name TEXT,
  working_directory TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  exit_code INTEGER
);

CREATE TABLE IF NOT EXISTS task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  stream TEXT NOT NULL DEFAULT 'stdout',
  line TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now'))
);
`

export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
`
