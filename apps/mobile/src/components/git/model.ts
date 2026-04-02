export type { GitFileChangeKind, GitRemoteStatus } from '@pocketdev/shared/types'
import type { GitRemoteStatus } from '@pocketdev/shared/types'

export type GitView = 'changes' | 'history' | 'branches'

export interface GitFileChange {
  id: string
  path: string
  oldPath?: string
  kind: 'modified' | 'added' | 'deleted' | 'renamed'
  staged: boolean
  additions: number
  deletions: number
  summary?: string
  diff?: string
}

export interface GitCommitEntry {
  id: string
  sha: string
  message: string
  author: string
  relativeTime: string
  filesChanged: number
}

export interface GitBranchOption {
  name: string
  current: boolean
  ahead: number
  behind: number
  protected: boolean
  description: string
}

export interface GitRemoteState {
  remote: string
  upstream: string
  ahead: number
  behind: number
  lastPushRelativeTime: string
  requiresAuth: boolean
  status: GitRemoteStatus
}
