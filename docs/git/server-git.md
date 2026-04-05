# Git Server Integration Plan

> **Status**: Implemented. The git server integration described below is now complete and live. See [docs/mobile/stores.md](../mobile/stores.md) for the current store architecture and [docs/agent/task-system.md](../agent/task-system.md) for agent-side details.

The goal is to connect the mobile git workspace to the PocketDev agent so the UI can display real repository state and execute git actions on the paired server.

## Scope

This plan covers how to back the mobile git UI with real server data for:

- repository summary
- working tree changes
- diff preview
- branch list and branch switching
- commit history
- commit creation
- push readiness and push execution

This plan does not cover:

- multi-repo discovery across the whole machine
- merge conflict resolution UX
- PR or forge integrations
- arbitrary git command execution from mobile

## Current State

Today the mobile git workspace is client-side only:

- `apps/mobile/src/components/git/*` renders from mock state
- `apps/mobile/src/stores/git.ts` is a local prototype store
- refresh, branch switch, commit, and push are local-only interactions
- no real repository data is fetched from the agent

Relevant server-side building blocks that already exist:

- authenticated pairing and device identity
- authenticated WebSocket at `/ws`
- file reading support in `/files/*`
- task and terminal infrastructure for longer-running operations
- an agent process that already runs in the project workspace

## Integration Strategy

Git is more stateful than the server-actions workspace, so the backend should expose a small set of typed git operations rather than trying to mirror the shell directly.

Recommended model:

1. REST for current repository snapshot data
2. REST mutations for branch switch, commit, and push
3. WebSocket only if later needed for long-running operations or progress updates

## Proposed Transport Model

### 1. Snapshot data over REST

Use authenticated REST for views that map to explicit screens:

- `GET /git/summary`
- `GET /git/changes`
- `GET /git/diff`
- `GET /git/history`
- `GET /git/branches`

Reasoning:

- the current mobile UI already behaves like snapshot-based screens
- typed REST payloads map cleanly to the current Zustand store
- it is easier to control repo scope and error handling this way

### 2. Mutations over REST

Use explicit action routes for state-changing operations:

- `POST /git/checkout`
- `POST /git/commit`
- `POST /git/push`
- `POST /git/refresh` only if a dedicated cache invalidation flow is needed

Reasoning:

- branch switch, commit, and push are bounded actions with clear inputs
- this fits mobile error handling better than streaming raw CLI output first

### 3. Optional progress over WebSocket

Add WebSocket only when there is a real need to show long-running progress for:

- fetch or push latency
- auth prompts
- larger diff or history refreshes

This should be later, not phase 1.

## Repository Scope

Before implementing routes, the server needs a clear rule for which repository the mobile git workspace is operating on.

Recommended first cut:

- one active repository rooted at the agent working directory

Optional later expansion:

- explicit repo path selection
- multiple configured workspaces

The backend should not accept arbitrary repository paths from the client in the first version.

## Proposed Server Contracts

## Summary endpoint

`GET /git/summary`

Purpose:

- fill repo header and remote summary

Suggested payload shape:

```ts
type GitSummary = {
  repoName: string
  repoPath: string
  currentBranch: {
    name: string
    ahead: number
    behind: number
    protected: boolean
  }
  remote: {
    remote: string
    upstream: string
    ahead: number
    behind: number
    lastPushRelativeTime: string
    requiresAuth: boolean
    status: 'ready' | 'pending' | 'blocked' | 'synced'
  }
}
```

Suggested sources:

- `git rev-parse`
- `git branch --show-current`
- `git status --short --branch`
- `git remote`

## Changes endpoint

`GET /git/changes`

Purpose:

- populate the change list and status summary

Suggested payload shape:

```ts
type GitFileChange = {
  id: string
  path: string
  oldPath?: string
  kind: 'modified' | 'added' | 'deleted' | 'renamed'
  staged: boolean
  additions: number
  deletions: number
  summary: string
}
```

Suggested sources:

- `git status --porcelain=v1` or `v2`
- `git diff --numstat`
- `git diff --cached --numstat`

## Diff endpoint

`GET /git/diff?path=...&staged=...`

Purpose:

- populate the selected diff preview

Suggested return:

- bounded textual diff
- truncated when too large
- metadata indicating truncation

The mobile UI should not assume the full file diff is always available.

## History endpoint

`GET /git/history`

Purpose:

- populate recent commit history

Suggested payload shape:

```ts
type GitCommitEntry = {
  id: string
  sha: string
  message: string
  author: string
  relativeTime: string
  filesChanged: number
}
```

Suggested sources:

- `git log --stat` with bounded depth
- or separate lightweight `git log` plus per-commit file count extraction

## Branches endpoint

`GET /git/branches`

Purpose:

- populate branch list and ahead/behind state

Suggested payload shape:

```ts
type GitBranchOption = {
  name: string
  current: boolean
  ahead: number
  behind: number
  protected: boolean
  description: string
}
```

Open decision:

- whether branch descriptions are derived from commit messages, config, or omitted

## Checkout endpoint

`POST /git/checkout`

Suggested request:

```ts
{ branchName: string }
```

Response should include:

- updated summary
- updated branch list
- updated change counts
- any warning about dirty working tree constraints

## Commit endpoint

`POST /git/commit`

Suggested request:

```ts
{ message: string }
```

Open decisions:

- whether the first version commits all staged files only
- whether the server should support staging from mobile later

Recommended first cut:

- commit only what is already staged
- if nothing is staged, return a typed validation error

## Push endpoint

`POST /git/push`

Suggested response:

- updated remote status
- success or typed failure reason

Potential failure categories:

- auth required
- remote divergence
- no upstream
- network failure
- hook rejection

## Execution Model Choices

There are two realistic models for the first version.

### Option A: direct server-managed git service

The agent exposes typed git routes and internally shells out to git commands.

Pros:

- best fit for the current UI
- small payloads
- easier validation
- easier error mapping

Cons:

- requires a dedicated git service layer in the agent

### Option B: route everything through the existing terminal or task system

Pros:

- lower short-term plumbing if treated as raw shell

Cons:

- weak typing
- harder to render cleanly in the mobile UI
- harder to distinguish validation versus transport failure

Recommended approach:

- use Option A for the core git workspace
- reserve terminal or task execution for advanced git workflows later

## Suggested Agent Structure

If implemented later, the server side could be organized as:

- `apps/agent/src/routes/git.ts`
- `apps/agent/src/services/git.ts`

The service layer should:

- operate only within an allowed repository root
- normalize git CLI output into typed models
- map command failures into stable API error categories

## Error Handling Plan

The mobile store should receive structured error types rather than raw stderr whenever possible.

Useful categories:

- `repo_not_found`
- `not_a_repo`
- `dirty_worktree_blocked`
- `nothing_to_commit`
- `auth_required`
- `push_rejected`
- `upstream_missing`
- `command_failed`

The server can still log raw stderr internally for debugging.

## Security and Safety Constraints

Requirements:

- require the same device authentication already used elsewhere
- keep repository scope server-controlled
- avoid arbitrary shell input from the client
- bound diff sizes and log payload sizes
- sanitize or suppress sensitive remote URLs

## Rollout Plan

### Phase 1

- add summary, changes, diff, history, and branches endpoints
- update the mobile git store to fetch real repo state on refresh
- keep commit and push buttons disabled or preview-only until mutations exist

### Phase 2

- add checkout, commit, and push mutation routes
- add typed validation and failure states
- update the mobile store to reconcile action results into the current workspace

### Phase 3

- add optional WebSocket progress or task-backed flows for slow operations
- consider staging controls, auth prompts, and advanced conflict handling

## Open Questions

- should the mobile workspace operate on only one repo or support many
- how should protected branches be defined
- whether push auth should be handled outside PocketDev or mediated through it
- whether staged state is enough for v1 or if unstaged-to-staged actions are needed
- what diff size limits are acceptable on mobile

## Recommendation

Build a typed git service in the agent with a fixed repository scope and explicit mutation routes. That matches the mobile UI you already have and avoids coupling the core git workflow to raw shell or terminal behavior too early.
