import { useEffect, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { useConsoleData } from '#/context/ConsoleDataContext'
import { ArrowUpCircle, Check, ChevronDown, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'

export function UpdateBanner() {
  const { agentVersion: version, updateInfo: update, upgrading, upgradeError, handleUpgrade, handleBetaReinstall, refreshUpdateInfo } = useConsoleData()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const otherVersions = update?.versions.filter((v) => v.version !== version) ?? []
  const hasVersionHistory = otherVersions.length > 0
  const hasBetas = (update?.betas?.length ?? 0) > 0
  const showVersionPicker = hasVersionHistory || hasBetas

  const runningBeta = version.includes('-beta.')
  const stableSwitchAvailable = runningBeta && !!update?.updateAvailable

  // The latest stable version is first in the array
  const latestStable = update?.versions[0]?.version

  useEffect(() => {
    if (!dropdownOpen) return
    void refreshUpdateInfo()
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen, refreshUpdateInfo])

  if (!upgrading && (!update || (!update.updateAvailable && !hasVersionHistory && !hasBetas))) {
    return null
  }

  function versionLabel(v: string) {
    if (!update) return 'Install'
    const parsed = update.versions.findIndex((e) => e.version === v)
    const currentParsed = update.versions.findIndex((e) => e.version === version)
    if (v === version) return 'Current'
    if (currentParsed === -1) return 'Switch'
    if (parsed < currentParsed) return 'Rollback'
    return 'Upgrade'
  }

  function handleVersionSelect(targetVersion: string) {
    setDropdownOpen(false)
    void handleUpgrade(targetVersion)
  }

  async function handleHardRefresh() {
    setRefreshing(true)
    await refreshUpdateInfo()
    setRefreshing(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="mb-4 rounded-[1.1rem] border-2 border-[var(--bauhaus-yellow)]/40 bg-card">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bauhaus-yellow)]/15 text-[var(--bauhaus-yellow)]">
            {upgrading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            {upgrading ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Installing update...</span>
                <span className="text-xs text-foreground/50">Agent will restart shortly</span>
              </div>
            ) : update?.updateAvailable ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {stableSwitchAvailable ? 'Stable release available' : 'Update available'}
                </span>
                <Badge className="bg-secondary text-secondary-foreground/70 text-xs">v{version}</Badge>
                {runningBeta && (
                  <Badge className="bg-[var(--bauhaus-yellow)]/20 text-[var(--bauhaus-yellow)] border border-[var(--bauhaus-yellow)]/40 text-xs">
                    Beta
                  </Badge>
                )}
                <span className="text-foreground/40">→</span>
                <Badge className="bg-[var(--bauhaus-yellow)] text-black text-xs">v{update.latest}</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Agent up to date</span>
                <Badge className="bg-[var(--bauhaus-yellow)] text-black text-xs">v{version}</Badge>
                {runningBeta && (
                  <Badge className="bg-[var(--bauhaus-yellow)]/20 text-[var(--bauhaus-yellow)] border border-[var(--bauhaus-yellow)]/40 text-xs">
                    Beta
                  </Badge>
                )}
              </div>
            )}
            {upgradeError && <p className="mt-1 text-xs text-red-400">{upgradeError}</p>}
          </div>
        </div>

        {!upgrading && (
          <div className="flex items-center gap-2">
            {showVersionPicker && (
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs"
                  onClick={() => setDropdownOpen((o) => !o)}
                >
                  Version History
                  <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </Button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full z-[200] mt-1.5 w-72 rounded-xl border border-border bg-card shadow-xl">
                    {/* Currently installed header */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <div>
                        <p className="text-xs text-foreground/50">Currently installed</p>
                        <p className="font-mono text-sm font-semibold text-foreground">{version}</p>
                      </div>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/40 transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-30"
                        onClick={handleHardRefresh}
                        disabled={refreshing}
                        title="Force refresh version list"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Stable versions */}
                    {update && update.versions.length > 0 && (
                      <div>
                        <div className="px-4 pb-1 pt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/40">Stable Releases</p>
                        </div>
                        <div className="max-h-48 overflow-y-auto pb-1">
                          {update.versions.map((entry) => {
                            const v = entry.version
                            const label = versionLabel(v)
                            const isCurrent = v === version
                            const isLatest = v === latestStable
                            return (
                              <button
                                key={v}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/60 disabled:cursor-default"
                                onClick={() => !isCurrent && handleVersionSelect(v)}
                                disabled={isCurrent || upgrading}
                              >
                                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                                  {isCurrent && <Check className="h-3.5 w-3.5 text-[var(--bauhaus-yellow)]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="block font-mono text-sm">v{v}</span>
                                  <span className="text-[10px] text-foreground/40">{formatDate(entry.publishedAt)}</span>
                                </div>
                                {isLatest && !isCurrent && (
                                  <span className="text-[10px] text-foreground/40">(latest)</span>
                                )}
                                {!isCurrent && (
                                  <span className={`text-xs font-medium ${label === 'Upgrade' || label === 'Switch' ? 'text-[var(--bauhaus-yellow)]' : 'text-foreground/40'}`}>
                                    {label}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Beta section */}
                    {hasBetas && (
                      <div className="border-t border-[var(--bauhaus-yellow)]/20">
                        <div className="flex items-center justify-between px-4 pb-1 pt-3">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--bauhaus-yellow)]/60">Beta Track</p>
                            <TriangleAlert className="h-3 w-3 text-[var(--bauhaus-yellow)]/50" />
                          </div>
                          <button
                            className="text-[10px] font-medium text-[var(--bauhaus-yellow)]/70 hover:text-[var(--bauhaus-yellow)] transition-colors disabled:opacity-40"
                            onClick={() => { setDropdownOpen(false); void handleBetaReinstall() }}
                            disabled={upgrading}
                          >
                            Reinstall Latest
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto pb-1">
                          {update!.betas!.map((beta, i) => {
                            const isCurrent = beta.version === version
                            const isLatestBeta = i === 0
                            return (
                              <button
                                key={beta.version}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--bauhaus-yellow)]/8 disabled:cursor-default"
                                onClick={() => !isCurrent && handleVersionSelect(beta.version)}
                                disabled={isCurrent || upgrading}
                              >
                                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                                  {isCurrent && <Check className="h-3.5 w-3.5 text-[var(--bauhaus-yellow)]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="block truncate font-mono text-sm">{beta.version}</span>
                                  <span className="text-[10px] text-foreground/40">{formatDate(beta.publishedAt)}</span>
                                </div>
                                {!isCurrent && (
                                  <span className="text-xs font-medium text-[var(--bauhaus-yellow)]">
                                    {isLatestBeta ? 'Latest Beta' : 'Install'}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {update?.updateAvailable && (
              <Button
                size="sm"
                className="bg-[var(--bauhaus-yellow)] text-black hover:bg-[var(--bauhaus-yellow)]/90 text-xs font-semibold"
                onClick={() => handleUpgrade(update.latest)}
              >
                <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5" />
                {stableSwitchAvailable ? 'Switch to Stable' : 'Update Now'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
