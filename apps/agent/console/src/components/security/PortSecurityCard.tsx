import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { useLockStatus } from '#/context/LockStatusContext'
import { Shield, Lock, Unlock } from 'lucide-react'

export function PortSecurityCard() {
  const { lockStatus, lockLoading, toggleFirewall, lockPort, unlockPort } = useLockStatus()

  return (
    <div className="rounded-[1.1rem] border-2 border-border bg-card p-5 text-foreground shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black/75 bg-secondary text-[var(--bauhaus-yellow)] shadow-[4px_4px_0_0_rgba(0,0,0,0.28)]">
          <Shield className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-heading text-sm font-semibold uppercase tracking-[0.32em]">Port Security</span>
          {lockStatus && (
            <Badge
              variant="outline"
              className={lockStatus.locked
                ? 'border-red-500/40 text-red-400'
                : 'border-green-500/40 text-green-400'}
            >
              {lockStatus.locked ? 'Locked' : 'Open'}
            </Badge>
          )}
        </div>
      </div>

      {lockStatus ? (
        <div className="mt-4 space-y-3">
          {!lockStatus.firewallAvailable && (
            <p className="rounded-[1rem] border border-yellow-500/20 bg-yellow-500/8 px-3 py-2 text-xs text-yellow-300/80">
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

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={lockLoading}
              onClick={toggleFirewall}
              className={cn(
                'rounded-[0.9rem] border text-xs',
                lockStatus.firewallEnabled
                  ? 'border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10'
                  : 'border-border text-foreground/60 hover:bg-secondary',
              )}
            >
              {lockStatus.firewallEnabled ? 'Disable Network Lock' : 'Enable Network Lock'}
            </Button>
            {lockStatus.firewallEnabled && (
              lockStatus.locked ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={lockLoading}
                  onClick={unlockPort}
                  className="rounded-[0.9rem] border border-green-500/30 text-xs text-green-400 hover:bg-green-500/10"
                >
                  <Unlock className="mr-1.5 h-3 w-3" />
                  Unlock Port
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={lockLoading}
                  onClick={lockPort}
                  className="rounded-[0.9rem] border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Lock className="mr-1.5 h-3 w-3" />
                  Lock Port Now
                </Button>
              )
            )}
          </div>

          {!lockStatus.firewallEnabled && (
            <p className="text-xs text-foreground/35">
              Enable to allow iptables-level port blocking. The mobile app can lock/unlock the port remotely via the wake server on port {lockStatus.wakePort}.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-foreground/40">Loading security status…</p>
      )}
    </div>
  )
}
