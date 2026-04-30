import { StatusBadge } from '#/components/ui/status-badge'
import { useLockStatus } from '#/context/LockStatusContext'
import { Shield } from 'lucide-react'

export function PortSecurityCard() {
  const { lockStatus } = useLockStatus()

  return (
    <div className="rounded-[1.1rem] border-2 border-border bg-card p-5 text-foreground shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black/75 bg-secondary text-[var(--bauhaus-yellow)] shadow-[4px_4px_0_0_rgba(0,0,0,0.28)]">
          <Shield className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-heading text-sm font-semibold uppercase tracking-[0.32em]">Port Security</span>
          {lockStatus && (
            <StatusBadge color={lockStatus.locked ? 'red' : 'green'}>
              {lockStatus.locked ? 'Locked' : 'Open'}
            </StatusBadge>
          )}
        </div>
      </div>

      {lockStatus ? (
        <div className="mt-4 space-y-3">
          {!lockStatus.firewallAvailable && (
            <p className="rounded-[1rem] border border-yellow-600/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/8 dark:text-yellow-300/80">
              iptables unavailable — network-level locking requires root and iptables on the server.
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs text-foreground/55">
            <div className="rounded-[1rem] border border-border bg-background p-2">
              <p className="uppercase tracking-wider text-[0.6rem] text-foreground/40">Wake Port</p>
              <p className="mt-1 font-mono">{lockStatus.wakePort}</p>
            </div>
            <div className="rounded-[1rem] border border-border bg-background p-2">
              <p className="uppercase tracking-wider text-[0.6rem] text-foreground/40">Auto-lock</p>
              <p className="mt-1 font-mono">
                {lockStatus.autoLockMinutes > 0 ? `${lockStatus.autoLockMinutes}m` : 'off'}
              </p>
            </div>
            <div className="rounded-[1rem] border border-border bg-background p-2">
              <p className="uppercase tracking-wider text-[0.6rem] text-foreground/40">Clients</p>
              <p className="mt-1 font-mono">{lockStatus.activeClients}</p>
            </div>
          </div>

          <p className="text-xs text-foreground/40">
            Manage locking from the PocketDev mobile app — open Settings → Security → Lock Server Port.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-foreground/40">Loading security status…</p>
      )}
    </div>
  )
}
