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
  refreshStatus: () => Promise<void>
  handleUpgrade: () => Promise<void>
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

  const handleUpgrade = useCallback(async () => {
    setUpgrading(true)
    try {
      await triggerUpdate()
      toast.info('Upgrade in progress — the agent will restart shortly...')
      let attempts = 0
      upgradePollRef.current = setInterval(async () => {
        attempts++
        try {
          const health = await checkHealth()
          if (health.version !== agentVersion || attempts > 5) {
            clearInterval(upgradePollRef.current!)
            upgradePollRef.current = null
            toast.success(`Updated to v${health.version}`)
            setTimeout(() => window.location.reload(), 1000)
          }
        } catch {
          // still restarting
        }
        if (attempts >= 20) {
          clearInterval(upgradePollRef.current!)
          upgradePollRef.current = null
          setUpgrading(false)
          toast.error('Upgrade timed out — try refreshing the page.')
        }
      }, 3000)
    } catch (err) {
      setUpgrading(false)
      toast.error(err instanceof Error ? err.message : 'Upgrade failed')
    }
  }, [agentVersion])

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
    refreshStatus,
    handleUpgrade,
    handleLogout,
    removeDevice,
    renameDevice,
    updatePasscode,
  }), [status, loading, agentVersion, updateInfo, upgrading, refreshStatus, handleUpgrade, handleLogout, removeDevice, renameDevice, updatePasscode])

  return <ConsoleDataContext.Provider value={value}>{children}</ConsoleDataContext.Provider>
}

export function useConsoleData(): ConsoleDataContextValue {
  const ctx = useContext(ConsoleDataContext)
  if (!ctx) throw new Error('useConsoleData must be used inside ConsoleDataProvider')
  return ctx
}
