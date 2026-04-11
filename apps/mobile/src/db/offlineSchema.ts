export const OFFLINE_CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS offline_snapshots (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL,
  branch         TEXT NOT NULL,
  root_path      TEXT NOT NULL,
  downloaded_at  TEXT NOT NULL,
  file_count     INTEGER NOT NULL DEFAULT 0,
  total_bytes    INTEGER NOT NULL DEFAULT 0,
  UNIQUE(project_id, branch)
);

CREATE TABLE IF NOT EXISTS offline_files (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id  TEXT NOT NULL REFERENCES offline_snapshots(id) ON DELETE CASCADE,
  path         TEXT NOT NULL,
  kind         TEXT NOT NULL,
  language     TEXT,
  size_bytes   INTEGER,
  content      TEXT,
  UNIQUE(snapshot_id, path)
);

CREATE VIRTUAL TABLE IF NOT EXISTS offline_files_fts USING fts5(
  path,
  content,
  content='offline_files',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS offline_files_ai
AFTER INSERT ON offline_files BEGIN
  INSERT INTO offline_files_fts(rowid, path, content)
    VALUES (new.id, new.path, COALESCE(new.content, ''));
END;

CREATE TRIGGER IF NOT EXISTS offline_files_ad
AFTER DELETE ON offline_files BEGIN
  INSERT INTO offline_files_fts(offline_files_fts, rowid, path, content)
    VALUES('delete', old.id, old.path, COALESCE(old.content, ''));
END;

CREATE TRIGGER IF NOT EXISTS offline_files_au
AFTER UPDATE ON offline_files BEGIN
  INSERT INTO offline_files_fts(offline_files_fts, rowid, path, content)
    VALUES('delete', old.id, old.path, COALESCE(old.content, ''));
  INSERT INTO offline_files_fts(rowid, path, content)
    VALUES (new.id, new.path, COALESCE(new.content, ''));
END;
`

export const OFFLINE_CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_offline_files_snapshot ON offline_files(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_offline_files_path ON offline_files(snapshot_id, path);
CREATE INDEX IF NOT EXISTS idx_offline_snapshots_proj ON offline_snapshots(project_id, branch);
`
