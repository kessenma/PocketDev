/**
 * Docs: see `docs/git/mobile-git.md` for the workspace map, entry points, and backend
 * wiring notes. This module is mobile/client-side only today and still needs
 * to be wired into the server-side app.
 */
export { default as GitBadge } from './GitBadge'
export {
  GitCard,
  GitCardContent,
  GitCardDescription,
  GitCardHeader,
  GitCardTitle,
} from './GitCard'
export { default as GitBranchList } from './GitBranchList'
export { default as GitChangeList } from './GitChangeList'
export { default as GitCommitComposer } from './GitCommitComposer'
export { default as GitDiffPreview } from './GitDiffPreview'
export { default as GitHistoryList } from './GitHistoryList'
export { default as GitPushPanel } from './GitPushPanel'
export { default as GitRepoSummaryCard } from './GitRepoSummaryCard'
export { default as GitSegmentedControl } from './GitSegmentedControl'
export { default as GitStatusSummary } from './GitStatusSummary'
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
