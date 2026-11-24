import { useConsoleData } from '#/context/ConsoleDataContext'
import { DomainPasskeyPanel } from '#/components/security/DomainPasskeyPanel'
import { PortSecurityCard } from '#/components/security/PortSecurityCard'
import { PairingPanel } from '#/components/security/PairingPanel'
import { RemoteAccessCard } from '#/components/security/RemoteAccessCard'
import { UserManagementPanel } from '#/components/UserManagementPanel'
import { PasskeySettings } from '#/components/PasskeySettings'

export function SecuritySection() {
  const { status } = useConsoleData()

  // On home/private networks (always on macOS) the phone needs a route to
  // this machine before pairing makes sense, so lead with Remote Access.
  // Caddy domains + iptables port locking are Linux/systemd-only.
  const showRemoteAccess = Boolean(status?.network?.likelyPrivateNetwork || status?.tailscale?.installed)
  const linuxService = !status?.serviceManager || status.serviceManager === 'systemd'

  return (
    <div className="space-y-6">
      {showRemoteAccess && <RemoteAccessCard />}
      {linuxService ? <DomainPasskeyPanel /> : <PasskeySettings disabled={!status?.tailscale?.serveActive} />}
      {linuxService && <PortSecurityCard />}
      <PairingPanel />
      {status?.permissions.canManageUsers && (
        <UserManagementPanel
          currentUser={status.currentUser}
          permissions={status.permissions}
          signupEnabled={status.signupEnabled}
        />
      )}
    </div>
  )
}
