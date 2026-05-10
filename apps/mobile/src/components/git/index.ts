/**
 * Docs: see `docs/git/mobile-git.md` for the workspace map, entry points, and backend
 * wiring notes. This module is mobile/client-side only today and still needs
 * to be wired into the server-side app.
 */
export { default as GitBadge } from './primitives/GitBadge'
export { default as GitSegmentedControl } from './primitives/GitSegmentedControl'
export { default as GitBranchList } from './branches/GitBranchList'
export { default as GitChangeDetailSheet } from './changes/GitChangeDetailSheet'
export { default as GitChangeList } from './changes/GitChangeList'
export { default as GitCommitComposer } from './changes/GitCommitComposer'
export { default as GitConflictPanel } from './changes/GitConflictPanel'
export { default as GitDiffPreview } from './changes/GitDiffPreview'
export { default as GitRepoSummaryCard } from './changes/GitRepoSummaryCard'
export { default as GitStashPanel } from './changes/GitStashPanel'
export { default as GitStatusSummary } from './changes/GitStatusSummary'
export { default as GitCommitDetailRow } from './history/GitCommitDetailRow'
export { default as GitHistoryList } from './history/GitHistoryList'
export { default as GitHistoryPane } from './history/GitHistoryPane'
export { default as GitPushPanel } from './GitPushPanel'
export { default as GitWorkspace } from './GitWorkspace'
export type {
  GitBranchOption,
  GitCommitEntry,
  GitFileChange,
  GitFileChangeKind,
  GitRemoteState,
  GitRemoteStatus,
  GitView,
} from './model'
