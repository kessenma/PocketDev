import { resolve, basename } from 'node:path'
import type {
  GitSummary,
  GitFileChange,
  GitDiffResponse,
  GitCommitEntry,
  GitBranchEntry,
  GitErrorCode,
  GitFileChangeKind,
  GitRemoteStatus,
} from '@pocketdev/shared/types'
import { getActiveProjectPath } from './projects.ts'

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
      const diff = content
        ? content.split('\n').map((l) => `+${l}`).join('\n')
        : ''
      return { path, diff: truncateDiff(diff), truncated: diff.length > MAX_DIFF_BYTES }
    }
  }

  return {
    path,
    diff: truncateDiff(stdout),
    truncated: stdout.length > MAX_DIFF_BYTES,
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

// ─── Helpers ─────────────────────────────────────────────

function statusToKind(status: string): GitFileChangeKind {
  switch (status) {
    case 'A': return 'added'
    case 'D': return 'deleted'
    case 'R': return 'renamed'
    default: return 'modified'
  }
}

function parseNumstat(output: string): Map<string, { additions: number; deletions: number }> {
  const map = new Map<string, { additions: number; deletions: number }>()
  for (const line of output.split('\n')) {
    if (!line) continue
    const [add, del, ...pathParts] = line.split('\t')
    const path = pathParts.join('\t')
    if (path) {
      map.set(path, {
        additions: add === '-' ? 0 : parseInt(add, 10) || 0,
        deletions: del === '-' ? 0 : parseInt(del, 10) || 0,
      })
    }
  }
  return map
}

function truncateDiff(diff: string): string {
  if (diff.length <= MAX_DIFF_BYTES) return diff
  return diff.slice(0, MAX_DIFF_BYTES) + '\n... truncated ...'
}

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`
}
