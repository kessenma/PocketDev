import { resolve, basename } from 'node:path'
import { existsSync } from 'node:fs'
import type {
  GitSummary,
  GitFileChange,
  GitDiffResponse,
  GitDiffHunk,
  GitCommitEntry,
  GitBranchEntry,
  GitErrorCode,
  GitFileChangeKind,
  GitRemoteStatus,
  GitStashEntry,
  GitMergeState,
} from '@pocketdev/shared/types'
import { getActiveProjectPath } from '../system/projects.ts'

const MAX_DIFF_BYTES = 50_000
const DEFAULT_HISTORY_LIMIT = 20

export class GitServiceError extends Error {
  statusCode: number
  code: GitErrorCode

  constructor(message: string, code: GitErrorCode, statusCode = 400) {
    super(message)
    this.code = code
    this.statusCode = statusCode
  }
}

async function exec(cmd: string, cwd?: string): Promise<{ stdout: string; exitCode: number; stderr: string }> {
  const proc = Bun.spawn(['bash', '-lc', cmd], {
    cwd: cwd ?? await getActiveProjectPath(),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited
  return { stdout: stdout.trim(), exitCode: proc.exitCode ?? 1, stderr: stderr.trim() }
}

async function ensureRepo(): Promise<string> {
  const cwd = await getActiveProjectPath()
  const { stdout, exitCode } = await exec('git rev-parse --show-toplevel', cwd)
  if (exitCode !== 0 || !stdout) {
    throw new GitServiceError('Not a git repository', 'not_a_repo', 400)
  }
  return stdout
}

export async function getGitSummary(): Promise<GitSummary> {
  const repoPath = await ensureRepo()
  const repoName = basename(repoPath)

  const [branchResult, statusResult, remoteResult] = await Promise.all([
    exec('git branch --show-current'),
    exec('git status -sb --porcelain'),
    exec('git remote -v'),
  ])

  const branchName = branchResult.stdout || 'HEAD'

  // Parse ahead/behind from status header: ## main...origin/main [ahead 2, behind 1]
  const statusHeader = statusResult.stdout.split('\n')[0] ?? ''
  const aheadMatch = statusHeader.match(/ahead (\d+)/)
  const behindMatch = statusHeader.match(/behind (\d+)/)
  const ahead = aheadMatch ? parseInt(aheadMatch[1], 10) : 0
  const behind = behindMatch ? parseInt(behindMatch[1], 10) : 0

  // Parse remote
  const remoteLines = remoteResult.stdout.split('\n').filter(Boolean)
  const remoteName = remoteLines.length > 0
    ? remoteLines[0].split('\t')[0]
    : ''
  const upstream = remoteName ? `${remoteName}/${branchName}` : ''

  let remoteStatus: GitRemoteStatus = 'synced'
  if (!remoteName) remoteStatus = 'pending'
  else if (behind > 0) remoteStatus = 'blocked'
  else if (ahead > 0) remoteStatus = 'ready'

  // Last push time
  const { stdout: lastPushTime } = await exec(
    `git log -1 --format=%ar ${upstream} 2>/dev/null || echo "never"`,
  )

  return {
    repoName,
    repoPath,
    currentBranch: { name: branchName, ahead, behind },
    remote: {
      name: remoteName,
      upstream,
      ahead,
      behind,
      lastPushRelativeTime: lastPushTime || 'never',
      requiresAuth: false,
      status: remoteStatus,
    },
  }
}

export async function getGitChanges(): Promise<GitFileChange[]> {
  await ensureRepo()

  const [porcelain, stagedStats, unstagedStats] = await Promise.all([
    exec('git status --porcelain=v1'),
    exec('git diff --cached --numstat'),
    exec('git diff --numstat'),
  ])

  if (!porcelain.stdout) return []

  const stagedMap = parseNumstat(stagedStats.stdout)
  const unstagedMap = parseNumstat(unstagedStats.stdout)

  const changes: GitFileChange[] = []

  for (const line of porcelain.stdout.split('\n')) {
    if (!line) continue

    const indexStatus = line[0]
    const workTreeStatus = line[1]
    const rest = line.slice(3)

    // Handle renames: "R  old -> new"
    const arrowIndex = rest.indexOf(' -> ')
    let path: string
    let oldPath: string | undefined

    if (arrowIndex !== -1) {
      oldPath = rest.slice(0, arrowIndex)
      path = rest.slice(arrowIndex + 4)
    } else {
      path = rest
    }

    // Staged change
    if (indexStatus && indexStatus !== ' ' && indexStatus !== '?') {
      const stats = stagedMap.get(path)
      changes.push({
        id: `staged:${path}`,
        path,
        oldPath,
        kind: statusToKind(indexStatus),
        staged: true,
        additions: stats?.additions ?? 0,
        deletions: stats?.deletions ?? 0,
        changedLines: stats?.changedLines ?? null,
        hasLineStats: stats?.hasLineStats ?? false,
        isBinary: stats?.isBinary ?? false,
      })
    }

    // Unstaged change (including untracked)
    if (workTreeStatus && workTreeStatus !== ' ') {
      const stats = unstagedMap.get(path)
      const isUntracked = indexStatus === '?'
      changes.push({
        id: `unstaged:${path}`,
        path,
        oldPath,
        kind: isUntracked ? 'added' : statusToKind(workTreeStatus),
        staged: false,
        additions: stats?.additions ?? 0,
        deletions: stats?.deletions ?? 0,
        changedLines: stats?.changedLines ?? null,
        hasLineStats: stats?.hasLineStats ?? false,
        isBinary: stats?.isBinary ?? false,
      })
    }
  }

  return changes
}

export async function getGitDiff(path: string, staged: boolean): Promise<GitDiffResponse> {
  await ensureRepo()

  const stagedFlag = staged ? '--cached' : ''
  const { stdout, exitCode } = await exec(
    `git diff ${stagedFlag} -- ${escapeShellArg(path)}`,
  )

  if (exitCode !== 0) {
    // For untracked files, show the whole file as additions
    if (!staged) {
      const repoPath = await getActiveProjectPath()
      const { stdout: content } = await exec(`git show :${escapeShellArg(path)} 2>/dev/null || cat ${escapeShellArg(resolve(repoPath, path))} 2>/dev/null || echo ""`, repoPath)
      const lineCount = content.length === 0 ? 0 : content.split('\n').length
      const diff = content
        ? [
            `diff --git a/${path} b/${path}`,
            'new file mode 100644',
            '--- /dev/null',
            `+++ b/${path}`,
            `@@ -0,0 +1,${lineCount} @@`,
            ...content.split('\n').map((l) => `+${l}`),
          ].join('\n')
        : ''
      return {
        path,
        diff: truncateDiff(diff),
        truncated: diff.length > MAX_DIFF_BYTES,
        hunks: parseDiffHunks(diff),
        isBinary: false,
      }
    }
  }

  return {
    path,
    diff: truncateDiff(stdout),
    truncated: stdout.length > MAX_DIFF_BYTES,
    hunks: parseDiffHunks(stdout),
    isBinary: isBinaryDiff(stdout),
  }
}

export async function getGitHistory(limit?: number): Promise<GitCommitEntry[]> {
  await ensureRepo()

  const count = Math.min(limit ?? DEFAULT_HISTORY_LIMIT, 100)
  const { stdout } = await exec(
    `git log -n ${count} --format='%H%x1f%s%x1f%an%x1f%ar' --stat`,
  )

  if (!stdout) return []

  const entries: GitCommitEntry[] = []
  const blocks = stdout.split('\n\n')

  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean)
    if (lines.length === 0) continue

    const firstLine = lines[0]
    const parts = firstLine.split('\x1f')
    if (parts.length < 4) continue

    // Count "file changed" lines (lines containing " | ")
    const fileLines = lines.filter((l) => l.includes(' | '))

    entries.push({
      sha: parts[0].slice(0, 7),
      message: parts[1],
      author: parts[2],
      relativeTime: parts[3],
      filesChanged: fileLines.length,
    })
  }

  return entries
}

export async function getGitBranches(): Promise<GitBranchEntry[]> {
  await ensureRepo()

  const { stdout } = await exec(
    "git branch -vv --format='%(HEAD)%(refname:short)%x1f%(upstream:track)%x1f%(upstream:short)'",
  )

  if (!stdout) return []

  return stdout.split('\n').filter(Boolean).map((line) => {
    const current = line.startsWith('*')
    const rest = current ? line.slice(1) : line
    const [name, track, _upstream] = rest.split('\x1f')

    const aheadMatch = track?.match(/ahead (\d+)/)
    const behindMatch = track?.match(/behind (\d+)/)

    return {
      name: name.trim(),
      current,
      ahead: aheadMatch ? parseInt(aheadMatch[1], 10) : 0,
      behind: behindMatch ? parseInt(behindMatch[1], 10) : 0,
    }
  })
}

export async function checkoutBranch(branchName: string): Promise<GitSummary> {
  await ensureRepo()

  const { exitCode, stderr } = await exec(`git checkout ${escapeShellArg(branchName)}`)

  if (exitCode !== 0) {
    if (stderr.includes('Please commit your changes or stash them')) {
      throw new GitServiceError(
        'Cannot switch branches with uncommitted changes',
        'dirty_worktree_blocked',
      )
    }
    throw new GitServiceError(stderr || 'Checkout failed', 'command_failed')
  }

  return getGitSummary()
}

export async function commitStaged(message: string): Promise<GitSummary> {
  await ensureRepo()

  if (!message.trim()) {
    throw new GitServiceError('Commit message is required', 'nothing_to_commit')
  }

  const { exitCode, stderr } = await exec(
    `git commit -m ${escapeShellArg(message)}`,
  )

  if (exitCode !== 0) {
    if (stderr.includes('nothing to commit') || stderr.includes('no changes added')) {
      throw new GitServiceError('Nothing to commit', 'nothing_to_commit')
    }
    throw new GitServiceError(stderr || 'Commit failed', 'command_failed')
  }

  return getGitSummary()
}

export async function pushCurrent(): Promise<GitSummary> {
  await ensureRepo()

  const { exitCode, stderr } = await exec('git push')

  if (exitCode !== 0) {
    if (stderr.includes('Authentication') || stderr.includes('Permission denied') || stderr.includes('could not read Username')) {
      throw new GitServiceError('Push requires authentication', 'auth_required')
    }
    if (stderr.includes('rejected') || stderr.includes('non-fast-forward')) {
      throw new GitServiceError('Push rejected — remote has diverged', 'push_rejected')
    }
    if (stderr.includes('No configured push destination') || stderr.includes('has no upstream')) {
      throw new GitServiceError('No upstream branch configured', 'upstream_missing')
    }
    throw new GitServiceError(stderr || 'Push failed', 'command_failed')
  }

  return getGitSummary()
}

export async function pullCurrent(): Promise<GitSummary> {
  await ensureRepo()

  const { exitCode, stdout, stderr } = await exec('git pull')

  if (exitCode !== 0) {
    if (stderr.includes('Authentication') || stderr.includes('Permission denied') || stderr.includes('could not read Username')) {
      throw new GitServiceError('Pull requires authentication', 'auth_required')
    }
    if (stderr.includes('no tracking information') || stderr.includes('no upstream')) {
      throw new GitServiceError('No upstream branch configured', 'upstream_missing')
    }
    if (stderr.includes('uncommitted changes') || stderr.includes('local changes') || stderr.includes('Please commit or stash')) {
      throw new GitServiceError('Cannot pull with uncommitted changes — commit or stash first', 'dirty_worktree_blocked')
    }
    // Merge conflict — check if MERGE_HEAD now exists
    const combined = stdout + '\n' + stderr
    if (combined.includes('CONFLICT') || combined.includes('Automatic merge failed')) {
      const mergeState = await getMergeState()
      throw new GitServiceError(
        `Merge conflict in ${mergeState.conflictedPaths.length} file(s) — resolve or abort`,
        'merge_conflict',
      )
    }
    throw new GitServiceError(stderr || 'Pull failed', 'command_failed')
  }

  return getGitSummary()
}

// ─── Stash operations ─────────────────────────────────

export async function listStashes(): Promise<GitStashEntry[]> {
  await ensureRepo()

  const { stdout } = await exec("git stash list --format='%gd%x1f%s%x1f%cr'")
  if (!stdout) return []

  const entries: GitStashEntry[] = []
  for (const line of stdout.split('\n')) {
    if (!line) continue
    const parts = line.split('\x1f')
    if (parts.length < 3) continue

    const ref = parts[0] // stash@{0}
    const subject = parts[1] // "WIP on main: abc1234 msg" or "On main: custom msg"
    const relativeTime = parts[2]

    const indexMatch = ref.match(/stash@\{(\d+)\}/)
    const index = indexMatch ? parseInt(indexMatch[1], 10) : 0

    // Extract branch from "WIP on <branch>: ..." or "On <branch>: ..."
    const branchMatch = subject.match(/^(?:WIP on |On )([^:]+):/)
    const branch = branchMatch ? branchMatch[1].trim() : ''

    entries.push({ index, branch, message: subject, relativeTime })
  }

  return entries
}

export async function saveStash(message?: string): Promise<void> {
  await ensureRepo()

  const cmd = message
    ? `git stash push -m ${escapeShellArg(message)}`
    : 'git stash push'

  const { exitCode, stdout, stderr } = await exec(cmd)

  if (exitCode !== 0) {
    throw new GitServiceError(stderr || 'Stash failed', 'command_failed')
  }

  if (stdout.includes('No local changes to save')) {
    throw new GitServiceError('No local changes to stash', 'nothing_to_commit')
  }
}

export async function popStash(index: number): Promise<GitSummary> {
  await ensureRepo()

  const { exitCode, stdout, stderr } = await exec(`git stash pop stash@{${index}}`)

  if (exitCode !== 0) {
    const combined = stdout + '\n' + stderr
    if (combined.includes('CONFLICT') || combined.includes('conflict')) {
      throw new GitServiceError('Stash pop caused conflicts — resolve manually', 'stash_conflict')
    }
    throw new GitServiceError(stderr || 'Stash pop failed', 'command_failed')
  }

  return getGitSummary()
}

export async function applyStash(index: number): Promise<GitSummary> {
  await ensureRepo()

  const { exitCode, stdout, stderr } = await exec(`git stash apply stash@{${index}}`)

  if (exitCode !== 0) {
    const combined = stdout + '\n' + stderr
    if (combined.includes('CONFLICT') || combined.includes('conflict')) {
      throw new GitServiceError('Stash apply caused conflicts — resolve manually', 'stash_conflict')
    }
    throw new GitServiceError(stderr || 'Stash apply failed', 'command_failed')
  }

  return getGitSummary()
}

export async function dropStash(index: number): Promise<void> {
  await ensureRepo()

  const { exitCode, stderr } = await exec(`git stash drop stash@{${index}}`)

  if (exitCode !== 0) {
    throw new GitServiceError(stderr || 'Stash drop failed', 'command_failed')
  }
}

// ─── Merge state ──────────────────────────────────────

export async function getMergeState(): Promise<GitMergeState> {
  const repoPath = await ensureRepo()
  const mergeHeadPath = `${repoPath}/.git/MERGE_HEAD`
  const inProgress = existsSync(mergeHeadPath)

  if (!inProgress) {
    return { inProgress: false, mergeBranch: '', conflictedPaths: [] }
  }

  // Get the merge branch name from MERGE_HEAD sha
  const { stdout: mergeSha } = await exec(`cat ${escapeShellArg(mergeHeadPath)}`)
  const { stdout: mergeBranch } = await exec(
    `git name-rev --name-only ${mergeSha.trim()} 2>/dev/null || echo "${mergeSha.trim().slice(0, 7)}"`,
  )

  // Find conflicted files: status codes UU, AA, DD, AU, UA, DU, UD
  const { stdout: statusOut } = await exec('git status --porcelain')
  const conflictedPaths: string[] = []
  for (const line of statusOut.split('\n')) {
    if (!line) continue
    const xy = line.slice(0, 2)
    if (['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD'].includes(xy)) {
      conflictedPaths.push(line.slice(3).trim())
    }
  }

  return {
    inProgress: true,
    mergeBranch: mergeBranch.trim(),
    conflictedPaths,
  }
}

export async function abortMerge(): Promise<GitSummary> {
  await ensureRepo()

  const { exitCode, stderr } = await exec('git merge --abort')

  if (exitCode !== 0) {
    throw new GitServiceError(stderr || 'Merge abort failed', 'command_failed')
  }

  return getGitSummary()
}

// ─── Helpers ─────────────────────────────────────────────

function statusToKind(status: string): GitFileChangeKind {
  switch (status) {
    case 'A': return 'added'
    case 'D': return 'deleted'
    case 'R': return 'renamed'
    default: return 'modified'
  }
}

function parseNumstat(output: string): Map<string, {
  additions: number
  deletions: number
  changedLines: number | null
  hasLineStats: boolean
  isBinary: boolean
}> {
  const map = new Map<string, {
    additions: number
    deletions: number
    changedLines: number | null
    hasLineStats: boolean
    isBinary: boolean
  }>()
  for (const line of output.split('\n')) {
    if (!line) continue
    const [add, del, ...pathParts] = line.split('\t')
    const rawPath = pathParts.join('\t')
    const paths = expandNumstatPaths(rawPath)
    if (paths.length === 0) continue

    const isBinary = add === '-' || del === '-'
    const additions = isBinary ? 0 : parseInt(add, 10) || 0
    const deletions = isBinary ? 0 : parseInt(del, 10) || 0
    const changedLines = isBinary ? null : additions + deletions

    for (const path of paths) {
      map.set(path, {
        additions,
        deletions,
        changedLines,
        hasLineStats: !isBinary,
        isBinary,
      })
    }
  }
  return map
}

function expandNumstatPaths(rawPath: string): string[] {
  if (!rawPath) return []

  if (rawPath.includes(' => ')) {
    const renamed = rawPath.replace(/^[^{}]*\{/, '{').replace(/\}[^{}]*$/, '}')
    const braceMatch = renamed.match(/^(.*)\{(.+?) => (.+?)\}(.*)$/)
    if (braceMatch) {
      const [, prefix, oldPart, newPart, suffix] = braceMatch
      return [`${prefix}${oldPart}${suffix}`, `${prefix}${newPart}${suffix}`]
    }

    const [oldPath, newPath] = rawPath.split(' => ')
    return [oldPath, newPath].filter(Boolean)
  }

  return [rawPath]
}

function parseDiffHunks(diff: string): GitDiffHunk[] {
  const hunks: GitDiffHunk[] = []

  for (const line of diff.split('\n')) {
    const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (!match) continue

    hunks.push({
      oldStart: parseInt(match[1], 10),
      oldLines: parseInt(match[2] ?? '1', 10),
      newStart: parseInt(match[3], 10),
      newLines: parseInt(match[4] ?? '1', 10),
    })
  }

  return hunks
}

function isBinaryDiff(diff: string): boolean {
  return diff.includes('Binary files ') || diff.includes('GIT binary patch')
}

function truncateDiff(diff: string): string {
  if (diff.length <= MAX_DIFF_BYTES) return diff
  return diff.slice(0, MAX_DIFF_BYTES) + '\n... truncated ...'
}

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`
}
