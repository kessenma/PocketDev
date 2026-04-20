import { useState, useRef } from 'react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Modal } from '#/components/ui/modal'
import { triggerUpdate, checkHealth, type UpdateInfo } from '#/lib/api'
import { toast } from 'sonner'
import { ArrowUpCircle, Loader2, PackageOpen, RotateCcw, TriangleAlert } from 'lucide-react'

interface UpdateBannerProps {
  version: string
  update: UpdateInfo | null
}

export function UpdateBanner({ version, update }: UpdateBannerProps) {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  if (!update) return null

  const otherVersions = update.versions.filter((v) => v !== version)
  const hasVersionHistory = otherVersions.length > 0
  const showManage = hasVersionHistory || update.beta || update.updateAvailable
  if (!update.updateAvailable && !hasVersionHistory && !update.beta) return null

  function cleanup() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function pollForRestart(baselineUptime: number, expectedVersion?: string) {
    let attempts = 0
    const maxAttempts = 20

    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const health = await checkHealth({ signal: AbortSignal.timeout(5_000) })
        const restarted = expectedVersion
          ? health.version === expectedVersion
          : health.uptime < baselineUptime
        if (restarted) {
          cleanup()
          toast.success(`Updated to v${health.version}`)
          setTimeout(() => window.location.reload(), 1000)
          return
        }
      } catch {
        // Agent still restarting — keep polling
      }

      if (attempts >= maxAttempts) {
        cleanup()
        setUpdating(false)
        setError('Update timed out. The agent may still be restarting — try refreshing the page.')
      }
    }, 3000)
  }

  async function handleUpdate(targetVersion?: string) {
    setUpdating(true)
    setError(null)
    setVersionsOpen(false)

    try {
      const pre = await checkHealth({ signal: AbortSignal.timeout(5_000) })
      const baselineUptime = pre.uptime

      await triggerUpdate(targetVersion)
      toast.info('Update started — the agent will restart shortly...')
      await pollForRestart(baselineUptime, targetVersion)
    } catch (err) {
      setUpdating(false)
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function handleBetaUpdate() {
    await handleUpdate('nightly')
  }

  const versionLabel = (v: string) => {
    const parsed = update.versions.indexOf(v)
    const currentParsed = update.versions.indexOf(version)
    if (v === version) return 'Current'
    if (parsed < currentParsed) return 'Rollback'
    return 'Upgrade'
  }

  return (
    <>
      <div className="mb-4 overflow-hidden rounded-[1.1rem] border-2 border-[var(--bauhaus-yellow)]/40 bg-card">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bauhaus-yellow)]/15 text-[var(--bauhaus-yellow)]">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
            <div>
              {update.updateAvailable ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Update available</span>
                  <Badge className="bg-secondary text-secondary-foreground/70 text-xs">v{version}</Badge>
                  <span className="text-foreground/40">→</span>
                  <Badge className="bg-[var(--bauhaus-yellow)] text-black text-xs">v{update.latest}</Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Agent up to date</span>
                  <Badge className="bg-[var(--bauhaus-yellow)] text-black text-xs">v{version}</Badge>
                </div>
              )}
              {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showManage && (
              <Button
                variant="outline"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs"
                onClick={() => setVersionsOpen(true)}
                disabled={updating}
              >
                <PackageOpen className="mr-1.5 h-3.5 w-3.5" />
                Manage Versions
              </Button>
            )}

            {update.updateAvailable && (
              <Button
                size="sm"
                className="bg-[var(--bauhaus-yellow)] text-black hover:bg-[var(--bauhaus-yellow)]/90 text-xs font-semibold"
                onClick={() => setVersionsOpen(true)}
                disabled={updating}
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5" />
                    Update Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title="Agent Versions"
        description="Install a specific stable version or try the latest beta build."
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto">
          {/* Stable versions */}
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
                        onClick={() => handleUpdate(v)}
                        disabled={updating}
                      >
                        {updating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            {label}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Beta track */}
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
                  <div>
                    <span className="font-mono text-sm font-medium">{update.beta.version}</span>
                    <p className="text-xs text-black/50">
                      Published {new Date(update.beta.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-black/20 text-xs"
                    onClick={handleBetaUpdate}
                    disabled={updating}
                  >
                    {updating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Install Beta'
                    )}
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      </Modal>
    </>
  )
}
