import { useConsoleData } from '#/context/ConsoleDataContext'
import { ConnectionWizard } from '#/components/ConnectionWizard'
import { DeviceList } from '#/components/DeviceList'

export function PairingPanel() {
  const { status, updatePasscode, removeDevice, renameDevice } = useConsoleData()

  if (!status) return null

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ConnectionWizard
        passcode={status.passcode}
        serverIp={status.serverIp}
        port={status.port}
        secure={status.secure}
        onPasscodeChanged={updatePasscode}
      />
      <DeviceList
        devices={status.devices}
        onDeviceRemoved={removeDevice}
        onDeviceRenamed={renameDevice}
      />
    </div>
  )
}
