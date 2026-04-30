import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchLockStatus, type LockStatus } from '#/lib/api'

interface LockStatusContextValue {
  lockStatus: LockStatus | null
  lockLoading: boolean
  refreshLockStatus: () => Promise<void>
}

const LockStatusContext = createContext<LockStatusContextValue | null>(null)

export function LockStatusProvider({ children }: { children: ReactNode }) {
  const [lockStatus, setLockStatus] = useState<LockStatus | null>(null)
  const [lockLoading, setLockLoading] = useState(false)
  const hasFetchedRef = useRef(false)

  const refreshLockStatus = useCallback(async () => {
    setLockLoading(true)
    try {
      setLockStatus(await fetchLockStatus())
    } catch { /* ignore */ } finally {
      setLockLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    void refreshLockStatus()
  }, [refreshLockStatus])

  const value = useMemo<LockStatusContextValue>(() => ({
    lockStatus,
    lockLoading,
    refreshLockStatus,
  }), [lockStatus, lockLoading, refreshLockStatus])

  return <LockStatusContext.Provider value={value}>{children}</LockStatusContext.Provider>
}

export function useLockStatus(): LockStatusContextValue {
  const ctx = useContext(LockStatusContext)
  if (!ctx) throw new Error('useLockStatus must be used inside LockStatusProvider')
  return ctx
}
