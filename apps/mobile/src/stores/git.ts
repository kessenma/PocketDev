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
} from '../services/api'
import { useConnectionStore } from './connection'
import type { GitSummary, GitBranchEntry, GitDetailedCommitEntry } from '@pocketdev/shared/types'
import { getModuleDb } from '../db/DatabaseProvider'
import {
  upsertGitCommitsForProject,
  getCachedGitCommits,
  pruneOldCommits,
} from '../db/gitHistoryOperations'

type GitState = {
  repoName: string
  repoPath: string
  activeView: GitView
  selectedFileId: string | null
  commitMessage: string
  changes: GitFileChange[]
  commits: GitCommitEntry[]
  detailedCommits: GitDetailedCommitEntry[]
  branches: GitBranchOption[]
  remote: GitRemoteState
  lastActionMessage: string
  isRefreshing: boolean
  isCommitting: boolean
  isPushing: boolean
  isPulling: boolean
  isSyncing: boolean
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

function changeToMobile(change: { id: string; path: string; oldPath?: string; kind: string; staged: boolean; additions: number; deletions: number }): GitFileChange {
  return {
    id: change.id,
    path: change.path,
    oldPath: change.oldPath,
    kind: change.kind as GitFileChange['kind'],
    staged: change.staged,
    additions: change.additions,
    deletions: change.deletions,
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
  activeView: 'changes',
  selectedFileId: null,
  commitMessage: '',
  changes: [],
  commits: [],
  detailedCommits: [],
  branches: [],
  remote: emptyRemote,
  lastActionMessage: 'Pull to refresh to load git status from the server.',
  isRefreshing: false,
  isCommitting: false,
  isPushing: false,
  isPulling: false,
  isSyncing: false,
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
            c.id === fileId ? { ...c, diff: result.diff } : c,
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
          remote: summaryToRemote(result.summary),
          lastActionMessage: `Switched to ${branchName}.`,
        })
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

    set({ isRefreshing: true, lastActionMessage: 'Refreshing git status...', error: null })

    try {
      const [summary, changes, commits, branches] = await Promise.all([
        fetchGitSummary(server.ip, server.port),
        fetchGitChanges(server.ip, server.port),
        fetchGitHistory(server.ip, server.port),
        fetchGitBranches(server.ip, server.port),
      ])

      const branchName = summary.currentBranch.name
      set({
        repoName: summary.repoName,
        repoPath: summary.repoPath,
        changes: changes.map(changeToMobile),
        commits: commits.map(commitToMobile),
        branches: branches.map(branchEntryToOption),
        remote: summaryToRemote(summary),
        selectedFileId: changes.length > 0 ? changes[0].id : null,
        isRefreshing: false,
        lastActionMessage: changes.length > 0
          ? `${changes.length} changes on ${branchName}.`
          : `Working tree is clean on ${branchName}.`,
      })

      // Background: sync + fetch detailed history and cache to SQLite
      triggerHistorySync(server.ip, server.port)
        .catch(() => {}) // sync is best-effort
        .then(() => fetchDetailedHistory(server.ip, server.port, 50, 0))
        .then(async (result) => {
          set({ detailedCommits: result.commits })
          if (db && summary.repoPath && result.commits.length > 0) {
            await upsertGitCommitsForProject(db, summary.repoPath, result.commits)
            await pruneOldCommits(db, summary.repoPath, 200)
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
        set({
          isCommitting: false,
          commitMessage: '',
          remote: summaryToRemote(result.summary),
          lastActionMessage: `Committed to ${result.summary.currentBranch.name}.`,
        })
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
        // Refresh everything + sync history to pick up new commits
        get().refresh()
        get().syncHistory()
      } else if ('error' in result) {
        set({
          isPulling: false,
          lastActionMessage: result.error,
          error: result.error,
        })
      }
    } catch (err) {
      set({
        isPulling: false,
        lastActionMessage: 'Pull failed.',
        error: err instanceof Error ? err.message : 'Pull failed',
      })
    }
  },
}))
