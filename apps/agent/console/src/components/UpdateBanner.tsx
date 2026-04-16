import { useState, useRef } from 'react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { triggerUpdate, checkHealth, type UpdateInfo } from '#/lib/api'
import { toast } from 'sonner'
import { ArrowUpCircle, Loader2, ChevronDown, RotateCcw } from 'lucide-react'

interface UpdateBannerProps {
  version: string
  update: UpdateInfo | null
}

export function UpdateBanner({ version, update }: UpdateBannerProps) {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  if (!update) return null

  // Only show if there's an update available or there are previous versions for rollback
  const otherVersions = update.versions.filter((v) => v !== version)
  if (!update.updateAvailable && otherVersions.length === 0) return null

  function cleanup() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function pollForRestart(expectedVersion?: string) {
    let attempts = 0
    const maxAttempts = 20 // ~60 seconds at 3s intervals

    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const health = await checkHealth()
        // Agent is back — check if version changed
        if (expectedVersion ? health.version === expectedVersion : health.version !== version) {
          cleanup()
          toast.success(`Updated to v${health.version}`)
          setTimeout(() => window.location.reload(), 1000)
          return
        }
        // Agent is back but same version (might still be restarting)
        if (attempts > 5 && health.version === version) {
          cleanup()
          toast.success('Agent restarted')
          setTimeout(() => window.location.reload(), 1000)
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

    try {
      await triggerUpdate(targetVersion)
      toast.info('Update started — the agent will restart shortly...')
      // Start polling for the agent to come back
      await pollForRestart(targetVersion)
    } catch (err) {
      setUpdating(false)
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  return (
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
          {/* Rollback dropdown */}
          {otherVersions.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs"
                onClick={() => setRollbackOpen(!rollbackOpen)}
                disabled={updating}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Rollback
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>

              {rollbackOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border-2 border-border bg-card py-1 shadow-lg">
                  {otherVersions
                    .slice()
                    .reverse()
                    .map((v) => (
                      <button
                        key={v}
                        className="block w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary"
                        onClick={() => {
                          setRollbackOpen(false)
                          handleUpdate(v)
                        }}
                      >
                        v{v}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Update button */}
          {update.updateAvailable && (
            <Button
              size="sm"
              className="bg-[var(--bauhaus-yellow)] text-black hover:bg-[var(--bauhaus-yellow)]/90 text-xs font-semibold"
              onClick={() => handleUpdate()}
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
  )
}
