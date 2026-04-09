# AI Integration with Repo History

How on-device AI and repo history data work together to provide intelligent context for coding tasks.

## File Suggestions (Current)

The on-device embedding model (all-MiniLM-L6-V2, 384d) generates vectors for file paths, then cosine-similarity ranks them against the user's task prompt.

### Embedding Pipeline
```
File tree from server → flattenTree(500 max)
  → enrichPath() adds context (filename, parent dirs, file type label)
  → embedBatch() via ExecuTorch TextEmbeddingsModule
  → Persist to SQLite file_embeddings table
  → Cosine similarity search against prompt embedding
```

### Vec0 vs Fallback
- **vec0 available**: Native `distance()` function in SQLite — fastest path
- **Fallback**: Load all embeddings into JS, compute cosine similarity manually
- Probe at init time: try creating a vec0 virtual table, catch if unavailable
- Both paths produce identical results

### Persistence (SQLite replaces MMKV)
- Embeddings stored in `file_embeddings` table as BLOBs (Float32Array → hex)
- No TTL — valid until file set changes (detected by count mismatch)
- Survives app restart without re-embedding (~15s saved on typical 300-file project)
- `vectorOperations.ts` handles insert/search/delete with vec0-aware routing

## Task-Commit Linkage

The `task_commits` junction table enables powerful queries:

| Query | How |
|-------|-----|
| "What files did task X change?" | `task_commits → git_commits → git_commit_files` |
| "Which task introduced this commit?" | Reverse lookup on `task_commits` |
| "Show full diff of task X" | All commits for task, drill into file changes |
| "How often is this file changed by AI?" | Count tasks touching file via `git_commit_files` |

### Future: Task Summaries
When viewing a completed task, the detail pane could show:
- Number of commits produced
- Files added/modified/deleted breakdown
- Lines changed (+/-)
- Drill-down into per-commit diffs

## Future AI Applications

### Commit-Aware File Suggestions
Instead of just embedding file paths, weight suggestions by recent activity:
- Files changed in recent commits get a boost
- Files frequently changed together (co-change patterns) are suggested as a group
- `file_metadata.last_commit_sha` tracks per-file freshness

### Change Pattern Analysis
With commit history in SQLite, AI can analyze:
- **Hotspots**: Files changed most frequently
- **Co-change clusters**: Files that always change together
- **Churn detection**: Files with high add/delete ratios (unstable code)
- **Author patterns**: Which areas different contributors focus on

### Commit Message Generation
When the user creates a commit via the app:
- Look at staged changes (`git_commit_files` patterns)
- Generate a commit message based on file types, change kinds, and similar past messages

### Task Planning Context
When starting a new task:
- Include recent commit history as context for the AI agent
- "These files were recently modified" helps the agent understand active work areas
- Task-commit history shows what previous tasks did, avoiding duplicate work

### Reviewer Suggestions
Based on file ownership patterns in `git_commit_files`:
- Suggest reviewers who have recently modified the same files
- Flag changes to files owned by others

## Key Files

| File | Purpose |
|------|---------|
| `apps/mobile/src/db/vectorOperations.ts` | Vec0/fallback embedding CRUD |
| `apps/mobile/src/db/gitHistoryOperations.ts` | Git commit cache CRUD |
| `apps/mobile/src/stores/on-device-ai.ts` | Embedding index lifecycle |
| `apps/mobile/src/stores/git.ts` | Git state + history sync |
| `apps/agent/src/services/git-history-sync.ts` | Server-side sync engine |
| `apps/agent/src/routes/git.ts` | History API endpoints |
| `packages/shared/src/types/git.ts` | Shared type definitions |
