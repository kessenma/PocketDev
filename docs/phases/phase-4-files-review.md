# Phase 4: File Tracking + Diff Review

**Goal**: Server watches filesystem changes made by AI agents, sends diffs to mobile, user can approve or reject changes from their phone.

**Session**: Start a new Claude Code chat. Reference `CLAUDE.md` and existing agent code in `apps/agent/`.

---

## Prerequisites

- Phase 3 complete (mobile app can pair, launch tasks, stream logs)
- Agent server running with at least one successful Claude task that modified files

---

## Steps

### 1. Add file watcher to agent server

**`apps/agent/src/services/file-watcher.ts`**:

- Watches the project directory for changes using `fs.watch` (recursive)
- Ignores: `node_modules/`, `.git/`, `dist/`, `*.lock`
- On change: debounce (500ms), compute diff, emit event
- Tracks changes per-task (associates file modifications with the running task)

**Pre-task snapshot**:
- Before starting a task, snapshot the working tree state
- If git repo: use `git status` + `git stash create` for clean baseline
- If not git: store file hashes of tracked files

### 2. Add diff generation

**`apps/agent/src/services/diff-generator.ts`**:

- For git repos: `git diff` for modified files, `git diff --cached` for staged
- For non-git: compute unified diff between snapshot and current
- For new files: include full content
- For deleted files: include full previous content
- Output format: unified diff strings

### 3. Extend SQLite schema

Add to agent's SQLite:
```sql
CREATE TABLE file_changes (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  file_path TEXT NOT NULL,
  change_type TEXT NOT NULL,  -- 'created', 'modified', 'deleted'
  diff TEXT,                  -- unified diff content
  status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 4. Extend WebSocket protocol

**New events** (server -> mobile):
- `files.changed` — batch of file changes for a task:
  ```ts
  { taskId: string, changes: { id, filePath, changeType, diff }[] }
  ```

**New commands** (mobile -> server):
- `files.list` — request file changes for a task
- `files.diff` — request full diff for a specific file change
- `files.approve` — approve specific changes (by IDs) or all for a task
- `files.reject` — reject specific changes (reverts files)

> **Note**: File browsing (`/files/tree`) and file reading (`/files/read`) are already implemented as REST endpoints in Phase 2. No need for WebSocket commands for these — use the REST API directly.

**Approve logic**:
- Approved changes: mark as `approved` in SQLite, no file action needed (files already changed)
- Rejected changes: revert the file to its pre-task state using the snapshot

### 5. Add mobile screens for file review

**Update `src/screens/TaskDetailScreen.tsx`**:
- Add a "Changes" tab alongside the log view
- Badge showing number of pending file changes

**`src/components/files/FileChangeList.tsx`**:
- List of changed files with icons (green + for created, yellow ~ for modified, red - for deleted)
- Tap a file -> navigate to DiffScreen
- Batch approve/reject buttons at bottom

**`src/screens/DiffScreen.tsx`**:
- Renders unified diff with syntax highlighting
- Additions in green background, deletions in red background
- Line numbers
- Per-file approve/reject buttons
- Swipe gestures: swipe right = approve, swipe left = reject

**`src/screens/FileBrowserScreen.tsx`** (accessible from Settings or Task Detail):
- Tree view of project files
- Tap a file -> view contents (read-only, syntax highlighted)
- Shows current git branch if available

### 6. Update Zustand stores

**`src/stores/files.ts`**:
- `fileChanges`: Map<taskId, FileChange[]>
- `pendingCount`: derived count of pending changes
- Actions: `setChanges(taskId, changes)`, `approveChange(id)`, `rejectChange(id)`, `approveAll(taskId)`, `rejectAll(taskId)`

### 7. Verify

1. Launch a Claude task from mobile: "add a new /about route to the express app"
2. While task runs, log view shows Claude working
3. When task completes, "Changes" tab shows badge with file count
4. Tap Changes -> see list of created/modified files
5. Tap a file -> see unified diff with green/red highlighting
6. Approve a file -> status changes to approved
7. Reject a file -> file reverts to pre-task state
8. "Approve All" applies all pending changes
9. File browser can navigate and view any project file

---

## CLAUDE.md Updates

After this phase:
- Document the file review workflow
- Update wire protocol types if any were added/changed
- Note the snapshot strategy used (git vs hash-based)

---

## Commit

```
phase 4: file tracking, diff review, approve/reject workflow

- file watcher on agent with git-aware diff generation
- pre-task filesystem snapshots for revert support
- file_changes sqlite table with status tracking
- files.changed events + approve/reject commands over websocket
- mobile diff viewer with syntax highlighting
- file browser for project navigation
- batch approve/reject from mobile
```
