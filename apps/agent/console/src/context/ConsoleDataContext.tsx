import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkHealth, fetchStatus, logout, triggerUpdate, type ConsoleStatus, type UpdateInfo } from '#/lib/api'
import { toast } from 'sonner'

interface ConsoleDataContextValue {
  status: ConsoleStatus | null
  loading: boolean
  agentVersion: string
  updateInfo: UpdateInfo | null
  upgrading: boolean
  upgradeError: string | null
  refreshStatus: () => Promise<void>
  handleUpgrade: (targetVersion?: string) => Promise<void>
  handleLogout: () => Promise<void>
  removeDevice: (id: string) => void
  renameDevice: (id: string, name: string) => void
  updatePasscode: (code: string) => void
}

const ConsoleDataContext = createContext<ConsoleDataContextValue | null>(null)

export function ConsoleDataProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConsoleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [agentVersion, setAgentVersion] = useState<string>('unknown')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)
  const upgradePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const health = await checkHealth()
      if (!health.hasAdmin) {
        navigate('/setup', { replace: true })
        return
      }
      setAgentVersion(health.version)
      setUpdateInfo(health.update)
      const data = await fetchStatus()
      setStatus(data)
    } catch {
      navigate('/login', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    void refreshStatus()
  }, [refreshStatus])

  const handleUpgrade = useCallback(async (targetVersion?: string) => {
    setUpgrading(true)
    setUpgradeError(null)
    try {
      // Capture baseline uptime *before* triggering the upgrade so we can
      // detect the restart reliably.
      const pre = await checkHealth({ signal: AbortSignal.timeout(5_000) })
      const baselineUptime = pre.uptime

      await triggerUpdate(targetVersion)
      toast.info('Update started — the agent will restart shortly...')

      // For 'nightly', the installed version won't match the string 'nightly' —
      // fall back to uptime-based restart detection for unknown final versions.
      const knownVersion = targetVersion && targetVersion !== 'nightly' ? targetVersion : undefined

      let attempts = 0
      const MAX_ATTEMPTS = 30
      upgradePollRef.current = setInterval(async () => {
        attempts++
        try {
          const health = await checkHealth({ signal: AbortSignal.timeout(5_000) })
          const restarted = knownVersion ? health.version === knownVersion : health.uptime < baselineUptime
          if (restarted) {
            clearInterval(upgradePollRef.current!)
            upgradePollRef.current = null
            toast.success(`Updated to v${health.version}`)
            setTimeout(() => window.location.reload(), 1000)
            return
          }
        } catch {
          // Agent is still restarting — swallow and retry on the next tick.
        }
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(upgradePollRef.current!)
          upgradePollRef.current = null
          // One last best-effort check with a longer timeout before giving up.
          // The restart often completes just past the poll window, and the UX
          // of forcing a manual refresh is worse than a slightly optimistic
          // reload — if the install actually failed, the reloaded page will
          // show the unchanged version and the banner updates accordingly.
          try {
            const health = await checkHealth({ signal: AbortSignal.timeout(10_000) })
            const restarted = knownVersion ? health.version === knownVersion : health.uptime < baselineUptime
            if (restarted) {
              toast.success(`Updated to v${health.version}`)
            } else {
              toast.info('Restart not detected yet — refreshing to sync state...')
            }
          } catch {
            toast.info('Agent still coming back online — refreshing...')
          }
          setTimeout(() => window.location.reload(), 800)
        }
      }, 3000)
    } catch (err) {
      setUpgrading(false)
      setUpgradeError(err instanceof Error ? err.message : 'Upgrade failed')
    }
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [navigate])

  const removeDevice = useCallback((id: string) => {
    setStatus((prev) => prev ? { ...prev, devices: prev.devices.filter((d) => d.id !== id) } : prev)
  }, [])

  const renameDevice = useCallback((id: string, name: string) => {
    setStatus((prev) => prev ? { ...prev, devices: prev.devices.map((d) => d.id === id ? { ...d, name } : d) } : prev)
  }, [])

  const updatePasscode = useCallback((code: string) => {
    setStatus((prev) => prev ? { ...prev, passcode: code } : prev)
  }, [])

  const value = useMemo<ConsoleDataContextValue>(() => ({
    status,
    loading,
    agentVersion,
    updateInfo,
    upgrading,
    upgradeError,
    refreshStatus,
    handleUpgrade,
    handleLogout,
    removeDevice,
    renameDevice,
    updatePasscode,
  }), [status, loading, agentVersion, updateInfo, upgrading, upgradeError, refreshStatus, handleUpgrade, handleLogout, removeDevice, renameDevice, updatePasscode])

  return <ConsoleDataContext.Provider value={value}>{children}</ConsoleDataContext.Provider>
}

export function useConsoleData(): ConsoleDataContextValue {
  const ctx = useContext(ConsoleDataContext)
  if (!ctx) throw new Error('useConsoleData must be used inside ConsoleDataProvider')
  return ctx
}
