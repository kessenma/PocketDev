import { create } from 'zustand'
import type {
  GitBranchOption,
  GitCommitEntry,
  GitFileChange,
  GitRemoteState,
  GitView,
} from '../components/git/model'
import {
  fetchGitSummary,
  fetchGitChanges,
  fetchGitDiff,
  fetchGitHistory,
  fetchGitBranches,
  postGitCheckout,
  postGitCommit,
  postGitPush,
  postGitPull,
  fetchDetailedHistory,
  triggerHistorySync,
  fetchGitStashList,
  postGitStash,
  postGitStashPop,
  postGitStashApply,
  deleteGitStash,
  fetchGitMergeState,
  postGitMergeAbort,
} from '../services/api'
import { useConnectionStore } from './connection'
import type { GitSummary, GitBranchEntry, GitDetailedCommitEntry, GitStashEntry, GitMergeState } from '@pocketdev/shared/types'
import { getModuleDb } from '../db/DatabaseProvider'
import {
  upsertGitCommitsForProject,
  getCachedGitCommits,
  pruneOldCommits,
  getTaskCountForBranch,
} from '../db/gitHistoryOperations'
import { emitGitEvent } from '../services/gitEventBus'

type GitState = {
  repoName: string
  repoPath: string
  currentBranch: string
  activeView: GitView
  selectedFileId: string | null
  commitMessage: string
  changes: GitFileChange[]
  commits: GitCommitEntry[]
  detailedCommits: GitDetailedCommitEntry[]
  branches: GitBranchOption[]
  remote: GitRemoteState
  stashes: GitStashEntry[]
  mergeState: GitMergeState | null
  taskCount: number
  lastActionMessage: string
  isRefreshing: boolean
  isCommitting: boolean
  isPushing: boolean
  isPulling: boolean
  isSyncing: boolean
  isStashing: boolean
  isAborting: boolean
  error: string | null
  selectView: (view: GitView) => void
  selectFile: (fileId: string) => void
  selectBranch: (branchName: string) => void
  updateCommitMessage: (message: string) => void
  refresh: () => void
  syncHistory: () => void
  commit: () => void
  push: () => void
  pull: () => void
  stash: (message?: string) => void
  popStash: (index: number) => void
  applyStash: (index: number) => void
  dropStash: (index: number) => void
  refreshStashes: () => void
  abortMerge: () => void
}

const emptyRemote: GitRemoteState = {
  remote: '',
  upstream: '',
  ahead: 0,
  behind: 0,
  lastPushRelativeTime: 'never',
  requiresAuth: false,
  status: 'synced',
}

function getServer() {
  return useConnectionStore.getState().server
}

function summaryToRemote(summary: GitSummary): GitRemoteState {
  return {
    remote: summary.remote.name,
    upstream: summary.remote.upstream,
    ahead: summary.remote.ahead,
    behind: summary.remote.behind,
    lastPushRelativeTime: summary.remote.lastPushRelativeTime,
    requiresAuth: summary.remote.requiresAuth,
    status: summary.remote.status,
  }
}

function branchEntryToOption(entry: GitBranchEntry): GitBranchOption {
  return {
    name: entry.name,
    current: entry.current,
    ahead: entry.ahead,
    behind: entry.behind,
    protected: false,
    description: '',
  }
}

function describeChange(change: {
  kind: string
  changedLines: number | null
  hasLineStats: boolean
  isBinary: boolean
}) {
  if (change.isBinary) return 'Binary or generated file'
  if (change.hasLineStats && change.changedLines != null) {
    if (change.changedLines === 1) return '1 changed line'
    return `${change.changedLines} changed lines`
  }
  if (change.kind === 'renamed') return 'Renamed file'
  return 'File changed'
}

function changeToMobile(change: {
  id: string
  path: string
  oldPath?: string
  kind: string
  staged: boolean
  additions: number
  deletions: number
  changedLines: number | null
  hasLineStats: boolean
  isBinary: boolean
}): GitFileChange {
  return {
    id: change.id,
    path: change.path,
    oldPath: change.oldPath,
    kind: change.kind as GitFileChange['kind'],
    staged: change.staged,
    additions: change.additions,
    deletions: change.deletions,
    changedLines: change.changedLines,
    hasLineStats: change.hasLineStats,
    isBinary: change.isBinary,
    summary: describeChange(change),
  }
}

function commitToMobile(commit: { sha: string; message: string; author: string; relativeTime: string; filesChanged: number }): GitCommitEntry {
  return {
    id: commit.sha,
    sha: commit.sha,
    message: commit.message,
    author: commit.author,
    relativeTime: commit.relativeTime,
    filesChanged: commit.filesChanged,
  }
}

export const useGitStore = create<GitState>((set, get) => ({
  repoName: '',
  repoPath: '',
  currentBranch: '',
  activeView: 'changes',
  selectedFileId: null,
  commitMessage: '',
  changes: [],
  commits: [],
  detailedCommits: [],
  branches: [],
  remote: emptyRemote,
  stashes: [],
  mergeState: null,
  taskCount: 0,
  lastActionMessage: 'Pull to refresh to load git status from the server.',
  isRefreshing: false,
  isCommitting: false,
  isPushing: false,
  isPulling: false,
  isSyncing: false,
  isStashing: false,
  isAborting: false,
  error: null,

  selectView: (view) => set({ activeView: view }),

  selectFile: async (fileId) => {
    const change = get().changes.find((c) => c.id === fileId)
    if (!change) return

    set({ selectedFileId: fileId })

    // Fetch diff if not already loaded
    if (!change.diff) {
      const server = getServer()
      if (!server) return

      try {
        const result = await fetchGitDiff(server.ip, server.port, change.path, change.staged)
        set((state) => ({
          changes: state.changes.map((c) =>
            c.id === fileId ? { ...c, diff: result.diff, hunks: result.hunks } : c,
          ),
        }))
      } catch {
        // Diff fetch is best-effort
      }
    }
  },

  selectBranch: async (branchName) => {
    const server = getServer()
    if (!server) return

    set({ lastActionMessage: `Switching to ${branchName}...` })

    try {
      const result = await postGitCheckout(server.ip, server.port, branchName)
      if ('ok' in result && result.ok) {
        set({
          repoName: result.summary.repoName,
          currentBranch: branchName,
          remote: summaryToRemote(result.summary),
          lastActionMessage: `Switched to ${branchName}.`,
        })
        emitGitEvent({ type: 'branch_switched', branchName })
        // Refresh all data after branch switch
        get().refresh()
      } else if ('error' in result) {
        set({
          lastActionMessage: result.error,
          error: result.error,
        })
      }
    } catch (err) {
      set({
        lastActionMessage: 'Failed to switch branch.',
        error: err instanceof Error ? err.message : 'Checkout failed',
      })
    }
  },

  updateCommitMessage: (message) => set({ commitMessage: message }),

  refresh: async () => {
    if (get().isRefreshing) return

    const server = getServer()
    if (!server) {
      set({ lastActionMessage: 'Not connected to server.', error: 'Not connected' })
      return
    }

    // Load cached detailed commits from SQLite for instant display
    const db = getModuleDb()
    const currentRepoPath = get().repoPath
    if (db && currentRepoPath && get().detailedCommits.length === 0) {
      try {
        const cached = await getCachedGitCommits(db, currentRepoPath, 50, 0)
        if (cached.length > 0) {
          set({ detailedCommits: cached })
          console.log('[git] Loaded', cached.length, 'cached commits from SQLite')
        }
      } catch { /* non-fatal */ }
    }

    set({ isRefreshing: true, lastActionMessage: 'Pulling latest changes...', error: null })

    // Attempt pull before refreshing status; errors are non-fatal
    let pullMessage: string | null = null
    try {
      const pullResult = await postGitPull(server.ip, server.port)
      if ('ok' in pullResult && pullResult.ok) {
        pullMessage = `Pulled from ${pullResult.summary.remote.upstream}.`
      } else if ('error' in pullResult) {
        const code = pullResult.code
        if (code === 'dirty_worktree_blocked') {
          pullMessage = 'Pull skipped: uncommitted changes.'
        } else if (code === 'upstream_missing') {
          pullMessage = 'No upstream branch configured.'
        } else if (code === 'auth_required') {
          pullMessage = 'Pull failed: authentication required.'
        } else {
          pullMessage = pullResult.error
        }
      }
    } catch {
      // Non-fatal — status refresh continues regardless
    }

    try {
      const [summary, changes, commits, branches, stashes, mergeState] = await Promise.all([
        fetchGitSummary(server.ip, server.port),
        fetchGitChanges(server.ip, server.port),
        fetchGitHistory(server.ip, server.port),
        fetchGitBranches(server.ip, server.port),
        fetchGitStashList(server.ip, server.port).catch(() => get().stashes),
        fetchGitMergeState(server.ip, server.port).catch(() => get().mergeState),
      ])

      const branchName = summary.currentBranch.name
      set({
        repoName: summary.repoName,
        repoPath: summary.repoPath,
        currentBranch: branchName,
        changes: changes.map(changeToMobile),
        commits: commits.map(commitToMobile),
        branches: branches.map(branchEntryToOption),
        remote: summaryToRemote(summary),
        stashes,
        mergeState,
        selectedFileId: changes.length > 0 ? changes[0].id : null,
        isRefreshing: false,
        lastActionMessage: pullMessage ?? (changes.length > 0
          ? `${changes.length} changes on ${branchName}.`
          : `Working tree is clean on ${branchName}.`),
      })
      emitGitEvent({ type: 'refresh_completed', branchName })

      // Background: sync + fetch detailed history and cache to SQLite
      triggerHistorySync(server.ip, server.port)
        .catch(() => {}) // sync is best-effort
        .then(() => fetchDetailedHistory(server.ip, server.port, 50, 0))
        .then(async (result) => {
          set({ detailedCommits: result.commits })
          if (db && summary.repoPath && result.commits.length > 0) {
            await upsertGitCommitsForProject(db, summary.repoPath, result.commits)
            await pruneOldCommits(db, summary.repoPath, 200)
            const taskCount = await getTaskCountForBranch(db, summary.repoPath, branchName).catch(() => 0)
            set({ taskCount })
          }
        })
        .catch((e) => console.warn('[git] Background history fetch failed:', e))
    } catch (err) {
      set({
        isRefreshing: false,
        lastActionMessage: 'Failed to load git status.',
        error: err instanceof Error ? err.message : 'Failed to refresh',
      })
    }
  },

  syncHistory: async () => {
    if (get().isSyncing) return
    const server = getServer()
    if (!server) return

    set({ isSyncing: true })
    try {
      // Trigger server-side sync first
      await triggerHistorySync(server.ip, server.port)
      // Fetch detailed history
      const result = await fetchDetailedHistory(server.ip, server.port, 50, 0)
      set({ detailedCommits: result.commits })

      // Cache to local SQLite
      const db = getModuleDb()
      const repoPath = get().repoPath
      if (db && repoPath && result.commits.length > 0) {
        try {
          await upsertGitCommitsForProject(db, repoPath, result.commits)
          await pruneOldCommits(db, repoPath, 200)
        } catch (e) {
          console.warn('[git] Failed to cache commits to SQLite:', e)
        }
      }
    } catch (e) {
      console.warn('[git] syncHistory failed:', e)
    } finally {
      set({ isSyncing: false })
    }
  },

  commit: async () => {
    const state = get()
    const message = state.commitMessage.trim()
    if (!message || state.isCommitting) return

    const server = getServer()
    if (!server) return

    set({ isCommitting: true, lastActionMessage: 'Committing...' })

    try {
      const result = await postGitCommit(server.ip, server.port, message)
      if ('ok' in result && result.ok) {
        const committedBranch = result.summary.currentBranch.name
        set({
          isCommitting: false,
          commitMessage: '',
          remote: summaryToRemote(result.summary),
          lastActionMessage: `Committed to ${committedBranch}.`,
        })
        emitGitEvent({ type: 'commit_made', branchName: committedBranch })
        // Refresh to get updated changes and history
        get().refresh()
      } else if ('error' in result) {
        set({
          isCommitting: false,
          lastActionMessage: result.error,
          error: result.error,
        })
      }
    } catch (err) {
      set({
        isCommitting: false,
        lastActionMessage: 'Commit failed.',
        error: err instanceof Error ? err.message : 'Commit failed',
      })
    }
  },

  push: async () => {
    const state = get()
    if (state.isPushing) return

    const server = getServer()
    if (!server) return

    if (state.remote.ahead === 0) {
      set({ lastActionMessage: 'Nothing to push. Branch is in sync.' })
      return
    }

    set({ isPushing: true, lastActionMessage: 'Pushing...' })

    try {
      const result = await postGitPush(server.ip, server.port)
      if ('ok' in result && result.ok) {
        set({
          isPushing: false,
          remote: summaryToRemote(result.summary),
          lastActionMessage: `Pushed to ${result.summary.remote.upstream}.`,
        })
        emitGitEvent({ type: 'push_completed', branchName: get().currentBranch })
        get().refresh()
      } else if ('error' in result) {
        set({
          isPushing: false,
          lastActionMessage: result.error,
          error: result.error,
        })
      }
    } catch (err) {
      set({
        isPushing: false,
        lastActionMessage: 'Push failed.',
        error: err instanceof Error ? err.message : 'Push failed',
      })
    }
  },

  pull: async () => {
    const state = get()
    if (state.isPulling) return

    const server = getServer()
    if (!server) return

    set({ isPulling: true, lastActionMessage: 'Pulling...' })

    try {
      const result = await postGitPull(server.ip, server.port)
      if ('ok' in result && result.ok) {
        set({
          isPulling: false,
          remote: summaryToRemote(result.summary),
          lastActionMessage: `Pulled from ${result.summary.remote.upstream}.`,
        })
        emitGitEvent({ type: 'pull_completed', branchName: get().currentBranch })
        // Refresh everything + sync history to pick up new commits
        get().refresh()
        get().syncHistory()
      } else if ('error' in result) {
        const code = result.code as string
        const isMergeConflict = code === 'merge_conflict' || code === 'merge_in_progress'
        if (isMergeConflict) {
          // Fetch merge state so the conflict panel can render
          try {
            const mergeState = await fetchGitMergeState(server.ip, server.port)
            set({ isPulling: false, mergeState, lastActionMessage: 'Merge conflict — resolve or abort.' })
          } catch {
            set({ isPulling: false, lastActionMessage: result.error, error: result.error })
          }
        } else {
          set({ isPulling: false, lastActionMessage: result.error, error: result.error })
        }
      }
    } catch (err) {
      set({
        isPulling: false,
        lastActionMessage: 'Pull failed.',
        error: err instanceof Error ? err.message : 'Pull failed',
      })
    }
  },

  refreshStashes: async () => {
    const server = getServer()
    if (!server) return
    try {
      const stashes = await fetchGitStashList(server.ip, server.port)
      set({ stashes })
    } catch { /* non-fatal */ }
  },

  stash: async (message?: string) => {
    if (get().isStashing) return
    const server = getServer()
    if (!server) return

    set({ isStashing: true, lastActionMessage: 'Stashing changes...' })
    try {
      const result = await postGitStash(server.ip, server.port, message)
      if ('ok' in result && result.ok) {
        set({ isStashing: false, lastActionMessage: 'Changes stashed.' })
        get().refreshStashes()
        get().refresh()
      } else if ('error' in result) {
        set({ isStashing: false, lastActionMessage: result.error, error: result.error })
      }
    } catch (err) {
      set({ isStashing: false, lastActionMessage: 'Stash failed.', error: err instanceof Error ? err.message : 'Stash failed' })
    }
  },

  popStash: async (index: number) => {
    const server = getServer()
    if (!server) return
    set({ lastActionMessage: `Popping stash@{${index}}...` })
    try {
      const result = await postGitStashPop(server.ip, server.port, index)
      if ('ok' in result && result.ok) {
        set({ lastActionMessage: 'Stash applied and dropped.' })
        get().refreshStashes()
        get().refresh()
      } else if ('error' in result) {
        set({ lastActionMessage: result.error, error: result.error })
      }
    } catch (err) {
      set({ lastActionMessage: 'Pop failed.', error: err instanceof Error ? err.message : 'Pop failed' })
    }
  },

  applyStash: async (index: number) => {
    const server = getServer()
    if (!server) return
    set({ lastActionMessage: `Applying stash@{${index}}...` })
    try {
      const result = await postGitStashApply(server.ip, server.port, index)
      if ('ok' in result && result.ok) {
        set({ lastActionMessage: 'Stash applied.' })
        get().refresh()
      } else if ('error' in result) {
        set({ lastActionMessage: result.error, error: result.error })
      }
    } catch (err) {
      set({ lastActionMessage: 'Apply failed.', error: err instanceof Error ? err.message : 'Apply failed' })
    }
  },

  dropStash: async (index: number) => {
    const server = getServer()
    if (!server) return
    try {
      await deleteGitStash(server.ip, server.port, index)
      set({ lastActionMessage: `Stash@{${index}} dropped.` })
      get().refreshStashes()
    } catch (err) {
      set({ lastActionMessage: 'Drop failed.', error: err instanceof Error ? err.message : 'Drop failed' })
    }
  },

  abortMerge: async () => {
    if (get().isAborting) return
    const server = getServer()
    if (!server) return

    set({ isAborting: true, lastActionMessage: 'Aborting merge...' })
    try {
      const result = await postGitMergeAbort(server.ip, server.port)
      if ('ok' in result && result.ok) {
        set({ isAborting: false, mergeState: null, lastActionMessage: 'Merge aborted.' })
        get().refresh()
      } else if ('error' in result) {
        set({ isAborting: false, lastActionMessage: result.error, error: result.error })
      }
    } catch (err) {
      set({ isAborting: false, lastActionMessage: 'Abort failed.', error: err instanceof Error ? err.message : 'Abort failed' })
    }
  },
}))
