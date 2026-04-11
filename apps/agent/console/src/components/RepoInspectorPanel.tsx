import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  createRepoPreviewSession,
  fetchOfflineSnapshots,
  fetchRepoFile,
  fetchRepoList,
  fetchRepoSearch,
  fetchRepoSummary,
  type OfflineSnapshot,
  type RepoEntry,
  type RepoFileRead,
  type RepoSearchMatch,
  type RepoSummary,
} from '#/lib/api'
import { cn } from '#/lib/utils'
import {
  ExternalLink,
  FileCode2,
  FolderOpen,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react'

type Props = {
  className?: string
}

export function RepoInspectorPanel({ className }: Props) {
  const [summary, setSummary] = useState<RepoSummary | null>(null)
  const [entries, setEntries] = useState<RepoEntry[]>([])
  const [currentPath, setCurrentPath] = useState('.')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RepoSearchMatch[]>([])
  const [selectedFile, setSelectedFile] = useState<RepoFileRead | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [pinnedPaths, setPinnedPaths] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [offlineSnapshots, setOfflineSnapshots] = useState<OfflineSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [repoSummary, repoList, snapshots] = await Promise.all([
        fetchRepoSummary(),
        fetchRepoList('.'),
        fetchOfflineSnapshots(),
      ])
      setSummary(repoSummary)
      setCurrentPath(repoList.path)
      setEntries(repoList.entries)
      setOfflineSnapshots(snapshots)
      if (selectedFilePath) {
        const file = await fetchRepoFile(selectedFilePath)
        setSelectedFile(file)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load repository inspector')
    } finally {
      setLoading(false)
    }
  }, [selectedFilePath])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function openPath(path: string) {
    setError(null)
    try {
      const repoList = await fetchRepoList(path)
      setCurrentPath(repoList.path)
      setEntries(repoList.entries)
      setSearchResults([])
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to open folder')
    }
  }

  async function openFile(path: string) {
    setError(null)
    setSelectedFilePath(path)
    try {
      const file = await fetchRepoFile(path)
      setSelectedFile(file)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to open file')
    }
  }

  async function handleSearch() {
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults([])
      return
    }

    setSearching(true)
    setError(null)
    try {
      const result = await fetchRepoSearch(query, currentPath)
      setSearchResults(result.results)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function handlePreviewLaunch() {
    setPreviewing(true)
    setError(null)
    try {
      const session = await createRepoPreviewSession('http://localhost:3000')
      setPreviewUrl(session.proxied_url)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to launch preview')
    } finally {
      setPreviewing(false)
    }
  }

  function togglePinned(path: string) {
    setPinnedPaths((current) => current.includes(path)
      ? current.filter((entry) => entry !== path)
      : [...current, path])
  }

  const lines = useMemo(() => selectedFile?.content.split('\n').slice(0, 160) ?? [], [selectedFile])
  const visibleItems = searchQuery.trim().length > 0 ? [] : entries

  return (
    <section className={cn(
      'flex h-full min-h-[520px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#111111_0%,#181818_100%)] text-[#f4f0e8] shadow-[0_14px_40px_rgba(0,0,0,0.18)]',
      className,
    )}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[#f4f0e8]/45">Repo Inspector</p>
            <Badge variant="outline" className="border-emerald-500/35 text-emerald-300">read only</Badge>
          </div>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#f0c419]" />
            <h2 className="text-lg font-semibold">{summary?.repoName ?? 'Repository Workspace'}</h2>
          </div>
          <p className="text-sm text-[#f4f0e8]/58">
            Search files, inspect source, pin context, and open the localhost preview without leaving the console.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/15 bg-white/8 text-[#f4f0e8] hover:bg-white/14"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-[#f0c419] text-black hover:bg-[#f0c419]/90"
            onClick={handlePreviewLaunch}
            disabled={previewing}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {previewing ? 'Launching...' : 'Launch Preview'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs text-[#f4f0e8]/55 sm:px-6">
        <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/70">
          {summary?.branchName ?? 'No branch'}
        </Badge>
        {summary?.repoPath ? (
          <Badge variant="outline" className="max-w-full border-white/10 text-[#f4f0e8]/70">
            <span className="truncate">{summary.repoPath}</span>
          </Badge>
        ) : null}
        <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/70">
          {pinnedPaths.length} pinned
        </Badge>
        {offlineSnapshots.length > 0 ? (
          <Badge variant="outline" className="border-emerald-500/35 text-emerald-300">
            offline on {offlineSnapshots.length} device{offlineSnapshots.length !== 1 ? 's' : ''}
          </Badge>
        ) : null}
        {error ? <span className="text-red-400">{error}</span> : null}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 px-3 pb-3 sm:px-4 sm:pb-4 xl:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f4f0e8]/35" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSearch()
                  }}
                  placeholder={`Search in ${currentPath === '.' ? summary?.repoName ?? 'repo' : currentPath}`}
                  className="border-white/10 bg-white/6 pl-9 text-[#f4f0e8] placeholder:text-[#f4f0e8]/35"
                />
              </div>
              <Button
                variant="outline"
                className="border-white/15 bg-white/8 text-[#f4f0e8] hover:bg-white/14"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#f4f0e8]/55">
              <Badge variant="outline" className="border-white/10 text-[#f4f0e8]/70">
                {currentPath === '.' ? 'Project root' : currentPath}
              </Badge>
              {currentPath !== '.' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-[#f0c419] hover:bg-white/8 hover:text-[#f0c419]"
                  onClick={() => {
                    const parts = currentPath.split('/').filter(Boolean)
                    void openPath(parts.length <= 1 ? '.' : parts.slice(0, -1).join('/'))
                  }}
                >
                  Up one level
                </Button>
              ) : null}
              {searchQuery.trim().length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-[#f0c419] hover:bg-white/8 hover:text-[#f0c419]"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                >
                  Clear search
                </Button>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#101010]">
            <div className="border-b border-white/8 px-4 py-3">
              <p className="text-sm font-medium">{searchQuery.trim().length > 0 ? 'Search Results' : 'Current Folder'}</p>
              <p className="mt-1 text-xs text-[#f4f0e8]/50">
                {searchQuery.trim().length > 0
                  ? `${searchResults.length} matches in ${currentPath === '.' ? 'the repository' : currentPath}`
                  : `${visibleItems.length} entries in ${currentPath === '.' ? 'project root' : currentPath}`}
              </p>
            </div>
            <div className="min-h-0 max-h-[28rem] overflow-y-auto p-3">
              <div className="space-y-2">
                {searchQuery.trim().length > 0 ? searchResults.map((result) => (
                  <div key={`${result.path}-${result.line_number}`} className="rounded-[1.2rem] border border-white/8 bg-black/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => void openFile(result.path)}
                      >
                        <p className="truncate text-sm font-medium text-[#f4f0e8]">{result.path}</p>
                        <p className="mt-1 text-xs text-[#f4f0e8]/45">Line {result.line_number}</p>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-[#f0c419] hover:bg-white/8 hover:text-[#f0c419]"
                        onClick={() => togglePinned(result.path)}
                      >
                        {pinnedPaths.includes(result.path) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="mt-2 break-all font-mono text-xs text-[#9df6cd]">{result.text}</p>
                  </div>
                )) : visibleItems.map((entry) => (
                  <div key={entry.path} className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/8 bg-black/30 p-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => {
                        if (entry.type === 'dir') {
                          void openPath(entry.path)
                          return
                        }
                        void openFile(entry.path)
                      }}
                    >
                      {entry.type === 'dir'
                        ? <FolderOpen className="h-4 w-4 shrink-0 text-[#f0c419]" />
                        : <FileCode2 className="h-4 w-4 shrink-0 text-[#9df6cd]" />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#f4f0e8]">{entry.name}</p>
                        <p className="mt-1 truncate text-xs text-[#f4f0e8]/45">{entry.path}</p>
                      </div>
                    </button>

                    {entry.type === 'file' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-[#f0c419] hover:bg-white/8 hover:text-[#f0c419]"
                        onClick={() => togglePinned(entry.path)}
                      >
                        {pinnedPaths.includes(entry.path) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </div>
                ))}

                {!loading && searchQuery.trim().length > 0 && searchResults.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                    No matches for this query in the current folder scope.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#f0c419]" />
                  <p className="text-sm font-medium">Pinned Context</p>
                </div>
                <p className="mt-1 text-xs text-[#f4f0e8]/50">Useful file paths to copy into prompts or terminal sessions.</p>
              </div>
              {pinnedPaths.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#f0c419] hover:bg-white/8 hover:text-[#f0c419]"
                  onClick={() => setPinnedPaths([])}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {pinnedPaths.length > 0 ? pinnedPaths.map((path) => (
                <Badge key={path} variant="outline" className="max-w-full border-white/10 text-[#f4f0e8]/75">
                  <span className="truncate">{path}</span>
                </Badge>
              )) : (
                <p className="text-sm text-[#f4f0e8]/52">Pin files from the search results or folder list.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,0.92fr)_minmax(260px,0.88fr)]">
          <div className="min-h-0 overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#101010]">
            <div className="border-b border-white/8 px-4 py-3">
              <p className="text-sm font-medium">File Preview</p>
              <p className="mt-1 text-xs text-[#f4f0e8]/50">
                {selectedFile?.path ?? 'Open a file from the list or search results.'}
              </p>
            </div>
            <div className="min-h-0 max-h-[32rem] overflow-auto p-3">
              {selectedFile ? (
                <div className="overflow-hidden rounded-[1.2rem] border border-white/8 bg-black/40">
                  <div className="border-b border-white/8 px-3 py-2 text-xs text-[#f4f0e8]/45">
                    {selectedFile.path} · {formatBytes(selectedFile.size)}
                  </div>
                  <div className="font-mono text-xs">
                    {lines.map((line, index) => (
                      <div key={`${selectedFile.path}-${index + 1}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 border-b border-white/5 px-3 py-1.5">
                        <div className="text-right text-[#f4f0e8]/28">{index + 1}</div>
                        <div className="whitespace-pre-wrap break-words text-[#9df6cd]">{line || ' '}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                  No file selected yet.
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#101010]">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Inline Preview</p>
                <p className="mt-1 text-xs text-[#f4f0e8]/50">Loads the proxied localhost dev server in the console.</p>
              </div>
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-medium text-[#f0c419]"
                >
                  Open in new tab
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            <div className="min-h-0 h-[320px] p-3">
              {previewUrl ? (
                <iframe
                  title="PocketDev inline preview"
                  src={previewUrl}
                  className="h-full w-full rounded-[1.2rem] border border-white/8 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
                  Launch preview to load `localhost:3000` from the paired server.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
