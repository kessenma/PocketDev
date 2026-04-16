import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { startRegistration } from '@simplewebauthn/browser'
import {
  listPasskeys,
  getPasskeyRegisterOptions,
  verifyPasskeyRegistration,
  deletePasskeyFn,
} from '#/lib/adminAuth'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'

export const Route = createFileRoute('/admin/settings')({
  loader: () => listPasskeys(),
  component: SettingsPage,
})

type Passkey = Awaited<ReturnType<typeof listPasskeys>>[number]

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function SettingsPage() {
  const initialPasskeys = Route.useLoaderData()
  const [passkeys, setPasskeys] = useState(initialPasskeys)
  const [adding, setAdding] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAddPasskey(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAdding(true)
    try {
      const options = await getPasskeyRegisterOptions()
      const response = await startRegistration({ optionsJSON: options })
      const result = await verifyPasskeyRegistration({
        data: { deviceName: deviceName.trim() || 'My passkey', response },
      })
      if (result.success) {
        setDeviceName('')
        setPasskeys(await listPasskeys())
      } else {
        setError(result.error ?? 'Registration failed')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Passkey prompt was dismissed')
      } else {
        setError('Registration failed')
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deletePasskeyFn({ data: { id } })
      setPasskeys((prev) => prev.filter((p) => p.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Passkeys ({passkeys.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passkeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {passkeys.map((pk) => (
                <PasskeyRow
                  key={pk.id}
                  passkey={pk}
                  deleting={deletingId === pk.id}
                  onDelete={() => handleDelete(pk.id)}
                />
              ))}
            </ul>
          )}

          <form onSubmit={handleAddPasskey} className="flex gap-2 pt-2">
            <Input
              placeholder="Device name (e.g. MacBook Pro)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={adding}
              className="flex-1"
            />
            <Button type="submit" disabled={adding} variant="outline">
              {adding ? 'Adding…' : 'Add passkey'}
            </Button>
          </form>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function PasskeyRow({
  passkey,
  deleting,
  onDelete,
}: {
  passkey: Passkey
  deleting: boolean
  onDelete: () => void
}) {
  return (
    <li className="flex items-center justify-between py-3 gap-3">
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-medium truncate">{passkey.deviceName}</p>
        <p className="text-xs text-muted-foreground">
          Added {formatTime(passkey.createdAt)}
          {passkey.lastUsedAt && (
            <> · Last used {formatTime(passkey.lastUsedAt)}</>
          )}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        disabled={deleting}
        onClick={onDelete}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        {deleting ? 'Removing…' : 'Remove'}
      </Button>
    </li>
  )
}
