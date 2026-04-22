import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Modal } from '#/components/ui/modal'
import { useConsoleData } from '#/context/ConsoleDataContext'
import { ArrowUpCircle, Loader2, PackageOpen, RotateCcw, TriangleAlert } from 'lucide-react'

export function UpdateBanner() {
  const { agentVersion: version, updateInfo: update, upgrading, upgradeError, handleUpgrade } = useConsoleData()
  const [versionsOpen, setVersionsOpen] = useState(false)

  const otherVersions = update?.versions.filter((v) => v !== version) ?? []
  const hasVersionHistory = otherVersions.length > 0
  const showManage = hasVersionHistory || !!update?.beta || !!update?.updateAvailable

  const runningBeta = version.includes('-beta.')
  const onLatestBeta = !!update?.beta && update.beta.version === version
  // When a beta is running, semver makes any stable version look like an
  // "update" — relabel so users know it's a sideways switch, not a plain upgrade.
  const stableSwitchAvailable = runningBeta && !!update?.updateAvailable

  if (!upgrading && (!update || (!update.updateAvailable && !hasVersionHistory && !update.beta))) {
    return null
  }

  function versionLabel(v: string) {
    if (!update) return 'Install'
    const parsed = update.versions.indexOf(v)
    const currentParsed = update.versions.indexOf(version)
    if (v === version) return 'Current'
    // If the current install isn't in the stable list (e.g. running a beta),
    // treat every stable entry as a forward switch rather than a rollback.
    if (currentParsed === -1) return 'Switch'
    if (parsed < currentParsed) return 'Rollback'
    return 'Upgrade'
  }

  return (
    <>
      <div className="mb-4 overflow-hidden rounded-[1.1rem] border-2 border-[var(--bauhaus-yellow)]/40 bg-card">
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
              {showManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs"
                  onClick={() => setVersionsOpen(true)}
                >
                  <PackageOpen className="mr-1.5 h-3.5 w-3.5" />
                  Manage Versions
                </Button>
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

      <Modal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title="Agent Versions"
        description="Install a specific stable version or try the latest beta build."
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto">
          {update && (
            <>
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-black/50">
                  Stable Releases
                </h3>
                <div className="flex flex-col gap-2">
                  {update.versions.map((v) => {
                    const label = versionLabel(v)
                    const isCurrent = v === version
                    return (
                      <div
                        key={v}
                        className="flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">v{v}</span>
                          {isCurrent && (
                            <Badge className="bg-[var(--bauhaus-yellow)] text-black text-xs">Current</Badge>
                          )}
                        </div>
                        {!isCurrent && (
                          <Button
                            size="sm"
                            variant={label === 'Upgrade' ? 'default' : 'outline'}
                            className={
                              label === 'Upgrade'
                                ? 'bg-[var(--bauhaus-yellow)] text-black hover:bg-[var(--bauhaus-yellow)]/90 text-xs font-semibold'
                                : 'border-black/15 text-xs'
                            }
                            onClick={() => { setVersionsOpen(false); void handleUpgrade(v) }}
                            disabled={upgrading}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            {label}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

              {update.beta && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-black/50">
                    Beta Track
                  </h3>
                  <div className="rounded-xl border-2 border-[var(--bauhaus-yellow)]/60 bg-[var(--bauhaus-yellow)]/10 p-4">
                    <div className="mb-3 flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bauhaus-yellow)]" />
                      <p className="text-xs text-black/70">
                        This is a beta build intended for <strong>TestFlight users and developers</strong>. It may
                        be unstable and could break compatibility with the released mobile app.
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-mono text-sm font-medium">{update.beta.version}</span>
                          <p className="text-xs text-black/50">
                            Published {new Date(update.beta.publishedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {onLatestBeta && (
                          <Badge className="bg-[var(--bauhaus-yellow)] text-black text-xs">Current</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-black/20 text-xs"
                        onClick={() => { setVersionsOpen(false); void handleUpgrade('nightly') }}
                        disabled={upgrading || onLatestBeta}
                      >
                        {onLatestBeta ? 'Installed' : runningBeta ? 'Reinstall Beta' : 'Install Beta'}
                      </Button>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
