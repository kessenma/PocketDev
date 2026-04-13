import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchLockStatus, setFirewallEnabled, consoleLockPort, consoleUnlockPort, type LockStatus } from '#/lib/api'

interface LockStatusContextValue {
  lockStatus: LockStatus | null
  lockLoading: boolean
  toggleFirewall: () => Promise<void>
  lockPort: () => Promise<void>
  unlockPort: () => Promise<void>
  refreshLockStatus: () => Promise<void>
}

const LockStatusContext = createContext<LockStatusContextValue | null>(null)

export function LockStatusProvider({ children }: { children: ReactNode }) {
  const [lockStatus, setLockStatus] = useState<LockStatus | null>(null)
  const [lockLoading, setLockLoading] = useState(false)
  const hasFetchedRef = useRef(false)

  const refreshLockStatus = useCallback(async () => {
    try {
      setLockStatus(await fetchLockStatus())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    void refreshLockStatus()
  }, [refreshLockStatus])

  const toggleFirewall = useCallback(async () => {
    if (!lockStatus) return
    setLockLoading(true)
    try {
      await setFirewallEnabled(!lockStatus.firewallEnabled)
      await refreshLockStatus()
    } catch { /* ignore */ } finally {
      setLockLoading(false)
    }
  }, [lockStatus, refreshLockStatus])

  const lockPort = useCallback(async () => {
    setLockLoading(true)
    try {
      await consoleLockPort()
      await refreshLockStatus()
    } catch { /* ignore */ } finally {
      setLockLoading(false)
    }
  }, [refreshLockStatus])

  const unlockPort = useCallback(async () => {
    setLockLoading(true)
    try {
      await consoleUnlockPort()
      await refreshLockStatus()
    } catch { /* ignore */ } finally {
      setLockLoading(false)
    }
  }, [refreshLockStatus])

  const value = useMemo<LockStatusContextValue>(() => ({
    lockStatus,
    lockLoading,
    toggleFirewall,
    lockPort,
    unlockPort,
    refreshLockStatus,
  }), [lockStatus, lockLoading, toggleFirewall, lockPort, unlockPort, refreshLockStatus])

  return <LockStatusContext.Provider value={value}>{children}</LockStatusContext.Provider>
}

export function useLockStatus(): LockStatusContextValue {
  const ctx = useContext(LockStatusContext)
  if (!ctx) throw new Error('useLockStatus must be used inside LockStatusProvider')
  return ctx
}
