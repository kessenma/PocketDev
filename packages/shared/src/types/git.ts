export type GitFileChangeKind = 'modified' | 'added' | 'deleted' | 'renamed'

export type GitRemoteStatus = 'ready' | 'pending' | 'blocked' | 'synced'

export type GitErrorCode =
  | 'not_a_repo'
  | 'dirty_worktree_blocked'
  | 'nothing_to_commit'
  | 'auth_required'
  | 'push_rejected'
  | 'upstream_missing'
  | 'command_failed'

export interface GitSummary {
  repoName: string
  repoPath: string
  currentBranch: {
    name: string
    ahead: number
    behind: number
  }
  remote: {
    name: string
    upstream: string
    ahead: number
    behind: number
    lastPushRelativeTime: string
    requiresAuth: boolean
    status: GitRemoteStatus
  }
}

export interface GitFileChange {
  id: string
  path: string
  oldPath?: string
  kind: GitFileChangeKind
  staged: boolean
  additions: number
  deletions: number
  changedLines: number | null
  hasLineStats: boolean
  isBinary: boolean
}

export interface GitDiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
}

export interface GitDiffResponse {
  path: string
  diff: string
  truncated: boolean
  hunks: GitDiffHunk[]
  isBinary: boolean
}

export interface GitCommitEntry {
  sha: string
  message: string
  author: string
  relativeTime: string
  filesChanged: number
}

export interface GitBranchEntry {
  name: string
  current: boolean
  ahead: number
  behind: number
}

export interface GitCheckoutRequest {
  branchName: string
}

export interface GitCommitRequest {
  message: string
}

export interface GitErrorResponse {
  error: string
  code: GitErrorCode
}

export interface GitMutationResult {
  ok: true
  summary: GitSummary
}

// ─── Repo History types ────────────────────────────────

export interface GitCommitFileEntry {
  path: string
  oldPath?: string
  kind: GitFileChangeKind
  additions: number
  deletions: number
}

export type GitCommitOrigin = 'app' | 'task' | 'external'

export interface GitDetailedCommitEntry extends GitCommitEntry {
  fullSha: string
  authorEmail?: string
  committedAt: string // ISO 8601 (not relative)
  branch?: string
  origin?: GitCommitOrigin
  files: GitCommitFileEntry[]
}

export interface GitHistorySyncStatus {
  lastSyncedSha: string | null
  headSha: string
  pendingCommits: number
}

export interface GitHistorySyncResult {
  newCommits: number
  latestSha: string | null
}

export interface GitDetailedHistoryResponse {
  commits: GitDetailedCommitEntry[]
  hasMore: boolean
}
