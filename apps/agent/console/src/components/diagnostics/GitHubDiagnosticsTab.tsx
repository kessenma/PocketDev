import { useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { KeyRound, GitCommitHorizontal, ChevronDown, ChevronRight } from 'lucide-react'
import type { GitHubAuthDebugInfo, ProjectsDebugInfo, GitHistoryDebugInfo, GitHistoryDebugCommit } from '#/lib/api'

interface Props {
  githubInfo: GitHubAuthDebugInfo | null
  projectsInfo: ProjectsDebugInfo | null
  gitHistoryInfo: GitHistoryDebugInfo | null
}

function formatShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const ORIGIN_STYLES: Record<string, { label: string; className: string }> = {
  app: { label: 'App', className: 'border-[#2d5fe5]/40 text-[#6b9bff]' },
  task: { label: 'AI Task', className: 'border-[#22c55e]/40 text-[#4ade80]' },
  external: { label: 'External', className: 'border-white/10 text-[#f4f0e8]/50' },
}

function CommitRow({ commit }: { commit: GitHistoryDebugCommit }) {
  const [expanded, setExpanded] = useState(false)
  const origin = ORIGIN_STYLES[commit.origin] ?? ORIGIN_STYLES.external

  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3">
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded
          ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f4f0e8]/40" />
          : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f4f0e8]/40" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-[#f0c419]">{commit.sha}</span>
            {commit.origin !== 'external' && (
              <Badge variant="outline" className={`text-[10px] ${origin.className}`}>
                {origin.label}
              </Badge>
            )}
            <span className="ml-auto shrink-0 text-[10px] text-[#f4f0e8]/35">
              {formatRelativeTime(commit.committedAt)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[#f4f0e8]/85">{commit.message}</p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[#f4f0e8]/45">
            <span>{commit.authorName}</span>
            <span>{commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''}</span>
            {(commit.additions > 0 || commit.deletions > 0) && (
              <span>
                <span className="text-[#4ade80]">+{commit.additions}</span>
                {' '}
                <span className="text-[#f87171]">-{commit.deletions}</span>
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && commit.files.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-white/6 pt-3">
          {commit.authorEmail && (
            <p className="mb-2 font-mono text-[11px] text-[#f4f0e8]/35">{commit.authorEmail}</p>
          )}
          {commit.branch && (
            <p className="mb-2 text-[11px] text-[#f4f0e8]/45">
              Branch: <span className="font-mono text-[#6b9bff]">{commit.branch}</span>
            </p>
          )}
          {commit.files.map((file, i) => (
            <div key={`${file.path}-${i}`} className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                file.kind === 'added' ? 'bg-[#4ade80]'
                : file.kind === 'deleted' ? 'bg-[#f87171]'
                : file.kind === 'renamed' ? 'bg-[#6b9bff]'
                : 'bg-[#f0c419]'
              }`} />
              <span className="min-w-0 flex-1 truncate font-mono text-[#f4f0e8]/65">
                {file.path}
                {file.oldPath ? ` <- ${file.oldPath}` : ''}
              </span>
              <span className="shrink-0 font-mono text-[10px]">
                {file.additions > 0 && <span className="text-[#4ade80]">+{file.additions}</span>}
                {file.additions > 0 && file.deletions > 0 && ' '}
                {file.deletions > 0 && <span className="text-[#f87171]">-{file.deletions}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function GitHubDiagnosticsTab({ githubInfo, projectsInfo, gitHistoryInfo }: Props) {
  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      {/* ── Left sidebar ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">GitHub CLI Auth State</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.2rem] border border-white/8 bg-[#f0c419] p-4 text-black">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-black/55">Active Sessions</p>
              <p className="mt-2 text-3xl font-semibold">{githubInfo?.activeSessionCount ?? 0}</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Persisted CLI State</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>Path: {githubInfo?.persistedState?.path ?? 'Not stored'}</p>
                <p>Version: {githubInfo?.persistedState?.version ?? 'Unknown'}</p>
                <p>Authenticated: {githubInfo?.persistedState ? (githubInfo.persistedState.authenticated ? 'Yes' : 'No') : 'Unknown'}</p>
                <p>Updated: {githubInfo?.persistedState?.updatedAt ? new Date(githubInfo.persistedState.updatedAt).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
          <p className="text-sm font-medium">Repo Discovery</p>
          <div className="mt-3 space-y-3">
            <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3 text-sm text-[#f4f0e8]/78">
              <p>Fetch source: {projectsInfo?.fetchSource ?? 'Unknown'}</p>
              <p>SSH user: {projectsInfo?.sshGithubUsername ?? 'Unknown'}</p>
              <p>GH user: {projectsInfo?.ghCliUsername ?? 'Unknown'}</p>
              <p>GH authenticated: {projectsInfo?.ghCliAuthenticated ? 'Yes' : 'No'}</p>
              <p>Private repo access: {projectsInfo?.privateRepoAccess ? 'Yes' : 'No'}</p>
              <p>Fetch error: {projectsInfo?.fetchError ?? 'None'}</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3 text-sm text-[#f4f0e8]/78">
              <p>Fetched repos: {projectsInfo?.fetchedRepoCount ?? 0}</p>
              <p>Fetched private: {projectsInfo?.fetchedPrivateCount ?? 0}</p>
              <p>Fetched public: {projectsInfo?.fetchedPublicCount ?? 0}</p>
              <p>Listed in picker: {projectsInfo?.listedProjectCount ?? 0}</p>
              <p>Listed private: {projectsInfo?.listedPrivateCount ?? 0}</p>
              <p>Listed public: {projectsInfo?.listedPublicCount ?? 0}</p>
              <p>Listed unknown: {projectsInfo?.listedUnknownCount ?? 0}</p>
            </div>
          </div>
        </div>

        {/* ── Sync status ──────────────────────────────── */}
        <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
          <div className="flex items-center gap-2">
            <GitCommitHorizontal className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">History Sync</p>
          </div>
          <div className="mt-3 rounded-[1.2rem] border border-white/8 bg-black/30 p-3 text-sm text-[#f4f0e8]/78">
            <p>Project: <span className="font-mono text-[#9df6cd]">{gitHistoryInfo?.projectId ?? 'None'}</span></p>
            {gitHistoryInfo?.syncStatus ? (
              <>
                <p>HEAD: <span className="font-mono text-[#9df6cd]">{gitHistoryInfo.syncStatus.headSha.slice(0, 10)}</span></p>
                <p>Last synced: <span className="font-mono text-[#9df6cd]">{gitHistoryInfo.syncStatus.lastSyncedSha?.slice(0, 10) ?? 'Never'}</span></p>
                <p>Pending commits: {gitHistoryInfo.syncStatus.pendingCommits}</p>
              </>
            ) : (
              <p className="text-[#f4f0e8]/45">No sync status available</p>
            )}
            <p>Commits in DB: {gitHistoryInfo?.commits.length ?? 0}{gitHistoryInfo?.hasMore ? '+' : ''}</p>
            {gitHistoryInfo?.syncError && (
              <p className="mt-2 text-[#f87171]">Error: {gitHistoryInfo.syncError}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Right panels ───────────────────────────────── */}
      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        {/* ── Git commit history ──────────────────────── */}
        <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Commit History</p>
            {gitHistoryInfo && gitHistoryInfo.commits.length > 0 && (
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#f4f0e8]/35">
                {gitHistoryInfo.commits.filter((c) => c.origin === 'app').length} app ·{' '}
                {gitHistoryInfo.commits.filter((c) => c.origin === 'task').length} task ·{' '}
                {gitHistoryInfo.commits.filter((c) => c.origin === 'external').length} external
              </span>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {gitHistoryInfo?.commits.length ? (
              gitHistoryInfo.commits.map((commit) => (
                <CommitRow key={commit.fullSha} commit={commit} />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                {gitHistoryInfo?.projectId
                  ? 'No commits synced yet. Trigger a history sync from the mobile app.'
                  : 'No active project selected.'}
              </div>
            )}
          </div>
        </div>

        {/* ── GitHub auth sessions + output ───────────── */}
        <div className="min-h-0 space-y-3 overflow-y-auto">
          <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
            <p className="text-sm font-medium">Active GitHub Sessions</p>
            <div className="mt-3 space-y-3">
              {githubInfo?.sessions.length ? (
                githubInfo.sessions.map((session) => (
                  <div key={session.sessionId} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{session.state}</p>
                        <p className="mt-1 break-all font-mono text-xs text-[#f4f0e8]/50">{session.sessionId}</p>
                      </div>
                      <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/75">
                        {session.authenticated ? 'Authenticated' : session.completed ? 'Completed' : 'Active'}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-[#f4f0e8]/72">
                      <p>Verification code: {session.verificationCode ?? 'Not parsed yet'}</p>
                      <p>Browser launch handled: {session.browserLaunchHandled ? 'Yes' : 'No'}</p>
                      <p>GitHub user: {session.githubUsername ?? 'Unknown'}</p>
                      <p>Private repo access: {session.privateRepoAccess ? 'Yes' : 'No'}</p>
                      <p>Error: {session.error ?? 'None'}</p>
                      <p>Started: {new Date(session.startedAt).toLocaleString()}</p>
                      <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
                      {session.authUrl ? (
                        <p className="break-all font-mono text-[11px] text-[#9df6cd]">{session.authUrl}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                  No active GitHub auth sessions.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
            <p className="text-sm font-medium">Recent Project Operations</p>
            <div className="mt-3 space-y-2">
              {projectsInfo?.recentOperations.length ? (
                projectsInfo.recentOperations.map((entry, index) => (
                  <div key={`${entry.ts}-${index}`} className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[#f4f0e8]/35">
                      {formatShortTime(entry.ts)} · {entry.kind}
                    </div>
                    <div className="mt-1 break-words font-mono text-xs text-[#9df6cd]">{entry.message}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#f4f0e8]/58">No project operations recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
