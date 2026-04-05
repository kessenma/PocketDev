# Git UI

> **Status**: Fully server-integrated. For the git store architecture, see [docs/mobile/stores.md](../mobile/stores.md).

This document covers the mobile git workspace under `apps/mobile/src/components/git/`.

## Purpose

The git workspace is fully connected to the paired PocketDev agent. All operations execute against real repositories on the server via REST API: `fetchGitSummary`, `fetchGitChanges`, `fetchGitDiff`, `fetchGitHistory`, `fetchGitBranches`, `postGitCheckout`, `postGitCommit`, and `postGitPush`.

Primary git areas represented in the UI:

- repository summary and upstream status
- working tree change list
- diff preview
- commit composer
- push status and readiness
- branch browsing
- recent commit history

## Entry Points

- `apps/mobile/src/components/git/GitWorkspace.tsx`
  - top-level workspace composition and segmented views
- `apps/mobile/src/stores/git.ts`
  - prototype Zustand store and mock git data
- `apps/mobile/src/components/git/index.ts`
  - barrel export for the module

## Component Map

### Shared primitives

- `apps/mobile/src/components/git/GitCard.tsx`
  - shared card shell used across the git workspace
- `apps/mobile/src/components/git/GitBadge.tsx`
  - compact status badge for git states
- `apps/mobile/src/components/git/GitSegmentedControl.tsx`
  - segmented control for `changes`, `history`, and `branches`

### Workspace sections

- `apps/mobile/src/components/git/GitRepoSummaryCard.tsx`
  - repo name, path, branch, and remote summary
- `apps/mobile/src/components/git/GitStatusSummary.tsx`
  - high-level working tree metrics
- `apps/mobile/src/components/git/GitChangeList.tsx`
  - staged and unstaged file changes
- `apps/mobile/src/components/git/GitDiffPreview.tsx`
  - focused diff preview for the selected file
- `apps/mobile/src/components/git/GitCommitComposer.tsx`
  - commit message entry and commit action
- `apps/mobile/src/components/git/GitPushPanel.tsx`
  - push readiness, remote sync, and push action
- `apps/mobile/src/components/git/GitHistoryList.tsx`
  - recent commits and changed-file counts
- `apps/mobile/src/components/git/GitBranchList.tsx`
  - branch selection and ahead/behind state

### Types and exports

- `apps/mobile/src/components/git/model.ts`
  - typed git view, branch, commit, file change, and remote models
- `apps/mobile/src/components/git/index.ts`
  - barrel export for the module

## Current Behavior

- all data is local mock data
- refresh only updates the status banner from the prototype store
- commit creates a local mock commit entry only
- push only updates local mock sync state
- branch switching only changes the client-side prototype state
- the workspace supports phone and tablet split layouts

## Expected Backend Wiring Later

When the server-side app is ready, this client-only store should be replaced or adapted to consume real git-backed data and actions from the paired server.

Expected server-backed capabilities:

- fetch repository status, diffs, history, and branches
- execute branch checkout
- create commits
- push to remotes
- surface auth and divergence errors from real server execution

Suggested next backend-facing additions:

- define a shared git workspace payload between mobile and server
- map quick mobile actions to terminal or server endpoints for real git execution
- decide whether diff/history data is fetched on demand or streamed incrementally

See `docs/git/server-git.md` for the server-side planning document.

## Update Rule

If a git component, store contract, or workspace entry point changes, update this document in the same change so the module map stays accurate.
