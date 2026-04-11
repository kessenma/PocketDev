export type GitEvent =
  | { type: 'branch_switched'; branchName: string }
  | { type: 'refresh_completed'; branchName: string }
  | { type: 'commit_made'; branchName: string }
  | { type: 'push_completed'; branchName: string }
  | { type: 'pull_completed'; branchName: string }
  | { type: 'fetch_completed'; branchName: string }

type GitEventListener = (event: GitEvent) => void

const listeners = new Set<GitEventListener>()

export function subscribeToGitEvents(listener: GitEventListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitGitEvent(event: GitEvent): void {
  for (const listener of listeners) {
    listener(event)
  }
}
