import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Smartphone, Clock, Trash2 } from 'lucide-react'
import { removeDevice } from '#/lib/api'

interface Device {
  id: string
  name: string | null
  platform: string | null
  lastSeenAt: string | null
}

interface Props {
  devices: Device[]
  onDeviceRemoved?: (id: string) => void
}

export function DeviceList({ devices, onDeviceRemoved }: Props) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(id: string) {
    setRemovingId(id)
    try {
      await removeDevice(id)
      onDeviceRemoved?.(id)
    } catch {
      // ignore
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Paired Devices
        </CardTitle>
        <CardDescription>
          {devices.length === 0
            ? 'No devices paired yet.'
            : `${devices.length} device${devices.length > 1 ? 's' : ''} paired`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Pair a device using the QR code or passcode above.
          </p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{device.name || 'Unknown device'}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {device.lastSeenAt
                      ? `Last seen ${new Date(device.lastSeenAt).toLocaleString()}`
                      : 'Never connected'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {device.platform && (
                    <Badge variant="secondary">{device.platform}</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(device.id)}
                    disabled={removingId === device.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
