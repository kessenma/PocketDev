import { useCallback, useEffect, useState } from 'react'
import { StatusBadge } from '#/components/ui/status-badge'
import { Button } from '#/components/ui/button'
import {
  fetchConsoleProjects,
  selectConsoleProject,
  type ConsoleProject,
} from '#/lib/api'
import { cn } from '#/lib/utils'
import { ChevronDown, ChevronUp, FolderGit2, GitBranch, RefreshCw, Star } from 'lucide-react'
import { RepoInspectorPanel } from '#/components/RepoInspectorPanel'

type Props = {
  className?: string
}

export function ProjectSwitcherPanel({ className }: Props) {
  const [projects, setProjects] = useState<ConsoleProject[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [inspectorKey, setInspectorKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const projs = await fetchConsoleProjects()
      setProjects(projs)
      // Default-open the active project on first load
      setExpandedId((prev) => prev ?? projs.find((p) => p.isActive)?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function handleCardClick(project: ConsoleProject) {
    // Collapse if already expanded
    if (expandedId === project.id) {
      setExpandedId(null)
      return
    }
    // Expand — if not the active project, switch first
    if (!project.isActive) {
      setSwitching(project.id)
      try {
        await selectConsoleProject(project.id)
        await refresh()
        setInspectorKey((k) => k + 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to switch project')
        setSwitching(null)
        return
      }
      setSwitching(null)
    }
    setExpandedId(project.id)
  }

  const expandedProject = projects.find((p) => p.id === expandedId)

  return (
    <section className={cn(
      'overflow-hidden rounded-[1.1rem] border-2 border-border bg-card text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.22)]',
      className,
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.45rem] border-2 border-black/75 bg-[var(--bauhaus-yellow)] text-black shadow-[3px_3px_0_0_rgba(0,0,0,0.28)]">
            <FolderGit2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-foreground/50">Server</p>
            <h2 className="text-base font-bold uppercase tracking-wide">Repositories</h2>
          </div>
          {projects.length > 0 && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground/60">
              {projects.length}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={cn('mr-2 h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Cards grid */}
      <div className="p-4">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {loading && projects.length === 0 ? (
          <p className="py-4 text-center text-sm text-foreground/40">Loading repositories…</p>
        ) : projects.length === 0 ? (
          <p className="py-4 text-center text-sm text-foreground/40">No repositories found on this server.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const isExpanded = expandedId === project.id
              const isSwitching = switching === project.id
              return (
                <button
                  key={project.id}
                  type="button"
                  disabled={isSwitching}
                  onClick={() => { void handleCardClick(project) }}
                  className={cn(
                    'group relative w-full rounded-[0.85rem] border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bauhaus-yellow)]',
                    isExpanded
                      ? 'border-[var(--bauhaus-yellow)] bg-[var(--bauhaus-yellow)]/5'
                      : project.isActive
                        ? 'border-[var(--bauhaus-yellow)]/50 bg-[var(--bauhaus-yellow)]/3 hover:border-[var(--bauhaus-yellow)] hover:bg-[var(--bauhaus-yellow)]/5'
                        : 'border-border bg-secondary/30 hover:border-border/80 hover:bg-secondary/50',
                    isSwitching && 'opacity-60',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                        {project.isActive && (
                          <StatusBadge color="brand">Active</StatusBadge>
                        )}
                      </div>
                      <p className="mt-1 truncate font-mono text-[0.65rem] text-foreground/40">
                        {project.absolutePath}
                      </p>
                      {project.remoteUrl && (
                        <div className="mt-1.5 flex items-center gap-1 text-[0.65rem] text-foreground/40">
                          <GitBranch className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {project.remoteUrl.replace(/^https?:\/\//, '').replace(/\.git$/, '')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {project.isActive && (
                        <Star className="h-3.5 w-3.5 fill-[var(--bauhaus-yellow)] text-[var(--bauhaus-yellow)]" />
                      )}
                      {isSwitching ? (
                        <span className="text-[0.65rem] text-foreground/40">Switching…</span>
                      ) : (
                        isExpanded
                          ? <ChevronUp className="h-4 w-4 text-foreground/40 group-hover:text-foreground/70" />
                          : <ChevronDown className="h-4 w-4 text-foreground/40 group-hover:text-foreground/70" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Expanded inspector */}
      {expandedProject && (
        <div className="border-t-2 border-border">
          <div className="px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-foreground/35">
            {expandedProject.name}
          </div>
          <RepoInspectorPanel
            refreshKey={inspectorKey}
            className="rounded-none border-0 shadow-none"
          />
        </div>
      )}
    </section>
  )
}
