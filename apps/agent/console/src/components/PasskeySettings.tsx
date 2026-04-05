import { useState, useEffect, useCallback } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  listPasskeys,
  removePasskey,
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  type PasskeyCredential,
} from '#/lib/api'
import { Fingerprint, Plus, Trash2 } from 'lucide-react'

export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const creds = await listPasskeys()
      setPasskeys(creds)
    } catch {
      // Not critical if this fails
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRegister() {
    setError('')
    setRegistering(true)

    try {
      const { options, challengeId } = await getPasskeyRegistrationOptions()
      const credential = await startRegistration({ optionsJSON: options })
      await verifyPasskeyRegistration(challengeId, credential, deviceName || undefined)
      setShowNameInput(false)
      setDeviceName('')
      await load()
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Passkey registration was cancelled')
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed')
      }
    } finally {
      setRegistering(false)
    }
  }

  async function handleRemove(id: string) {
    try {
      await removePasskey(id)
      setPasskeys((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove passkey')
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card className="border-2 border-[var(--border)] bg-[#1a1713] text-[#f5eedf] shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-heading text-sm uppercase tracking-[0.2em]">
          <Fingerprint className="h-4 w-4" />
          Passkeys
        </CardTitle>
        {!showNameInput && (
          <Button
            variant="outline"
            size="sm"
            className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]"
            onClick={() => setShowNameInput(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {showNameInput && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Device name (optional)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleRegister}
              disabled={registering}
            >
              {registering ? 'Registering...' : 'Register'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]"
              onClick={() => { setShowNameInput(false); setDeviceName('') }}
            >
              Cancel
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys registered. Add one for passwordless login.</p>
        ) : (
          <div className="space-y-2">
            {passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[#2a241d] px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{pk.deviceName || 'Unnamed passkey'}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {formatDate(pk.createdAt)}
                    {pk.lastUsedAt && ` \u00B7 Last used ${formatDate(pk.lastUsedAt)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemove(pk.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
