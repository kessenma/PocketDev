import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Smartphone, Tablet, Monitor, Clock, Trash2, Pencil, Check, X } from 'lucide-react'
import { removeDevice, renameDevice } from '#/lib/api'

interface Device {
  id: string
  name: string | null
  platform: string | null
  lastSeenAt: string | null
}

interface Props {
  devices: Device[]
  onDeviceRemoved?: (id: string) => void
  onDeviceRenamed?: (id: string, name: string) => void
}

export function DeviceList({ devices, onDeviceRemoved, onDeviceRenamed }: Props) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

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

  function startEditing(device: Device) {
    setEditingId(device.id)
    setEditName(device.name || '')
  }

  async function handleRename(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) {
      setEditingId(null)
      return
    }
    try {
      await renameDevice(id, trimmed)
      onDeviceRenamed?.(id, trimmed)
    } catch {
      // ignore
    }
    setEditingId(null)
  }

  return (
    <Card className="h-full rounded-[2rem]">
      <CardHeader>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-foreground/45">Device Roster</p>
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
              <div key={device.id} className="flex items-center justify-between rounded-[1.4rem] border border-border bg-muted/50 p-3">
                <div className="space-y-1 min-w-0 flex-1 mr-3">
                  {editingId === device.id ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleRename(device.id)
                      }}
                    >
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {device.platform === 'android'
                        ? <Tablet className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                        : device.platform === 'ios'
                          ? <Smartphone className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                          : <Monitor className="h-3.5 w-3.5 shrink-0 text-foreground/50" />}
                      <p className="text-sm font-medium truncate">{device.name || 'Unknown device'}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => startEditing(device)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-foreground/55">
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
