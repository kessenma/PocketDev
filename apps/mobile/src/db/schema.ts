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

CREATE TABLE IF NOT EXISTS task_turns (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  stream TEXT NOT NULL DEFAULT 'stdout',
  line TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS setup_snapshots (
  device_id TEXT PRIMARY KEY,
  report_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS git_commits (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  sha TEXT NOT NULL,
  short_sha TEXT NOT NULL,
  message TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  committed_at TEXT NOT NULL,
  branch TEXT,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  origin TEXT DEFAULT 'external',
  synced_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_commits (
  task_id TEXT NOT NULL REFERENCES tasks(id),
  commit_id TEXT NOT NULL REFERENCES git_commits(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, commit_id)
);

CREATE TABLE IF NOT EXISTS git_commit_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commit_id TEXT NOT NULL REFERENCES git_commits(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  old_path TEXT,
  kind TEXT NOT NULL,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS file_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  enriched_text TEXT NOT NULL,
  embedding BLOB NOT NULL,
  built_at INTEGER NOT NULL,
  content_preview TEXT DEFAULT '',
  UNIQUE(project_id, path)
);

CREATE TABLE IF NOT EXISTS file_metadata (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  last_commit_sha TEXT,
  last_change_kind TEXT,
  extension TEXT,
  file_kind TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, path)
);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
`

export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_task_turns_task_id ON task_turns(task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_setup_snapshots_updated_at ON setup_snapshots(updated_at);
CREATE INDEX IF NOT EXISTS idx_git_commits_project ON git_commits(project_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_git_commits_sha ON git_commits(sha);
CREATE INDEX IF NOT EXISTS idx_git_commit_files_commit ON git_commit_files(commit_id);
CREATE INDEX IF NOT EXISTS idx_git_commit_files_path ON git_commit_files(path);
CREATE INDEX IF NOT EXISTS idx_file_embeddings_project ON file_embeddings(project_id);
CREATE INDEX IF NOT EXISTS idx_file_embeddings_path ON file_embeddings(project_id, path);
CREATE INDEX IF NOT EXISTS idx_file_metadata_project ON file_metadata(project_id, path);
`
