import { useConsoleData } from '#/context/ConsoleDataContext'
import { DomainPasskeyPanel } from '#/components/security/DomainPasskeyPanel'
import { PortSecurityCard } from '#/components/security/PortSecurityCard'
import { PairingPanel } from '#/components/security/PairingPanel'
import { UserManagementPanel } from '#/components/UserManagementPanel'

export function SecuritySection() {
  const { status } = useConsoleData()

  return (
    <div className="space-y-6">
      <DomainPasskeyPanel />
      <PortSecurityCard />
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
